// ABOUTME: Unit tests for transaction module
// ABOUTME: Tests transaction building, signing, and submission

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockRpcClient = {
  connect: vi.fn(),
  disconnect: vi.fn(),
  getServerInfo: vi.fn(),
  getUtxosByAddresses: vi.fn(),
};

const mockPendingTransaction = {
  sign: vi.fn(),
  submit: vi.fn(),
};

const mockGenerator = {
  next: vi.fn(),
  summary: vi.fn(),
};

vi.mock('kaspa-wasm', () => {
  class MockAddress {
    address: string;
    constructor(addr: string) {
      this.address = addr;
    }
  }

  class MockResolver {}

  class MockRpcClient {
    constructor() {
      return mockRpcClient;
    }
  }

  class MockGenerator {
    constructor() {
      return mockGenerator;
    }
  }

  return {
    Address: MockAddress,
    Resolver: MockResolver,
    RpcClient: MockRpcClient,
    Generator: MockGenerator,
    Encoding: { Borsh: 'borsh' },
    sompiToKaspaString: (sompi: bigint) => {
      const kas = Number(sompi) / 100_000_000;
      return kas.toString();
    },
  };
});

vi.mock('./wallet.js', () => ({
  getWallet: vi.fn(),
}));

vi.mock('./api.js', () => ({
  getApi: vi.fn(),
}));

import { sendKaspa } from './transaction.js';
import { getWallet } from './wallet.js';
import { getApi } from './api.js';

describe('sendKaspa', () => {
  const mockWallet = {
    getAddress: vi.fn(),
    getNetworkId: vi.fn(),
    getPrivateKey: vi.fn(),
  };

  const mockApi = {
    getFeeEstimate: vi.fn(),
  };

  beforeEach(() => {
    vi.mocked(getWallet).mockReturnValue(mockWallet as never);
    vi.mocked(getApi).mockReturnValue(mockApi as never);

    mockWallet.getAddress.mockReturnValue('kaspa:qpwallet123');
    mockWallet.getNetworkId.mockReturnValue('testnet-10');
    mockWallet.getPrivateKey.mockReturnValue({ key: 'privatekey' });

    mockApi.getFeeEstimate.mockResolvedValue({
      priorityBucket: { feerate: 1.0 },
    });

    mockRpcClient.connect.mockResolvedValue(undefined);
    mockRpcClient.disconnect.mockResolvedValue(undefined);
    mockRpcClient.getServerInfo.mockResolvedValue({ isSynced: true });
    mockRpcClient.getUtxosByAddresses.mockResolvedValue({
      entries: [{ amount: 1000000000n }],
    });

    mockPendingTransaction.sign.mockResolvedValue(undefined);
    mockPendingTransaction.submit.mockResolvedValue('txid123');

    mockGenerator.next
      .mockResolvedValueOnce(mockPendingTransaction)
      .mockResolvedValueOnce(undefined);
    mockGenerator.summary.mockReturnValue({ fees: 1000n });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('sends transaction successfully', async () => {
    const result = await sendKaspa('kaspa:qprecipient', 100000000n, 0n);

    expect(result).toEqual({
      txId: 'txid123',
      fee: '0.00001',
    });

    expect(mockRpcClient.connect).toHaveBeenCalledWith({});
    expect(mockRpcClient.getServerInfo).toHaveBeenCalled();
    expect(mockRpcClient.disconnect).toHaveBeenCalled();
  });

  it('throws error when RPC is not synced', async () => {
    mockRpcClient.getServerInfo.mockResolvedValue({ isSynced: false });

    await expect(sendKaspa('kaspa:qprecipient', 100000000n)).rejects.toThrow(
      'RPC node is not synced'
    );

    expect(mockRpcClient.disconnect).toHaveBeenCalled();
  });

  it('throws error when no UTXOs available', async () => {
    mockRpcClient.getUtxosByAddresses.mockResolvedValue({ entries: [] });

    await expect(sendKaspa('kaspa:qprecipient', 100000000n)).rejects.toThrow(
      'No UTXOs available'
    );
  });

  it('throws error when entries is undefined', async () => {
    mockRpcClient.getUtxosByAddresses.mockResolvedValue({ entries: undefined });

    await expect(sendKaspa('kaspa:qprecipient', 100000000n)).rejects.toThrow(
      'No UTXOs available'
    );
  });

  it('throws error for insufficient balance', async () => {
    mockRpcClient.getUtxosByAddresses.mockResolvedValue({
      entries: [{ amount: 1000n }],
    });

    await expect(sendKaspa('kaspa:qprecipient', 100000000n)).rejects.toThrow(
      /Insufficient balance/
    );
  });

  it('uses priority fee when provided', async () => {
    mockRpcClient.getUtxosByAddresses.mockResolvedValue({
      entries: [{ amount: 2000000000n }],
    });

    await sendKaspa('kaspa:qprecipient', 100000000n, 1000n);

    expect(mockPendingTransaction.sign).toHaveBeenCalled();
  });

  it('disconnects RPC even on error', async () => {
    mockRpcClient.getServerInfo.mockRejectedValue(new Error('Connection failed'));

    await expect(sendKaspa('kaspa:qprecipient', 100000000n)).rejects.toThrow(
      'Connection failed'
    );

    expect(mockRpcClient.disconnect).toHaveBeenCalled();
  });

  it('handles multiple pending transactions', async () => {
    const mockPending1 = { sign: vi.fn(), submit: vi.fn().mockResolvedValue('tx1') };
    const mockPending2 = { sign: vi.fn(), submit: vi.fn().mockResolvedValue('tx2') };

    mockGenerator.next
      .mockReset()
      .mockResolvedValueOnce(mockPending1)
      .mockResolvedValueOnce(mockPending2)
      .mockResolvedValueOnce(undefined);

    mockRpcClient.getUtxosByAddresses.mockResolvedValue({
      entries: [{ amount: 5000000000n }],
    });

    const result = await sendKaspa('kaspa:qprecipient', 100000000n);

    expect(result.txId).toBe('tx2');
    expect(mockPending1.sign).toHaveBeenCalled();
    expect(mockPending2.sign).toHaveBeenCalled();
  });

  it('sorts UTXOs by amount (smallest first)', async () => {
    const entries = [
      { amount: 3000000000n },
      { amount: 1000000000n },
      { amount: 2000000000n },
    ];

    mockRpcClient.getUtxosByAddresses.mockResolvedValue({ entries });

    await sendKaspa('kaspa:qprecipient', 100000000n);

    expect(entries[0].amount).toBe(1000000000n);
    expect(entries[1].amount).toBe(2000000000n);
    expect(entries[2].amount).toBe(3000000000n);
  });

  it('uses correct API for network', async () => {
    mockWallet.getNetworkId.mockReturnValue('mainnet');

    await sendKaspa('kaspa:qprecipient', 100000000n);

    expect(getApi).toHaveBeenCalledWith('mainnet');
  });

  it('defaults priority fee to 0', async () => {
    const result = await sendKaspa('kaspa:qprecipient', 100000000n);

    expect(result).toBeDefined();
  });
});
