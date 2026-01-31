// ABOUTME: Unit tests for get-balance MCP tool
// ABOUTME: Tests balance retrieval with sompi conversion

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../kaspa/wallet.js', () => ({
  getWallet: vi.fn(),
}));

vi.mock('../kaspa/api.js', () => ({
  getApi: vi.fn(),
}));

vi.mock('kaspa-wasm', () => ({
  sompiToKaspaString: vi.fn((sompi: bigint) => {
    const kas = Number(sompi) / 100_000_000;
    return kas.toString();
  }),
}));

import { getBalance } from './get-balance.js';
import { getWallet } from '../kaspa/wallet.js';
import { getApi } from '../kaspa/api.js';

describe('getBalance', () => {
  const mockWallet = {
    getAddress: vi.fn(),
    getNetworkId: vi.fn(),
  };

  const mockApi = {
    getBalance: vi.fn(),
    getUtxos: vi.fn(),
  };

  beforeEach(() => {
    vi.mocked(getWallet).mockReturnValue(mockWallet as never);
    vi.mocked(getApi).mockReturnValue(mockApi as never);
    mockWallet.getAddress.mockReset();
    mockWallet.getNetworkId.mockReset();
    mockApi.getBalance.mockReset();
    mockApi.getUtxos.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns balance for wallet address when no address provided', async () => {
    mockWallet.getAddress.mockReturnValue('kaspa:qpwallet123');
    mockWallet.getNetworkId.mockReturnValue('mainnet');
    mockApi.getBalance.mockResolvedValue({ balance: '1000000000' });
    mockApi.getUtxos.mockResolvedValue([{ utxo: 1 }, { utxo: 2 }]);

    const result = await getBalance({});

    expect(result).toEqual({
      address: 'kaspa:qpwallet123',
      balance: '10',
      utxoCount: 2,
    });
    expect(getApi).toHaveBeenCalledWith('mainnet');
  });

  it('returns balance for specified address', async () => {
    mockWallet.getAddress.mockReturnValue('kaspa:qpwallet123');
    mockWallet.getNetworkId.mockReturnValue('testnet-10');
    mockApi.getBalance.mockResolvedValue({ balance: '500000000' });
    mockApi.getUtxos.mockResolvedValue([{ utxo: 1 }]);

    const result = await getBalance({ address: 'kaspatest:qpother456' });

    expect(result).toEqual({
      address: 'kaspatest:qpother456',
      balance: '5',
      utxoCount: 1,
    });
  });

  it('returns zero balance with no UTXOs', async () => {
    mockWallet.getAddress.mockReturnValue('kaspa:qpempty');
    mockWallet.getNetworkId.mockReturnValue('mainnet');
    mockApi.getBalance.mockResolvedValue({ balance: '0' });
    mockApi.getUtxos.mockResolvedValue([]);

    const result = await getBalance({});

    expect(result).toEqual({
      address: 'kaspa:qpempty',
      balance: '0',
      utxoCount: 0,
    });
  });

  it('handles large balance amounts', async () => {
    mockWallet.getAddress.mockReturnValue('kaspa:qprich');
    mockWallet.getNetworkId.mockReturnValue('mainnet');
    mockApi.getBalance.mockResolvedValue({ balance: '100000000000000' });
    mockApi.getUtxos.mockResolvedValue(new Array(100).fill({ utxo: 1 }));

    const result = await getBalance({});

    expect(result.utxoCount).toBe(100);
    expect(result.address).toBe('kaspa:qprich');
  });

  it('calls API with correct network', async () => {
    mockWallet.getAddress.mockReturnValue('kaspatest:qptest');
    mockWallet.getNetworkId.mockReturnValue('testnet-11');
    mockApi.getBalance.mockResolvedValue({ balance: '1000000' });
    mockApi.getUtxos.mockResolvedValue([]);

    await getBalance({});

    expect(getApi).toHaveBeenCalledWith('testnet-11');
  });
});
