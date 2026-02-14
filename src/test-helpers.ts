// ABOUTME: Shared test constants and factories for real testnet integration tests
// ABOUTME: Provides real KaspaApi and KaspaWallet instances for testnet-10

import { KaspaApi } from './kaspa/api.js';
import { KaspaWallet, type NetworkTypeName } from './kaspa/wallet.js';

export const TESTNET_NETWORK: NetworkTypeName = 'testnet-10';
export const TESTNET_ADDRESS = 'kaspatest:qrm0yflx0axj7srheze8fflhh2fvcx3ukc54m5y3ew63wnjk3lu5gwwkjfzaj';
export const TESTNET_TX_ID = '3afa2afc9fb750c731120f9d6891b88cf356f2348ee2d7fef74fee22353fe544';

export function getTestnetApi(): KaspaApi {
  return new KaspaApi(TESTNET_NETWORK);
}

export function getTestnetWallet(): KaspaWallet {
  const mnemonic = process.env.KASPA_MNEMONIC;
  if (!mnemonic) {
    throw new Error('KASPA_MNEMONIC environment variable is required for integration tests');
  }
  return KaspaWallet.fromMnemonic(mnemonic, TESTNET_NETWORK);
}
