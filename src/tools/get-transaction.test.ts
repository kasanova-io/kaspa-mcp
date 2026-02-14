// ABOUTME: Tests for get-transaction MCP tool against real testnet API
// ABOUTME: Validates transaction retrieval with spyOn for untriggerable edge cases

import { describe, it, expect, vi, afterEach } from 'vitest';
import { getTransaction } from './get-transaction.js';
import { getApi } from '../kaspa/api.js';
import { TESTNET_TX_ID, TESTNET_NETWORK } from '../test-helpers.js';

describe('getTransaction', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns transaction details for known testnet tx', async () => {
    const result = await getTransaction({ txId: TESTNET_TX_ID });

    expect(result.txId).toBe(TESTNET_TX_ID);
    expect(result.accepted).toBe(true);
    expect(result.blockHash).toBeDefined();
    expect(result.inputs.length).toBeGreaterThan(0);
    expect(result.outputs.length).toBeGreaterThan(0);

    for (const output of result.outputs) {
      expect(Number(output.amount)).toBeGreaterThan(0);
      expect(output.address).toMatch(/^kaspatest:/);
    }

    for (const input of result.inputs) {
      expect(typeof input.index).toBe('number');
    }
  });

  it('throws error when txId is not provided', async () => {
    await expect(getTransaction({ txId: '' })).rejects.toThrow(
      'Transaction ID (txId) is required'
    );
  });

  it('throws error when transaction is not found', async () => {
    const fakeTxId = '0000000000000000000000000000000000000000000000000000000000000000';

    await expect(getTransaction({ txId: fakeTxId })).rejects.toThrow(
      `Transaction not found: ${fakeTxId}`
    );
  });

  it('rethrows non-404 errors', async () => {
    const api = getApi(TESTNET_NETWORK);
    vi.spyOn(api, 'getTransaction').mockRejectedValue(new Error('Network error'));

    await expect(getTransaction({ txId: 'abc123' })).rejects.toThrow('Network error');
  });

  it('handles undefined block_hash', async () => {
    const api = getApi(TESTNET_NETWORK);
    vi.spyOn(api, 'getTransaction').mockResolvedValue({
      transaction_id: 'test123',
      is_accepted: true,
      block_hash: undefined as unknown as string[],
      block_time: 0,
      inputs: [],
      outputs: [],
    });

    const result = await getTransaction({ txId: 'test123' });

    expect(result.blockHash).toBeUndefined();
  });

  it('handles empty block_hash array', async () => {
    const api = getApi(TESTNET_NETWORK);
    vi.spyOn(api, 'getTransaction').mockResolvedValue({
      transaction_id: 'test456',
      is_accepted: true,
      block_hash: [],
      block_time: 0,
      inputs: [],
      outputs: [],
    });

    const result = await getTransaction({ txId: 'test456' });

    expect(result.blockHash).toBeUndefined();
  });
});
