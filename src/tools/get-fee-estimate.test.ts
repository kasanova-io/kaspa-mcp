// ABOUTME: Tests for get-fee-estimate MCP tool against real testnet API
// ABOUTME: Validates fee estimate retrieval with spyOn for empty-bucket edge cases

import { describe, it, expect, vi, afterEach } from 'vitest';
import { getFeeEstimate } from './get-fee-estimate.js';
import { getApi } from '../kaspa/api.js';
import { TESTNET_NETWORK } from '../test-helpers.js';

describe('getFeeEstimate', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns fee estimates from real API', async () => {
    const result = await getFeeEstimate();

    expect(Number(result.priorityFee)).toBeGreaterThan(0);
    expect(result.normalFee).toBeDefined();
    expect(result.lowFee).toBeDefined();
  });

  it('returns unavailable for normal fee when normalBuckets is empty', async () => {
    const api = getApi(TESTNET_NETWORK);
    vi.spyOn(api, 'getFeeEstimate').mockResolvedValue({
      priorityBucket: { feerate: 2.0, estimatedSeconds: 1 },
      normalBuckets: [],
      lowBuckets: [{ feerate: 0.5, estimatedSeconds: 60 }],
    });

    const result = await getFeeEstimate();

    expect(result.normalFee).toBe('unavailable');
  });

  it('returns unavailable for low fee when lowBuckets is empty', async () => {
    const api = getApi(TESTNET_NETWORK);
    vi.spyOn(api, 'getFeeEstimate').mockResolvedValue({
      priorityBucket: { feerate: 2.0, estimatedSeconds: 1 },
      normalBuckets: [{ feerate: 1.0, estimatedSeconds: 30 }],
      lowBuckets: [],
    });

    const result = await getFeeEstimate();

    expect(result.lowFee).toBe('unavailable');
  });
});
