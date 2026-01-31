// ABOUTME: Unit tests for get-my-address MCP tool
// ABOUTME: Tests wallet address retrieval functionality

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../kaspa/wallet.js', () => ({
  getWallet: vi.fn(),
}));

import { getMyAddress } from './get-my-address.js';
import { getWallet } from '../kaspa/wallet.js';

describe('getMyAddress', () => {
  const mockWallet = {
    getAddress: vi.fn(),
  };

  beforeEach(() => {
    vi.mocked(getWallet).mockReturnValue(mockWallet as never);
    mockWallet.getAddress.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns the wallet address', async () => {
    mockWallet.getAddress.mockReturnValue('kaspa:qptest123');

    const result = await getMyAddress();

    expect(result).toEqual({ address: 'kaspa:qptest123' });
    expect(getWallet).toHaveBeenCalled();
    expect(mockWallet.getAddress).toHaveBeenCalled();
  });

  it('returns testnet address when wallet is on testnet', async () => {
    mockWallet.getAddress.mockReturnValue('kaspatest:qptest456');

    const result = await getMyAddress();

    expect(result).toEqual({ address: 'kaspatest:qptest456' });
  });
});
