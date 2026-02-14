// ABOUTME: Unit tests for KaspaApi REST client
// ABOUTME: Tests API methods with mocked fetch responses

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { KaspaApi, getApi } from './api.js';

describe('KaspaApi', () => {
  const mockFetch = vi.fn();
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    globalThis.fetch = mockFetch;
    mockFetch.mockReset();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe('constructor', () => {
    it('uses mainnet endpoint by default', () => {
      const api = new KaspaApi();
      expect(api).toBeInstanceOf(KaspaApi);
    });

    it('uses testnet-10 endpoint when specified', () => {
      const api = new KaspaApi('testnet-10');
      expect(api).toBeInstanceOf(KaspaApi);
    });

    it('uses testnet-11 endpoint when specified', () => {
      const api = new KaspaApi('testnet-11');
      expect(api).toBeInstanceOf(KaspaApi);
    });

    it('throws error for unknown network', () => {
      expect(() => new KaspaApi('unknown-network')).toThrow('Unknown network "unknown-network"');
    });
  });

  describe('getBalance', () => {
    it('fetches balance for an address', async () => {
      const mockResponse = { address: 'kaspa:test', balance: '1000000000' };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const api = new KaspaApi();
      const result = await api.getBalance('kaspa:test');

      expect(result).toEqual(mockResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.kaspa.org/addresses/kaspa:test/balance',
        expect.objectContaining({
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });

    it('throws error on API failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: () => Promise.resolve('Not found'),
      });

      const api = new KaspaApi();
      await expect(api.getBalance('kaspa:invalid')).rejects.toThrow('API error 404: Not found');
    });
  });

  describe('getUtxos', () => {
    it('fetches UTXOs for an address', async () => {
      const mockResponse = [
        {
          address: 'kaspa:test',
          outpoint: { transactionId: 'abc123', index: 0 },
          utxoEntry: {
            amount: '1000000000',
            scriptPublicKey: { scriptPublicKey: '20abc' },
            blockDaaScore: '12345',
            isCoinbase: false,
          },
        },
      ];
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const api = new KaspaApi();
      const result = await api.getUtxos('kaspa:test');

      expect(result).toEqual(mockResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.kaspa.org/addresses/kaspa:test/utxos',
        expect.any(Object)
      );
    });

    it('throws error on API failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: () => Promise.resolve('Server error'),
      });

      const api = new KaspaApi();
      await expect(api.getUtxos('kaspa:test')).rejects.toThrow('API error 500');
    });
  });

  describe('getFeeEstimate', () => {
    it('fetches fee estimates', async () => {
      const mockResponse = {
        priorityBucket: { feerate: 1.5, estimatedSeconds: 10 },
        normalBuckets: [{ feerate: 1.0, estimatedSeconds: 30 }],
        lowBuckets: [{ feerate: 0.5, estimatedSeconds: 60 }],
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const api = new KaspaApi();
      const result = await api.getFeeEstimate();

      expect(result).toEqual(mockResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.kaspa.org/info/fee-estimate',
        expect.any(Object)
      );
    });

    it('throws error on API failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 503,
        text: () => Promise.resolve('Service unavailable'),
      });

      const api = new KaspaApi();
      await expect(api.getFeeEstimate()).rejects.toThrow('API error 503');
    });
  });

  describe('getTransaction', () => {
    it('fetches transaction details', async () => {
      const mockResponse = {
        transaction_id: 'abc123',
        block_hash: ['block1'],
        block_time: 1234567890,
        is_accepted: true,
        inputs: [],
        outputs: [],
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const api = new KaspaApi();
      const result = await api.getTransaction('abc123');

      expect(result).toEqual(mockResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.kaspa.org/transactions/abc123',
        expect.any(Object)
      );
    });

    it('throws error on API failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: () => Promise.resolve('Not found'),
      });

      const api = new KaspaApi();
      await expect(api.getTransaction('notfound')).rejects.toThrow('API error 404');
    });
  });

  describe('uses correct endpoints for different networks', () => {
    it('uses testnet-10 endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ priorityBucket: { feerate: 1 }, normalBuckets: [], lowBuckets: [] }),
      });

      const api = new KaspaApi('testnet-10');
      await api.getFeeEstimate();

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api-tn10.kaspa.org/info/fee-estimate',
        expect.any(Object)
      );
    });

    it('uses testnet-11 endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ priorityBucket: { feerate: 1 }, normalBuckets: [], lowBuckets: [] }),
      });

      const api = new KaspaApi('testnet-11');
      await api.getFeeEstimate();

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api-tn11.kaspa.org/info/fee-estimate',
        expect.any(Object)
      );
    });
  });
});

describe('getApi', () => {
  it('returns cached instance for same network', () => {
    const api1 = getApi('mainnet');
    const api2 = getApi('mainnet');
    expect(api1).toBe(api2);
  });

  it('returns new instance for different network', () => {
    const api1 = getApi('mainnet');
    const api2 = getApi('testnet-10');
    expect(api1).not.toBe(api2);
  });
});
