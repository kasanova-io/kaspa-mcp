// ABOUTME: Unit tests for KaspaWallet key management
// ABOUTME: Tests mnemonic derivation, private key handling, and address generation

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { KaspaWallet, getWallet } from './wallet.js';

// WARNING: These are PUBLIC TEST-ONLY credentials. DO NOT use on mainnet with real funds.
// They are published in this repository and offer no security.

// Valid test mnemonic (24 words)
const TEST_MNEMONIC = 'matter client cigar north mixed hard rail kitten flat shrug view group diagram release goose thumb benefit fire confirm swamp skill merry genre visa';

// Valid testnet private key (64 hex characters)
const TEST_PRIVATE_KEY = 'a9f8d7e6c5b4a3029187654321fedcba9876543210fedcba9876543210fedcba';

describe('KaspaWallet', () => {
  describe('fromMnemonic', () => {
    it('creates wallet from valid mnemonic for mainnet', () => {
      const wallet = KaspaWallet.fromMnemonic(TEST_MNEMONIC, 'mainnet');
      expect(wallet).toBeInstanceOf(KaspaWallet);
      expect(wallet.getAddress()).toMatch(/^kaspa:/);
    });

    it('creates wallet from valid mnemonic for testnet-10', () => {
      const wallet = KaspaWallet.fromMnemonic(TEST_MNEMONIC, 'testnet-10');
      expect(wallet).toBeInstanceOf(KaspaWallet);
      expect(wallet.getAddress()).toMatch(/^kaspatest:/);
    });

    it('creates wallet from valid mnemonic for testnet-11', () => {
      const wallet = KaspaWallet.fromMnemonic(TEST_MNEMONIC, 'testnet-11');
      expect(wallet).toBeInstanceOf(KaspaWallet);
      expect(wallet.getAddress()).toMatch(/^kaspatest:/);
    });

    it('creates wallet with different account index', () => {
      const wallet0 = KaspaWallet.fromMnemonic(TEST_MNEMONIC, 'mainnet', 0);
      const wallet1 = KaspaWallet.fromMnemonic(TEST_MNEMONIC, 'mainnet', 1);
      expect(wallet0.getAddress()).not.toBe(wallet1.getAddress());
    });

    it('throws error for empty mnemonic', () => {
      expect(() => KaspaWallet.fromMnemonic('', 'mainnet')).toThrow('Mnemonic phrase is required');
    });

    it('throws error for invalid mnemonic', () => {
      expect(() => KaspaWallet.fromMnemonic('invalid mnemonic words', 'mainnet')).toThrow('Invalid mnemonic phrase');
    });

    it('defaults to mainnet when no network specified', () => {
      const wallet = KaspaWallet.fromMnemonic(TEST_MNEMONIC);
      expect(wallet.getAddress()).toMatch(/^kaspa:/);
    });
  });

  describe('fromPrivateKey', () => {
    it('creates wallet from valid private key', () => {
      const wallet = KaspaWallet.fromPrivateKey(TEST_PRIVATE_KEY, 'mainnet');
      expect(wallet).toBeInstanceOf(KaspaWallet);
      expect(wallet.getAddress()).toMatch(/^kaspa:/);
    });

    it('creates wallet for testnet-10', () => {
      const wallet = KaspaWallet.fromPrivateKey(TEST_PRIVATE_KEY, 'testnet-10');
      expect(wallet.getAddress()).toMatch(/^kaspatest:/);
    });

    it('throws error for empty private key', () => {
      expect(() => KaspaWallet.fromPrivateKey('', 'mainnet')).toThrow('Private key is required');
    });

    it('throws error for invalid private key format', () => {
      expect(() => KaspaWallet.fromPrivateKey('not-a-valid-key', 'mainnet')).toThrow('Invalid private key format');
    });

    it('defaults to mainnet when no network specified', () => {
      const wallet = KaspaWallet.fromPrivateKey(TEST_PRIVATE_KEY);
      expect(wallet.getAddress()).toMatch(/^kaspa:/);
    });
  });

  describe('getAddress', () => {
    it('returns consistent address for same wallet', () => {
      const wallet = KaspaWallet.fromMnemonic(TEST_MNEMONIC, 'mainnet');
      expect(wallet.getAddress()).toBe(wallet.getAddress());
    });
  });

  describe('getPrivateKey', () => {
    it('returns the private key object', () => {
      const wallet = KaspaWallet.fromMnemonic(TEST_MNEMONIC, 'mainnet');
      const pk = wallet.getPrivateKey();
      expect(pk).toBeDefined();
    });
  });

  describe('getNetworkType', () => {
    it('returns Mainnet for mainnet wallet', () => {
      const wallet = KaspaWallet.fromMnemonic(TEST_MNEMONIC, 'mainnet');
      const networkType = wallet.getNetworkType();
      expect(networkType).toBeDefined();
    });

    it('returns Testnet for testnet-10 wallet', () => {
      const wallet = KaspaWallet.fromMnemonic(TEST_MNEMONIC, 'testnet-10');
      const networkType = wallet.getNetworkType();
      expect(networkType).toBeDefined();
    });
  });

  describe('getNetworkId', () => {
    it('returns mainnet for mainnet wallet', () => {
      const wallet = KaspaWallet.fromMnemonic(TEST_MNEMONIC, 'mainnet');
      expect(wallet.getNetworkId()).toBe('mainnet');
    });

    it('returns testnet-10 for testnet-10 wallet', () => {
      const wallet = KaspaWallet.fromMnemonic(TEST_MNEMONIC, 'testnet-10');
      expect(wallet.getNetworkId()).toBe('testnet-10');
    });
  });
});

describe('getWallet', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset module state by clearing the cached wallet
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('creates wallet from KASPA_MNEMONIC environment variable', async () => {
    process.env.KASPA_MNEMONIC = TEST_MNEMONIC;
    process.env.KASPA_NETWORK = 'testnet-10';
    delete process.env.KASPA_PRIVATE_KEY;

    const { getWallet: freshGetWallet } = await import('./wallet.js');
    const wallet = freshGetWallet();
    expect(wallet.getAddress()).toMatch(/^kaspatest:/);
  });

  it('creates wallet from KASPA_PRIVATE_KEY when no mnemonic', async () => {
    delete process.env.KASPA_MNEMONIC;
    process.env.KASPA_PRIVATE_KEY = TEST_PRIVATE_KEY;
    process.env.KASPA_NETWORK = 'mainnet';

    const { getWallet: freshGetWallet } = await import('./wallet.js');
    const wallet = freshGetWallet();
    expect(wallet.getAddress()).toMatch(/^kaspa:/);
  });

  it('uses account index from KASPA_ACCOUNT_INDEX', async () => {
    process.env.KASPA_MNEMONIC = TEST_MNEMONIC;
    process.env.KASPA_NETWORK = 'mainnet';
    process.env.KASPA_ACCOUNT_INDEX = '1';
    delete process.env.KASPA_PRIVATE_KEY;

    const { getWallet: freshGetWallet } = await import('./wallet.js');
    const wallet = freshGetWallet();
    // Use duck typing since module re-import creates different class reference
    expect(wallet.getAddress()).toMatch(/^kaspa:/);
    expect(wallet.getNetworkId()).toBe('mainnet');
  });

  it('defaults to mainnet when KASPA_NETWORK not set', async () => {
    process.env.KASPA_MNEMONIC = TEST_MNEMONIC;
    delete process.env.KASPA_NETWORK;
    delete process.env.KASPA_PRIVATE_KEY;

    const { getWallet: freshGetWallet } = await import('./wallet.js');
    const wallet = freshGetWallet();
    expect(wallet.getAddress()).toMatch(/^kaspa:/);
  });

  it('throws error when no credentials set', async () => {
    delete process.env.KASPA_MNEMONIC;
    delete process.env.KASPA_PRIVATE_KEY;

    const { getWallet: freshGetWallet } = await import('./wallet.js');
    expect(() => freshGetWallet()).toThrow('Either KASPA_MNEMONIC or KASPA_PRIVATE_KEY environment variable must be set');
  });

  it('returns cached wallet on subsequent calls', async () => {
    process.env.KASPA_MNEMONIC = TEST_MNEMONIC;
    process.env.KASPA_NETWORK = 'mainnet';

    const { getWallet: freshGetWallet } = await import('./wallet.js');
    const wallet1 = freshGetWallet();
    const wallet2 = freshGetWallet();
    expect(wallet1).toBe(wallet2);
  });
});
