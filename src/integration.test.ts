// ABOUTME: Integration tests for Kaspa MCP tools
// ABOUTME: Tests tool flows with real kaspa-wasm but mocked network calls

import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';

// Valid test mnemonic (24 words)
const TEST_MNEMONIC = 'matter client cigar north mixed hard rail kitten flat shrug view group diagram release goose thumb benefit fire confirm swamp skill merry genre visa';

describe('Integration Tests', () => {
  const mockFetch = vi.fn();
  const originalFetch = globalThis.fetch;
  const originalEnv = process.env;

  beforeAll(() => {
    process.env = {
      ...originalEnv,
      KASPA_MNEMONIC: TEST_MNEMONIC,
      KASPA_NETWORK: 'mainnet',
    };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  beforeEach(() => {
    globalThis.fetch = mockFetch;
    mockFetch.mockReset();
    vi.resetModules();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe('get-my-address tool', () => {
    it('returns wallet address derived from mnemonic', async () => {
      const { getMyAddress } = await import('./tools/get-my-address.js');

      const result = await getMyAddress();

      expect(result.address).toMatch(/^kaspa:/);
      expect(result.address).toHaveLength(67);
    });
  });

  describe('get-balance tool', () => {
    it('returns balance for wallet address', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ address: 'kaspa:test', balance: '5000000000' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([
            { address: 'kaspa:test', outpoint: { transactionId: 'tx1', index: 0 }, utxoEntry: { amount: '5000000000' } },
          ]),
        });

      const { getBalance } = await import('./tools/get-balance.js');
      const result = await getBalance({});

      expect(result.address).toMatch(/^kaspa:/);
      expect(result.balance).toBe('50');
      expect(result.utxoCount).toBe(1);
    });

    it('returns balance for specified address', async () => {
      const testAddress = 'kaspa:qptest123456789abcdef';

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ address: testAddress, balance: '1000000000' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([]),
        });

      const { getBalance } = await import('./tools/get-balance.js');
      const result = await getBalance({ address: testAddress });

      expect(result.address).toBe(testAddress);
      expect(result.balance).toBe('10');
      expect(result.utxoCount).toBe(0);
    });
  });

  describe('get-fee-estimate tool', () => {
    it('returns formatted fee estimates', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            priorityBucket: { feerate: 1.5, estimatedSeconds: 10 },
            normalBuckets: [{ feerate: 1.0, estimatedSeconds: 30 }],
            lowBuckets: [{ feerate: 0.5, estimatedSeconds: 60 }],
          }),
      });

      const { getFeeEstimate } = await import('./tools/get-fee-estimate.js');
      const result = await getFeeEstimate();

      expect(result.priorityFee).toBe('1.5');
      expect(result.normalFee).toBe('1');
      expect(result.lowFee).toBe('0.5');
    });
  });

  describe('get-transaction tool', () => {
    it('returns transaction details', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            transaction_id: 'abc123def456',
            is_accepted: true,
            block_hash: ['blockhash1'],
            block_time: 1234567890,
            inputs: [],
            outputs: [],
          }),
      });

      const { getTransaction } = await import('./tools/get-transaction.js');
      const result = await getTransaction({ txId: 'abc123def456' });

      expect(result.txId).toBe('abc123def456');
      expect(result.accepted).toBe(true);
      expect(result.blockHash).toBe('blockhash1');
    });

    it('throws for missing transaction', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: () => Promise.resolve('Not found'),
      });

      const { getTransaction } = await import('./tools/get-transaction.js');

      await expect(getTransaction({ txId: 'notfound' })).rejects.toThrow('Transaction not found: notfound');
    });
  });

  describe('send-kaspa tool validation', () => {
    it('validates recipient address format', async () => {
      const { sendKaspa } = await import('./tools/send-kaspa.js');

      await expect(sendKaspa({ to: 'invalid', amount: '1' })).rejects.toThrow('Invalid Kaspa address');
    });

    it('validates amount format', async () => {
      const { sendKaspa } = await import('./tools/send-kaspa.js');

      // Use a valid mainnet address format for this test
      const validMainnetAddress = 'kaspa:qpamkvhgh0kzx50gwvvp5xs8ktmqutcy3dfs9dc3w7lm9rq0zs76vf959mmrp';

      await expect(sendKaspa({ to: validMainnetAddress, amount: 'abc' })).rejects.toThrow(
        'Amount must be a valid decimal number'
      );
    });

    it('validates network mismatch', async () => {
      // Create a testnet wallet to get a valid testnet address
      const { KaspaWallet } = await import('./kaspa/wallet.js');
      const testnetWallet = KaspaWallet.fromMnemonic(TEST_MNEMONIC, 'testnet-10');
      const validTestnetAddress = testnetWallet.getAddress();

      const { sendKaspa } = await import('./tools/send-kaspa.js');

      // Wallet is on mainnet (from beforeAll), so sending to testnet address should fail
      await expect(sendKaspa({ to: validTestnetAddress, amount: '1' })).rejects.toThrow(
        'Address network mismatch'
      );
    });
  });

  describe('wallet consistency', () => {
    it('generates same address from same mnemonic', async () => {
      const { getMyAddress } = await import('./tools/get-my-address.js');

      const result1 = await getMyAddress();
      const result2 = await getMyAddress();

      expect(result1.address).toBe(result2.address);
    });
  });

  describe('API error handling', () => {
    it('handles API errors gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: () => Promise.resolve('Internal server error'),
      });

      const { getFeeEstimate } = await import('./tools/get-fee-estimate.js');

      await expect(getFeeEstimate()).rejects.toThrow('API error 500');
    });
  });
});
