// ABOUTME: Unit tests for get-transaction MCP tool
// ABOUTME: Tests transaction retrieval and error handling

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('kaspa-wasm', () => ({
  sompiToKaspaString: (sompi: bigint) => (Number(sompi) / 100_000_000).toString(),
}));

vi.mock('../kaspa/wallet.js', () => ({
  getWallet: vi.fn(),
}));

vi.mock('../kaspa/api.js', () => ({
  getApi: vi.fn(),
}));

import { getTransaction } from './get-transaction.js';
import { getWallet } from '../kaspa/wallet.js';
import { getApi } from '../kaspa/api.js';

describe('getTransaction', () => {
  const mockWallet = {
    getNetworkId: vi.fn(),
  };

  const mockApi = {
    getTransaction: vi.fn(),
  };

  beforeEach(() => {
    vi.mocked(getWallet).mockReturnValue(mockWallet as never);
    vi.mocked(getApi).mockReturnValue(mockApi as never);
    mockWallet.getNetworkId.mockReset();
    mockApi.getTransaction.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns transaction details for accepted tx', async () => {
    mockWallet.getNetworkId.mockReturnValue('mainnet');
    mockApi.getTransaction.mockResolvedValue({
      transaction_id: 'abc123',
      is_accepted: true,
      block_hash: ['blockhash1'],
      block_time: 1234567890,
      inputs: [
        { previous_outpoint_hash: 'input_tx_1', previous_outpoint_index: 0 },
      ],
      outputs: [
        { amount: '10000000000', script_public_key_address: 'kaspa:qprecipient' },
        { amount: '5000000000', script_public_key_address: 'kaspa:qpchange' },
      ],
    });

    const result = await getTransaction({ txId: 'abc123' });

    expect(result).toEqual({
      txId: 'abc123',
      accepted: true,
      blockHash: 'blockhash1',
      blockTime: 1234567890,
      inputs: [{ transactionId: 'input_tx_1', index: 0 }],
      outputs: [
        { index: 0, amount: '100', address: 'kaspa:qprecipient' },
        { index: 1, amount: '50', address: 'kaspa:qpchange' },
      ],
    });
    expect(getApi).toHaveBeenCalledWith('mainnet');
    expect(mockApi.getTransaction).toHaveBeenCalledWith('abc123');
  });

  it('returns transaction details for pending tx', async () => {
    mockWallet.getNetworkId.mockReturnValue('testnet-10');
    mockApi.getTransaction.mockResolvedValue({
      transaction_id: 'def456',
      is_accepted: false,
      block_hash: null,
      block_time: undefined,
      inputs: [],
      outputs: [],
    });

    const result = await getTransaction({ txId: 'def456' });

    expect(result).toEqual({
      txId: 'def456',
      accepted: false,
      blockHash: undefined,
      blockTime: undefined,
      inputs: [],
      outputs: [],
    });
  });

  it('throws error when txId is not provided', async () => {
    await expect(getTransaction({ txId: '' })).rejects.toThrow(
      'Transaction ID (txId) is required'
    );
  });

  it('throws error when transaction is not found (404)', async () => {
    mockWallet.getNetworkId.mockReturnValue('mainnet');
    mockApi.getTransaction.mockRejectedValue(new Error('API error 404: Not found'));

    await expect(getTransaction({ txId: 'notfound' })).rejects.toThrow(
      'Transaction not found: notfound'
    );
  });

  it('rethrows other errors', async () => {
    mockWallet.getNetworkId.mockReturnValue('mainnet');
    mockApi.getTransaction.mockRejectedValue(new Error('Network error'));

    await expect(getTransaction({ txId: 'abc123' })).rejects.toThrow('Network error');
  });

  it('handles block_hash being undefined', async () => {
    mockWallet.getNetworkId.mockReturnValue('mainnet');
    mockApi.getTransaction.mockResolvedValue({
      transaction_id: 'ghi789',
      is_accepted: true,
      block_hash: undefined,
      inputs: [],
      outputs: [],
    });

    const result = await getTransaction({ txId: 'ghi789' });

    expect(result.blockHash).toBeUndefined();
  });

  it('handles empty block_hash array', async () => {
    mockWallet.getNetworkId.mockReturnValue('mainnet');
    mockApi.getTransaction.mockResolvedValue({
      transaction_id: 'jkl012',
      is_accepted: true,
      block_hash: [],
      inputs: [],
      outputs: [],
    });

    const result = await getTransaction({ txId: 'jkl012' });

    expect(result.blockHash).toBeUndefined();
  });
});
