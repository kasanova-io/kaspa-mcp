// ABOUTME: MCP tool to send KAS tokens to a recipient address
// ABOUTME: Builds, signs, and broadcasts the transaction

import * as kaspa from 'kaspa-wasm';
import { sendKaspa as sendKaspaTransaction } from '../kaspa/transaction.js';
import { getWallet } from '../kaspa/wallet.js';

const { Address, NetworkType } = kaspa;

export interface SendKaspaParams {
  to: string;
  amount: string;
  priorityFee?: number;
  payload?: string;
}

export interface SendKaspaResult {
  txId: string;
  fee: string;
}

const SOMPI_PER_KAS = 100_000_000n;
const MAX_DECIMAL_PLACES = 8;

function validateAddress(address: string): void {
  let parsed: kaspa.Address;
  try {
    parsed = new Address(address);
  } catch {
    throw new Error(`Invalid Kaspa address: ${address}`);
  }

  const wallet = getWallet();
  const walletNetwork = wallet.getNetworkType();
  const expectedPrefix = walletNetwork === NetworkType.Mainnet ? 'kaspa' : 'kaspatest';

  if (parsed.prefix !== expectedPrefix) {
    throw new Error(
      `Address network mismatch: wallet is on ${wallet.getNetworkId()}, but address is for ${parsed.prefix === 'kaspa' ? 'mainnet' : 'testnet'}`
    );
  }
}

function kasToSompi(amountStr: string): bigint {
  const trimmed = amountStr.trim();
  if (!/^\d+(\.\d+)?$/.test(trimmed)) {
    throw new Error('Amount must be a valid decimal number');
  }

  const parts = trimmed.split('.');
  const integerPart = parts[0];
  let fractionalPart = parts[1] || '';

  if (fractionalPart.length > MAX_DECIMAL_PLACES) {
    throw new Error(`Amount cannot have more than ${MAX_DECIMAL_PLACES} decimal places`);
  }

  fractionalPart = fractionalPart.padEnd(MAX_DECIMAL_PLACES, '0');

  const sompi = BigInt(integerPart) * SOMPI_PER_KAS + BigInt(fractionalPart);

  if (sompi <= 0n) {
    throw new Error('Amount must be greater than zero');
  }

  return sompi;
}

export async function sendKaspa(params: SendKaspaParams): Promise<SendKaspaResult> {
  if (!params.to) {
    throw new Error('Recipient address (to) is required');
  }

  if (!params.amount) {
    throw new Error('Amount is required');
  }

  validateAddress(params.to);
  const amountSompi = kasToSompi(params.amount);

  const result = await sendKaspaTransaction(
    params.to,
    amountSompi,
    BigInt(params.priorityFee || 0),
    params.payload
  );

  return result;
}
