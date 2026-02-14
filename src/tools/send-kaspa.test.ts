// ABOUTME: Unit tests for send-kaspa MCP tool
// ABOUTME: Tests amount conversion, address validation, and transaction sending

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('kaspa-wasm', () => {
  class MockAddress {
    prefix: string;
    constructor(addr: string) {
      if (addr === 'invalid-address') {
        throw new Error('Invalid address format');
      }
      this.prefix = addr.startsWith('kaspatest:') ? 'kaspatest' : 'kaspa';
    }
  }

  return {
    Address: MockAddress,
    NetworkType: {
      Mainnet: 0,
      Testnet: 1,
    },
  };
});

vi.mock('../kaspa/wallet.js', () => ({
  getWallet: vi.fn(),
}));

vi.mock('../kaspa/transaction.js', () => ({
  sendKaspa: vi.fn(),
}));

import { sendKaspa } from './send-kaspa.js';
import { getWallet } from '../kaspa/wallet.js';
import { sendKaspa as sendKaspaTransaction } from '../kaspa/transaction.js';

describe('sendKaspa', () => {
  const mockWallet = {
    getNetworkType: vi.fn(),
    getNetworkId: vi.fn(),
  };

  beforeEach(() => {
    vi.mocked(getWallet).mockReturnValue(mockWallet as never);
    mockWallet.getNetworkType.mockReset();
    mockWallet.getNetworkId.mockReset();
    vi.mocked(sendKaspaTransaction).mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('parameter validation', () => {
    it('throws error when recipient address is not provided', async () => {
      await expect(sendKaspa({ to: '', amount: '1' })).rejects.toThrow(
        'Recipient address (to) is required'
      );
    });

    it('throws error when amount is not provided', async () => {
      await expect(sendKaspa({ to: 'kaspa:qptest', amount: '' })).rejects.toThrow(
        'Amount is required'
      );
    });
  });

  describe('address validation', () => {
    it('throws error for invalid address format', async () => {
      mockWallet.getNetworkType.mockReturnValue(0);
      mockWallet.getNetworkId.mockReturnValue('mainnet');

      await expect(sendKaspa({ to: 'invalid-address', amount: '1' })).rejects.toThrow(
        'Invalid Kaspa address: invalid-address'
      );
    });

    it('throws error for network mismatch (mainnet wallet, testnet address)', async () => {
      mockWallet.getNetworkType.mockReturnValue(0); // Mainnet
      mockWallet.getNetworkId.mockReturnValue('mainnet');

      await expect(sendKaspa({ to: 'kaspatest:qptest123', amount: '1' })).rejects.toThrow(
        'Address network mismatch: wallet is on mainnet, but address is for testnet'
      );
    });

    it('throws error for network mismatch (testnet wallet, mainnet address)', async () => {
      mockWallet.getNetworkType.mockReturnValue(1); // Testnet
      mockWallet.getNetworkId.mockReturnValue('testnet-10');

      await expect(sendKaspa({ to: 'kaspa:qpmainnet456', amount: '1' })).rejects.toThrow(
        'Address network mismatch: wallet is on testnet-10, but address is for mainnet'
      );
    });
  });

  describe('kasToSompi conversion', () => {
    beforeEach(() => {
      mockWallet.getNetworkType.mockReturnValue(0);
      mockWallet.getNetworkId.mockReturnValue('mainnet');
    });

    it('converts integer KAS to sompi', async () => {
      vi.mocked(sendKaspaTransaction).mockResolvedValue({ txId: 'tx1', fee: '100' });

      await sendKaspa({ to: 'kaspa:qptest', amount: '10' });

      expect(sendKaspaTransaction).toHaveBeenCalledWith(
        'kaspa:qptest',
        1000000000n,
        0n,
        undefined
      );
    });

    it('converts decimal KAS to sompi', async () => {
      vi.mocked(sendKaspaTransaction).mockResolvedValue({ txId: 'tx2', fee: '100' });

      await sendKaspa({ to: 'kaspa:qptest', amount: '1.5' });

      expect(sendKaspaTransaction).toHaveBeenCalledWith(
        'kaspa:qptest',
        150000000n,
        0n,
        undefined
      );
    });

    it('converts small decimal amounts', async () => {
      vi.mocked(sendKaspaTransaction).mockResolvedValue({ txId: 'tx3', fee: '100' });

      await sendKaspa({ to: 'kaspa:qptest', amount: '0.00000001' });

      expect(sendKaspaTransaction).toHaveBeenCalledWith(
        'kaspa:qptest',
        1n,
        0n,
        undefined
      );
    });

    it('handles max decimal places (8)', async () => {
      vi.mocked(sendKaspaTransaction).mockResolvedValue({ txId: 'tx4', fee: '100' });

      await sendKaspa({ to: 'kaspa:qptest', amount: '1.12345678' });

      expect(sendKaspaTransaction).toHaveBeenCalledWith(
        'kaspa:qptest',
        112345678n,
        0n,
        undefined
      );
    });

    it('throws error for more than 8 decimal places', async () => {
      await expect(sendKaspa({ to: 'kaspa:qptest', amount: '1.123456789' })).rejects.toThrow(
        'Amount cannot have more than 8 decimal places'
      );
    });

    it('throws error for invalid amount format', async () => {
      await expect(sendKaspa({ to: 'kaspa:qptest', amount: 'abc' })).rejects.toThrow(
        'Amount must be a valid decimal number'
      );
    });

    it('throws error for negative amount', async () => {
      await expect(sendKaspa({ to: 'kaspa:qptest', amount: '-1' })).rejects.toThrow(
        'Amount must be a valid decimal number'
      );
    });

    it('throws error for zero amount', async () => {
      await expect(sendKaspa({ to: 'kaspa:qptest', amount: '0' })).rejects.toThrow(
        'Amount must be greater than zero'
      );
    });

    it('throws error for zero decimal amount', async () => {
      await expect(sendKaspa({ to: 'kaspa:qptest', amount: '0.00000000' })).rejects.toThrow(
        'Amount must be greater than zero'
      );
    });

    it('handles whitespace in amount', async () => {
      vi.mocked(sendKaspaTransaction).mockResolvedValue({ txId: 'tx5', fee: '100' });

      await sendKaspa({ to: 'kaspa:qptest', amount: '  5  ' });

      expect(sendKaspaTransaction).toHaveBeenCalledWith(
        'kaspa:qptest',
        500000000n,
        0n,
        undefined
      );
    });
  });

  describe('transaction sending', () => {
    beforeEach(() => {
      mockWallet.getNetworkType.mockReturnValue(0);
      mockWallet.getNetworkId.mockReturnValue('mainnet');
    });

    it('sends transaction and returns result', async () => {
      vi.mocked(sendKaspaTransaction).mockResolvedValue({ txId: 'txabc123', fee: '250' });

      const result = await sendKaspa({ to: 'kaspa:qptest', amount: '5' });

      expect(result).toEqual({ txId: 'txabc123', fee: '250' });
    });

    it('passes priority fee when provided', async () => {
      vi.mocked(sendKaspaTransaction).mockResolvedValue({ txId: 'txfee', fee: '500' });

      await sendKaspa({ to: 'kaspa:qptest', amount: '5', priorityFee: 1000 });

      expect(sendKaspaTransaction).toHaveBeenCalledWith(
        'kaspa:qptest',
        500000000n,
        1000n,
        undefined
      );
    });

    it('uses zero priority fee when not provided', async () => {
      vi.mocked(sendKaspaTransaction).mockResolvedValue({ txId: 'txnofee', fee: '100' });

      await sendKaspa({ to: 'kaspa:qptest', amount: '1' });

      expect(sendKaspaTransaction).toHaveBeenCalledWith(
        'kaspa:qptest',
        100000000n,
        0n,
        undefined
      );
    });

    it('propagates transaction errors', async () => {
      vi.mocked(sendKaspaTransaction).mockRejectedValue(new Error('Insufficient balance'));

      await expect(sendKaspa({ to: 'kaspa:qptest', amount: '1000000' })).rejects.toThrow(
        'Insufficient balance'
      );
    });

    it('passes payload when provided', async () => {
      vi.mocked(sendKaspaTransaction).mockResolvedValue({ txId: 'txpayload', fee: '100' });

      await sendKaspa({ to: 'kaspa:qptest', amount: '1', payload: 'deadbeef' });

      expect(sendKaspaTransaction).toHaveBeenCalledWith(
        'kaspa:qptest',
        100000000n,
        0n,
        'deadbeef'
      );
    });

    it('does not pass payload when not provided', async () => {
      vi.mocked(sendKaspaTransaction).mockResolvedValue({ txId: 'txnopayload', fee: '100' });

      await sendKaspa({ to: 'kaspa:qptest', amount: '1' });

      expect(sendKaspaTransaction).toHaveBeenCalledWith(
        'kaspa:qptest',
        100000000n,
        0n,
        undefined
      );
    });
  });

  describe('testnet transactions', () => {
    it('sends to testnet address when wallet is on testnet', async () => {
      mockWallet.getNetworkType.mockReturnValue(1); // Testnet
      mockWallet.getNetworkId.mockReturnValue('testnet-10');
      vi.mocked(sendKaspaTransaction).mockResolvedValue({ txId: 'testnettx', fee: '100' });

      const result = await sendKaspa({ to: 'kaspatest:qptest', amount: '1' });

      expect(result).toEqual({ txId: 'testnettx', fee: '100' });
    });
  });
});
