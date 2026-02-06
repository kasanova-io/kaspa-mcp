// ABOUTME: Tool to generate a new BIP39 mnemonic and derive Kaspa address
// ABOUTME: Returns mnemonic phrase and corresponding wallet address

import * as kaspa from 'kaspa-wasm';
import { KaspaWallet, NetworkTypeName } from '../kaspa/wallet.js';

const { Mnemonic } = kaspa;

export interface GenerateMnemonicParams {
  wordCount?: 12 | 24;
  network?: NetworkTypeName;
}

export interface GenerateMnemonicResult {
  mnemonic: string;
  address: string;
  network: string;
  warning: string;
}

export async function generateMnemonic(params: GenerateMnemonicParams = {}): Promise<GenerateMnemonicResult> {
  const wordCount = params.wordCount ?? 24;
  const network = params.network ?? 'mainnet';

  if (wordCount !== 12 && wordCount !== 24) {
    throw new Error('Word count must be 12 or 24');
  }

  // Generate random mnemonic using kaspa-wasm
  const mnemonic = Mnemonic.random(wordCount);
  const phrase = mnemonic.phrase;

  // Derive wallet to get address
  const wallet = KaspaWallet.fromMnemonic(phrase, network, 0);
  const address = wallet.getAddress();

  return {
    mnemonic: phrase,
    address,
    network,
    warning: 'IMPORTANT: Save this mnemonic securely. It cannot be recovered if lost. Never share it with anyone.',
  };
}
