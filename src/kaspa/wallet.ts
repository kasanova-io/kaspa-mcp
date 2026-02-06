// ABOUTME: Wallet module for key management and address derivation
// ABOUTME: Supports both mnemonic (BIP39) and raw private key

import * as kaspa from 'kaspa-wasm';

const { PrivateKey, NetworkType, Mnemonic, XPrv } = kaspa;

export type NetworkTypeName = 'mainnet' | 'testnet-10' | 'testnet-11';

function getNetworkType(network: NetworkTypeName): kaspa.NetworkType {
  switch (network) {
    case 'mainnet':
      return NetworkType.Mainnet;
    case 'testnet-10':
    case 'testnet-11':
      return NetworkType.Testnet;
    /* c8 ignore next 2 */
    default:
      return NetworkType.Mainnet;
  }
}

function derivePrivateKeyFromMnemonic(phrase: string, accountIndex = 0): kaspa.PrivateKey {
  const mnemonic = new Mnemonic(phrase);
  const seed = mnemonic.toSeed();
  const xprv = new XPrv(seed);

  // BIP44 path: m/44'/111111'/account'/0/0
  // 44' = purpose (BIP44)
  // 111111' = Kaspa coin type
  // account' = account index (hardened)
  // 0 = external chain (receive addresses)
  // 0 = address index
  const derived = xprv
    .deriveChild(44, true)        // purpose
    .deriveChild(111111, true)    // coin type
    .deriveChild(accountIndex, true)  // account
    .deriveChild(0, false)        // external chain (receive)
    .deriveChild(0, false);       // address index

  return derived.toPrivateKey();
}

export class KaspaWallet {
  private privateKey: kaspa.PrivateKey;
  private keypair: kaspa.Keypair;
  private network: NetworkTypeName;

  private constructor(privateKey: kaspa.PrivateKey, network: NetworkTypeName) {
    this.privateKey = privateKey;
    this.keypair = privateKey.toKeypair();
    this.network = network;
  }

  static fromPrivateKey(privateKeyHex: string, network: NetworkTypeName = 'mainnet'): KaspaWallet {
    if (!privateKeyHex) {
      throw new Error('Private key is required');
    }

    try {
      const privateKey = new PrivateKey(privateKeyHex);
      return new KaspaWallet(privateKey, network);
    } catch {
      throw new Error('Invalid private key format');
    }
  }

  static fromMnemonic(phrase: string, network: NetworkTypeName = 'mainnet', accountIndex = 0): KaspaWallet {
    if (!phrase) {
      throw new Error('Mnemonic phrase is required');
    }

    try {
      const privateKey = derivePrivateKeyFromMnemonic(phrase, accountIndex);
      return new KaspaWallet(privateKey, network);
    } catch {
      throw new Error('Invalid mnemonic phrase');
    }
  }

  getAddress(): string {
    const networkType = getNetworkType(this.network);
    return this.keypair.toAddress(networkType).toString();
  }

  getPrivateKey(): kaspa.PrivateKey {
    return this.privateKey;
  }

  getNetworkType(): kaspa.NetworkType {
    return getNetworkType(this.network);
  }

  getNetworkId(): string {
    return this.network;
  }
}

let walletInstance: KaspaWallet | null = null;

export function getWallet(): KaspaWallet {
  if (!walletInstance) {
    const mnemonic = process.env.KASPA_MNEMONIC;
    const privateKey = process.env.KASPA_PRIVATE_KEY;
    const network = (process.env.KASPA_NETWORK as NetworkTypeName) || 'mainnet';
    const accountIndex = parseInt(process.env.KASPA_ACCOUNT_INDEX || '0', 10);

    if (mnemonic) {
      walletInstance = KaspaWallet.fromMnemonic(mnemonic, network, accountIndex);
    } else if (privateKey) {
      walletInstance = KaspaWallet.fromPrivateKey(privateKey, network);
    } else {
      throw new Error('Either KASPA_MNEMONIC or KASPA_PRIVATE_KEY environment variable must be set');
    }
  }
  return walletInstance;
}
