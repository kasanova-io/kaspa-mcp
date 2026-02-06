// ABOUTME: Unit tests for KaspaWallet key management
// ABOUTME: Tests mnemonic derivation, private key handling, and address generation
// Uses deterministic test vectors from Kaspium wallet for cross-implementation verification

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { KaspaWallet, getWallet } from './wallet.js';
import testVectors from './test-vectors.json' with { type: 'json' };

// WARNING: These are PUBLIC TEST-ONLY credentials. DO NOT use on mainnet with real funds.
// They are published in this repository and offer no security.

// Use test vectors from JSON file
const VECTOR_12_WORD = testVectors.vectors[0];
const VECTOR_24_WORD = testVectors.vectors[1];
const VECTOR_PRIVATE_KEY = testVectors.privateKeyVectors[0];

describe('KaspaWallet', () => {
  describe('fromMnemonic - Deterministic Test Vectors', () => {
    describe('12-word mnemonic', () => {
      const mnemonic = VECTOR_12_WORD.mnemonic;
      const account0 = VECTOR_12_WORD.accounts[0];
      const account1 = VECTOR_12_WORD.accounts[1];

      it('derives correct mainnet address for account 0', () => {
        const wallet = KaspaWallet.fromMnemonic(mnemonic, 'mainnet', 0);
        expect(wallet.getAddress()).toBe(account0.mainnetAddress);
      });

      it('derives correct testnet address for account 0', () => {
        const wallet = KaspaWallet.fromMnemonic(mnemonic, 'testnet-10', 0);
        expect(wallet.getAddress()).toBe(account0.testnetAddress);
      });

      it('derives correct mainnet address for account 1', () => {
        const wallet = KaspaWallet.fromMnemonic(mnemonic, 'mainnet', 1);
        expect(wallet.getAddress()).toBe(account1.mainnetAddress);
      });

      it('produces different addresses for different accounts', () => {
        const wallet0 = KaspaWallet.fromMnemonic(mnemonic, 'mainnet', 0);
        const wallet1 = KaspaWallet.fromMnemonic(mnemonic, 'mainnet', 1);
        expect(wallet0.getAddress()).not.toBe(wallet1.getAddress());
      });
    });

    describe('24-word mnemonic', () => {
      const mnemonic = VECTOR_24_WORD.mnemonic;
      const account0 = VECTOR_24_WORD.accounts[0];
      const account1 = VECTOR_24_WORD.accounts[1];

      it('derives correct mainnet address for account 0', () => {
        const wallet = KaspaWallet.fromMnemonic(mnemonic, 'mainnet', 0);
        expect(wallet.getAddress()).toBe(account0.mainnetAddress);
      });

      it('derives correct testnet address for account 0', () => {
        const wallet = KaspaWallet.fromMnemonic(mnemonic, 'testnet-10', 0);
        expect(wallet.getAddress()).toBe(account0.testnetAddress);
      });

      it('derives correct mainnet address for account 1', () => {
        const wallet = KaspaWallet.fromMnemonic(mnemonic, 'mainnet', 1);
        expect(wallet.getAddress()).toBe(account1.mainnetAddress);
      });
    });
  });

  describe('fromMnemonic - Basic functionality', () => {
    it('creates wallet from valid mnemonic for mainnet', () => {
      const wallet = KaspaWallet.fromMnemonic(VECTOR_12_WORD.mnemonic, 'mainnet');
      expect(wallet).toBeInstanceOf(KaspaWallet);
      expect(wallet.getAddress()).toMatch(/^kaspa:/);
    });

    it('creates wallet from valid mnemonic for testnet-10', () => {
      const wallet = KaspaWallet.fromMnemonic(VECTOR_12_WORD.mnemonic, 'testnet-10');
      expect(wallet).toBeInstanceOf(KaspaWallet);
      expect(wallet.getAddress()).toMatch(/^kaspatest:/);
    });

    it('creates wallet from valid mnemonic for testnet-11', () => {
      const wallet = KaspaWallet.fromMnemonic(VECTOR_12_WORD.mnemonic, 'testnet-11');
      expect(wallet).toBeInstanceOf(KaspaWallet);
      expect(wallet.getAddress()).toMatch(/^kaspatest:/);
    });

    it('throws error for empty mnemonic', () => {
      expect(() => KaspaWallet.fromMnemonic('', 'mainnet')).toThrow('Mnemonic phrase is required');
    });

    it('throws error for invalid mnemonic', () => {
      expect(() => KaspaWallet.fromMnemonic('invalid mnemonic words', 'mainnet')).toThrow('Invalid mnemonic phrase');
    });

    it('defaults to mainnet when no network specified', () => {
      const wallet = KaspaWallet.fromMnemonic(VECTOR_12_WORD.mnemonic);
      expect(wallet.getAddress()).toMatch(/^kaspa:/);
    });
  });

  describe('fromMnemonic - Invalid mnemonic validation', () => {
    for (const invalidMnemonic of testVectors.invalidMnemonics) {
      const displayName = invalidMnemonic === '' ? '(empty string)' : invalidMnemonic.slice(0, 30) + (invalidMnemonic.length > 30 ? '...' : '');
      it(`rejects invalid mnemonic: ${displayName}`, () => {
        expect(() => KaspaWallet.fromMnemonic(invalidMnemonic, 'mainnet')).toThrow();
      });
    }
  });

  describe('fromPrivateKey - Deterministic Test Vectors', () => {
    it('derives correct mainnet address from private key', () => {
      const wallet = KaspaWallet.fromPrivateKey(VECTOR_PRIVATE_KEY.privateKey, 'mainnet');
      expect(wallet.getAddress()).toBe(VECTOR_PRIVATE_KEY.mainnetAddress);
    });

    it('derives correct testnet address from private key', () => {
      const wallet = KaspaWallet.fromPrivateKey(VECTOR_PRIVATE_KEY.privateKey, 'testnet-10');
      expect(wallet.getAddress()).toBe(VECTOR_PRIVATE_KEY.testnetAddress);
    });
  });

  describe('fromPrivateKey - Basic functionality', () => {
    it('creates wallet from valid private key', () => {
      const wallet = KaspaWallet.fromPrivateKey(VECTOR_PRIVATE_KEY.privateKey, 'mainnet');
      expect(wallet).toBeInstanceOf(KaspaWallet);
      expect(wallet.getAddress()).toMatch(/^kaspa:/);
    });

    it('creates wallet for testnet-10', () => {
      const wallet = KaspaWallet.fromPrivateKey(VECTOR_PRIVATE_KEY.privateKey, 'testnet-10');
      expect(wallet.getAddress()).toMatch(/^kaspatest:/);
    });

    it('throws error for empty private key', () => {
      expect(() => KaspaWallet.fromPrivateKey('', 'mainnet')).toThrow('Private key is required');
    });

    it('throws error for invalid private key format', () => {
      expect(() => KaspaWallet.fromPrivateKey('not-a-valid-key', 'mainnet')).toThrow('Invalid private key format');
    });

    it('defaults to mainnet when no network specified', () => {
      const wallet = KaspaWallet.fromPrivateKey(VECTOR_PRIVATE_KEY.privateKey);
      expect(wallet.getAddress()).toMatch(/^kaspa:/);
    });
  });

  describe('fromPrivateKey - Invalid key validation', () => {
    for (const invalidKey of testVectors.invalidPrivateKeys) {
      const displayName = invalidKey === '' ? '(empty string)' : invalidKey;
      it(`rejects invalid private key: ${displayName}`, () => {
        expect(() => KaspaWallet.fromPrivateKey(invalidKey, 'mainnet')).toThrow();
      });
    }
  });

  describe('getAddress', () => {
    it('returns consistent address for same wallet', () => {
      const wallet = KaspaWallet.fromMnemonic(VECTOR_12_WORD.mnemonic, 'mainnet');
      expect(wallet.getAddress()).toBe(wallet.getAddress());
    });
  });

  describe('getPrivateKey', () => {
    it('returns the private key object', () => {
      const wallet = KaspaWallet.fromMnemonic(VECTOR_12_WORD.mnemonic, 'mainnet');
      const pk = wallet.getPrivateKey();
      expect(pk).toBeDefined();
    });
  });

  describe('getNetworkType', () => {
    it('returns Mainnet for mainnet wallet', () => {
      const wallet = KaspaWallet.fromMnemonic(VECTOR_12_WORD.mnemonic, 'mainnet');
      const networkType = wallet.getNetworkType();
      expect(networkType).toBeDefined();
    });

    it('returns Testnet for testnet-10 wallet', () => {
      const wallet = KaspaWallet.fromMnemonic(VECTOR_12_WORD.mnemonic, 'testnet-10');
      const networkType = wallet.getNetworkType();
      expect(networkType).toBeDefined();
    });
  });

  describe('getNetworkId', () => {
    it('returns mainnet for mainnet wallet', () => {
      const wallet = KaspaWallet.fromMnemonic(VECTOR_12_WORD.mnemonic, 'mainnet');
      expect(wallet.getNetworkId()).toBe('mainnet');
    });

    it('returns testnet-10 for testnet-10 wallet', () => {
      const wallet = KaspaWallet.fromMnemonic(VECTOR_12_WORD.mnemonic, 'testnet-10');
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
    process.env.KASPA_MNEMONIC = VECTOR_12_WORD.mnemonic;
    process.env.KASPA_NETWORK = 'testnet-10';
    delete process.env.KASPA_PRIVATE_KEY;

    const { getWallet: freshGetWallet } = await import('./wallet.js');
    const wallet = freshGetWallet();
    expect(wallet.getAddress()).toBe(VECTOR_12_WORD.accounts[0].testnetAddress);
  });

  it('creates wallet from KASPA_PRIVATE_KEY when no mnemonic', async () => {
    delete process.env.KASPA_MNEMONIC;
    process.env.KASPA_PRIVATE_KEY = VECTOR_PRIVATE_KEY.privateKey;
    process.env.KASPA_NETWORK = 'mainnet';

    const { getWallet: freshGetWallet } = await import('./wallet.js');
    const wallet = freshGetWallet();
    expect(wallet.getAddress()).toBe(VECTOR_PRIVATE_KEY.mainnetAddress);
  });

  it('uses account index from KASPA_ACCOUNT_INDEX', async () => {
    process.env.KASPA_MNEMONIC = VECTOR_12_WORD.mnemonic;
    process.env.KASPA_NETWORK = 'mainnet';
    process.env.KASPA_ACCOUNT_INDEX = '1';
    delete process.env.KASPA_PRIVATE_KEY;

    const { getWallet: freshGetWallet } = await import('./wallet.js');
    const wallet = freshGetWallet();
    expect(wallet.getAddress()).toBe(VECTOR_12_WORD.accounts[1].mainnetAddress);
  });

  it('defaults to mainnet when KASPA_NETWORK not set', async () => {
    process.env.KASPA_MNEMONIC = VECTOR_12_WORD.mnemonic;
    delete process.env.KASPA_NETWORK;
    delete process.env.KASPA_PRIVATE_KEY;

    const { getWallet: freshGetWallet } = await import('./wallet.js');
    const wallet = freshGetWallet();
    expect(wallet.getAddress()).toBe(VECTOR_12_WORD.accounts[0].mainnetAddress);
  });

  it('prefers KASPA_MNEMONIC over KASPA_PRIVATE_KEY when both set', async () => {
    // Both credentials set - mnemonic should take precedence
    process.env.KASPA_MNEMONIC = VECTOR_12_WORD.mnemonic;
    process.env.KASPA_PRIVATE_KEY = VECTOR_PRIVATE_KEY.privateKey;
    process.env.KASPA_NETWORK = 'mainnet';

    const { getWallet: freshGetWallet } = await import('./wallet.js');
    const wallet = freshGetWallet();
    // Should use mnemonic-derived address, not private key address
    expect(wallet.getAddress()).toBe(VECTOR_12_WORD.accounts[0].mainnetAddress);
    expect(wallet.getAddress()).not.toBe(VECTOR_PRIVATE_KEY.mainnetAddress);
  });

  it('throws error when no credentials set', async () => {
    delete process.env.KASPA_MNEMONIC;
    delete process.env.KASPA_PRIVATE_KEY;

    const { getWallet: freshGetWallet } = await import('./wallet.js');
    expect(() => freshGetWallet()).toThrow('Either KASPA_MNEMONIC or KASPA_PRIVATE_KEY environment variable must be set');
  });

  it('returns cached wallet on subsequent calls', async () => {
    process.env.KASPA_MNEMONIC = VECTOR_12_WORD.mnemonic;
    process.env.KASPA_NETWORK = 'mainnet';

    const { getWallet: freshGetWallet } = await import('./wallet.js');
    const wallet1 = freshGetWallet();
    const wallet2 = freshGetWallet();
    expect(wallet1).toBe(wallet2);
  });
});
