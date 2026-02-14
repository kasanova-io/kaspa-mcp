// ABOUTME: MCP tool to get balance for a Kaspa address
// ABOUTME: Returns balance in KAS and UTXO count

import * as kaspa from 'kaspa-wasm';
import { getApi } from '../kaspa/api.js';
import { getWallet } from '../kaspa/wallet.js';

const { sompiToKaspaString } = kaspa;

export interface GetBalanceParams {
  address?: string;
}

export interface GetBalanceResult {
  address: string;
  balance: string;
}

export async function getBalance(params: GetBalanceParams): Promise<GetBalanceResult> {
  const wallet = getWallet();
  const address = params.address || wallet.getAddress();
  const api = getApi(wallet.getNetworkId());

  const balanceResponse = await api.getBalance(address);
  const balanceKas = sompiToKaspaString(BigInt(balanceResponse.balance));

  return {
    address,
    balance: balanceKas,
  };
}
