// ABOUTME: Integration tests for Kaspa MCP tools against real testnet
// ABOUTME: Tests tool flows with real kaspa-wasm and real network calls

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TESTNET_ADDRESS, TESTNET_TX_ID } from './test-helpers.js';

describe('Integration Tests', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  describe('get-my-address tool', () => {
    it('returns wallet address derived from mnemonic', async () => {
      const { getMyAddress } = await import('./tools/get-my-address.js');

      const result = await getMyAddress();

      expect(result.address).toBe(TESTNET_ADDRESS);
    });
  });

  describe('get-balance tool', () => {
    it('returns balance for wallet address', async () => {
      const { getBalance } = await import('./tools/get-balance.js');

      const result = await getBalance({});

      expect(result.address).toBe(TESTNET_ADDRESS);
      expect(Number(result.balance)).toBeGreaterThanOrEqual(0);
    });

    it('returns balance for specified address', async () => {
      const { getBalance } = await import('./tools/get-balance.js');

      const result = await getBalance({ address: TESTNET_ADDRESS });

      expect(result.address).toBe(TESTNET_ADDRESS);
      expect(Number(result.balance)).toBeGreaterThanOrEqual(0);
    });
  });

  describe('get-fee-estimate tool', () => {
    it('returns formatted fee estimates', async () => {
      const { getFeeEstimate } = await import('./tools/get-fee-estimate.js');

      const result = await getFeeEstimate();

      expect(Number(result.priorityFee)).toBeGreaterThan(0);
      expect(result.normalFee).toBeDefined();
      expect(result.lowFee).toBeDefined();
    });
  });

  describe('get-transaction tool', () => {
    it('returns transaction details', async () => {
      const { getTransaction } = await import('./tools/get-transaction.js');

      const result = await getTransaction({ txId: TESTNET_TX_ID });

      expect(result.txId).toBe(TESTNET_TX_ID);
      expect(result.accepted).toBe(true);
      expect(result.blockHash).toBeDefined();
    });

    it('throws for missing transaction', async () => {
      const { getTransaction } = await import('./tools/get-transaction.js');
      const fakeTxId = '0000000000000000000000000000000000000000000000000000000000000000';

      await expect(getTransaction({ txId: fakeTxId })).rejects.toThrow(
        `Transaction not found: ${fakeTxId}`
      );
    });
  });

  describe('send-kaspa tool validation', () => {
    it('validates recipient address format', async () => {
      const { sendKaspa } = await import('./tools/send-kaspa.js');

      await expect(sendKaspa({ to: 'invalid', amount: '1' })).rejects.toThrow('Invalid Kaspa address');
    });

    it('validates amount format', async () => {
      const { sendKaspa } = await import('./tools/send-kaspa.js');

      await expect(sendKaspa({ to: TESTNET_ADDRESS, amount: 'abc' })).rejects.toThrow(
        'Amount must be a valid decimal number'
      );
    });

    it('validates network mismatch', async () => {
      const { KaspaWallet } = await import('./kaspa/wallet.js');
      const mainnetWallet = KaspaWallet.fromMnemonic(process.env.KASPA_MNEMONIC!, 'mainnet');
      const mainnetAddress = mainnetWallet.getAddress();

      const { sendKaspa } = await import('./tools/send-kaspa.js');

      // Wallet is on testnet-10 (from test-setup), so sending to mainnet address should fail
      await expect(sendKaspa({ to: mainnetAddress, amount: '1' })).rejects.toThrow(
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
      const { getApi } = await import('./kaspa/api.js');
      const { getFeeEstimate } = await import('./tools/get-fee-estimate.js');

      const api = getApi('testnet-10');
      vi.spyOn(api, 'getFeeEstimate').mockRejectedValue(new Error('API error 500: Internal server error'));

      await expect(getFeeEstimate()).rejects.toThrow('API error 500');
    });
  });
});
