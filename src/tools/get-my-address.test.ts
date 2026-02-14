// ABOUTME: Tests for get-my-address MCP tool against real testnet wallet
// ABOUTME: Validates address derivation from KASPA_MNEMONIC env var

import { describe, it, expect } from 'vitest';
import { getMyAddress } from './get-my-address.js';
import { TESTNET_ADDRESS } from '../test-helpers.js';

describe('getMyAddress', () => {
  it('returns the wallet address derived from mnemonic', async () => {
    const result = await getMyAddress();

    expect(result).toEqual({ address: TESTNET_ADDRESS });
  });

  it('returns a testnet-prefixed address', async () => {
    const result = await getMyAddress();

    expect(result.address).toMatch(/^kaspatest:/);
  });
});
