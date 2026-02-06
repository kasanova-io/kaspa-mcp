// ABOUTME: Tests for generate-mnemonic tool
// ABOUTME: Verifies mnemonic generation and address derivation

import { describe, it, expect } from 'vitest';
import { generateMnemonic } from './generate-mnemonic.js';

describe('generateMnemonic', () => {
  it('generates a 24-word mnemonic by default', async () => {
    const result = await generateMnemonic();

    expect(result.mnemonic).toBeDefined();
    const words = result.mnemonic.split(' ');
    expect(words).toHaveLength(24);
    expect(result.network).toBe('mainnet');
    expect(result.address).toMatch(/^kaspa:/);
    expect(result.warning).toContain('IMPORTANT');
  });

  it('generates a 12-word mnemonic when requested', async () => {
    const result = await generateMnemonic({ wordCount: 12 });

    const words = result.mnemonic.split(' ');
    expect(words).toHaveLength(12);
  });

  it('generates for testnet when specified', async () => {
    const result = await generateMnemonic({ network: 'testnet-10' });

    expect(result.network).toBe('testnet-10');
    expect(result.address).toMatch(/^kaspatest:/);
  });

  it('generates unique mnemonics each time', async () => {
    const result1 = await generateMnemonic();
    const result2 = await generateMnemonic();

    expect(result1.mnemonic).not.toBe(result2.mnemonic);
    expect(result1.address).not.toBe(result2.address);
  });

  it('rejects invalid word count', async () => {
    await expect(generateMnemonic({ wordCount: 18 as any })).rejects.toThrow('Word count must be 12 or 24');
  });

  it('generated mnemonic can be used to recreate wallet', async () => {
    const result = await generateMnemonic();
    
    // Import the wallet module and verify the mnemonic works
    const { KaspaWallet } = await import('../kaspa/wallet.js');
    const wallet = KaspaWallet.fromMnemonic(result.mnemonic, 'mainnet', 0);
    
    expect(wallet.getAddress()).toBe(result.address);
  });
});
