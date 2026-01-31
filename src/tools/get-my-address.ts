// ABOUTME: MCP tool to get the wallet address derived from the configured private key
// ABOUTME: Returns the Kaspa address for the current wallet

import { getWallet } from '../kaspa/wallet.js';

export interface GetMyAddressResult {
  address: string;
}

export async function getMyAddress(): Promise<GetMyAddressResult> {
  const wallet = getWallet();
  return {
    address: wallet.getAddress(),
  };
}
