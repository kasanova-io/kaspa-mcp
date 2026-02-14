// ABOUTME: MCP tool to get transaction status and details
// ABOUTME: Returns transaction details including inputs, outputs, and acceptance status

import * as kaspa from 'kaspa-wasm';
import { getApi } from '../kaspa/api.js';
import { getWallet } from '../kaspa/wallet.js';

const { sompiToKaspaString } = kaspa;

export interface GetTransactionParams {
  txId: string;
}

export interface TransactionOutput {
  index: number;
  amount: string;
  address: string;
}

export interface TransactionInput {
  transactionId: string;
  index: number;
}

export interface GetTransactionResult {
  txId: string;
  accepted: boolean;
  blockHash?: string;
  blockTime?: number;
  inputs: TransactionInput[];
  outputs: TransactionOutput[];
}

export async function getTransaction(params: GetTransactionParams): Promise<GetTransactionResult> {
  if (!params.txId) {
    throw new Error('Transaction ID (txId) is required');
  }

  const api = getApi(getWallet().getNetworkId());

  try {
    const tx = await api.getTransaction(params.txId);

    return {
      txId: tx.transaction_id,
      accepted: tx.is_accepted,
      blockHash: tx.block_hash?.[0],
      blockTime: tx.block_time,
      inputs: tx.inputs.map((input) => ({
        transactionId: input.previous_outpoint_hash,
        index: Number(input.previous_outpoint_index),
      })),
      outputs: tx.outputs.map((output, idx) => ({
        index: idx,
        amount: sompiToKaspaString(BigInt(output.amount)),
        address: output.script_public_key_address,
      })),
    };
  } catch (error) {
    if (error instanceof Error && error.message.includes('404')) {
      throw new Error(`Transaction not found: ${params.txId}`);
    }
    throw error;
  }
}
