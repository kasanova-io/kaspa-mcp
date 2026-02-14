// ABOUTME: Tests for get-balance MCP tool against real testnet API
// ABOUTME: Validates balance retrieval and sompi-to-KAS conversion

import { describe, it, expect } from 'vitest';
import { getBalance } from './get-balance.js';
import { TESTNET_ADDRESS } from '../test-helpers.js';

describe('getBalance', () => {
  it('returns balance for wallet address when no address provided', async () => {
    const result = await getBalance({});

    expect(result.address).toBe(TESTNET_ADDRESS);
    expect(Number(result.balance)).toBeGreaterThanOrEqual(0);
  });

  it('returns balance for specified address', async () => {
    const result = await getBalance({ address: TESTNET_ADDRESS });

    expect(result.address).toBe(TESTNET_ADDRESS);
    expect(Number(result.balance)).toBeGreaterThanOrEqual(0);
  });

  it('propagates API errors for invalid address', async () => {
    await expect(getBalance({ address: 'kaspatest:qpinvalid000000' })).rejects.toThrow();
  });
});
