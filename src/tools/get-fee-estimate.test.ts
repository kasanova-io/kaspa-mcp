// ABOUTME: Unit tests for get-fee-estimate MCP tool
// ABOUTME: Tests fee estimate retrieval and formatting

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../kaspa/wallet.js', () => ({
  getWallet: vi.fn(),
}));

vi.mock('../kaspa/api.js', () => ({
  getApi: vi.fn(),
}));

import { getFeeEstimate } from './get-fee-estimate.js';
import { getWallet } from '../kaspa/wallet.js';
import { getApi } from '../kaspa/api.js';

describe('getFeeEstimate', () => {
  const mockWallet = {
    getNetworkId: vi.fn(),
  };

  const mockApi = {
    getFeeEstimate: vi.fn(),
  };

  beforeEach(() => {
    vi.mocked(getWallet).mockReturnValue(mockWallet as never);
    vi.mocked(getApi).mockReturnValue(mockApi as never);
    mockWallet.getNetworkId.mockReset();
    mockApi.getFeeEstimate.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns fee estimates from API', async () => {
    mockWallet.getNetworkId.mockReturnValue('mainnet');
    mockApi.getFeeEstimate.mockResolvedValue({
      priorityBucket: { feerate: 1.5 },
      normalBuckets: [{ feerate: 1.0 }],
      lowBuckets: [{ feerate: 0.5 }],
    });

    const result = await getFeeEstimate();

    expect(result).toEqual({
      priorityFee: '1.5',
      normalFee: '1',
      lowFee: '0.5',
    });
    expect(getApi).toHaveBeenCalledWith('mainnet');
  });

  it('returns 0 for normal fee when normalBuckets is empty', async () => {
    mockWallet.getNetworkId.mockReturnValue('testnet-10');
    mockApi.getFeeEstimate.mockResolvedValue({
      priorityBucket: { feerate: 2.0 },
      normalBuckets: [],
      lowBuckets: [{ feerate: 0.5 }],
    });

    const result = await getFeeEstimate();

    expect(result.normalFee).toBe('0');
  });

  it('returns 0 for low fee when lowBuckets is empty', async () => {
    mockWallet.getNetworkId.mockReturnValue('testnet-11');
    mockApi.getFeeEstimate.mockResolvedValue({
      priorityBucket: { feerate: 2.0 },
      normalBuckets: [{ feerate: 1.0 }],
      lowBuckets: [],
    });

    const result = await getFeeEstimate();

    expect(result.lowFee).toBe('0');
  });

  it('uses correct network from wallet', async () => {
    mockWallet.getNetworkId.mockReturnValue('testnet-10');
    mockApi.getFeeEstimate.mockResolvedValue({
      priorityBucket: { feerate: 1.0 },
      normalBuckets: [{ feerate: 0.5 }],
      lowBuckets: [{ feerate: 0.25 }],
    });

    await getFeeEstimate();

    expect(getApi).toHaveBeenCalledWith('testnet-10');
  });
});
