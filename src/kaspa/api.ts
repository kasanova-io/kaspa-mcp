// ABOUTME: REST API client for Kaspa REST APIs
// ABOUTME: Handles UTXO queries, balance checks, fee estimates - supports mainnet and testnet

import type {
  UtxoResponse,
  BalanceResponse,
  FeeEstimateResponse,
  TransactionResponse,
} from '../types.js';

const API_ENDPOINTS: Record<string, string> = {
  mainnet: 'https://api.kaspa.org',
  'testnet-10': 'https://api-tn10.kaspa.org',
  'testnet-11': 'https://api-tn11.kaspa.org',
};

export class KaspaApi {
  private baseUrl: string;

  constructor(network: string = 'mainnet') {
    const endpoint = API_ENDPOINTS[network];
    if (!endpoint) {
      throw new Error(`Unknown network "${network}". Supported: ${Object.keys(API_ENDPOINTS).join(', ')}`);
    }
    this.baseUrl = endpoint;
  }

  private async fetch<T>(path: string, options?: RequestInit): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`API error ${response.status}: ${text}`);
    }

    return response.json() as Promise<T>;
  }

  async getBalance(address: string): Promise<BalanceResponse> {
    return this.fetch<BalanceResponse>(`/addresses/${address}/balance`);
  }

  async getUtxos(address: string): Promise<UtxoResponse[]> {
    return this.fetch<UtxoResponse[]>(`/addresses/${address}/utxos`);
  }

  async getFeeEstimate(): Promise<FeeEstimateResponse> {
    return this.fetch<FeeEstimateResponse>('/info/fee-estimate');
  }

  async getTransaction(txId: string): Promise<TransactionResponse> {
    return this.fetch<TransactionResponse>(`/transactions/${txId}`);
  }
}

let apiInstance: KaspaApi | null = null;
let apiNetwork: string | null = null;

export function getApi(network: string): KaspaApi {
  if (!apiInstance || apiNetwork !== network) {
    apiInstance = new KaspaApi(network);
    apiNetwork = network;
  }
  return apiInstance;
}
