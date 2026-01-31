// ABOUTME: Type definitions for Kaspa MCP
// ABOUTME: Includes API response types and internal data structures

export interface UtxoResponse {
  address: string;
  outpoint: {
    transactionId: string;
    index: number;
  };
  utxoEntry: {
    amount: string;
    scriptPublicKey: {
      scriptPublicKey: string;
    };
    blockDaaScore: string;
    isCoinbase: boolean;
  };
}

export interface BalanceResponse {
  address: string;
  balance: string;
}

export interface FeeEstimateResponse {
  priorityBucket: {
    feerate: number;
    estimatedSeconds: number;
  };
  normalBuckets: Array<{
    feerate: number;
    estimatedSeconds: number;
  }>;
  lowBuckets: Array<{
    feerate: number;
    estimatedSeconds: number;
  }>;
}

export interface TransactionResponse {
  transaction_id: string;
  block_hash: string[];
  block_time: number;
  is_accepted: boolean;
  inputs: Array<{
    transaction_id: string;
    index: number;
    previous_outpoint_hash: string;
    previous_outpoint_index: number;
    signature_script: string;
    sig_op_count: number;
  }>;
  outputs: Array<{
    amount: string;
    script_public_key: string;
    script_public_key_address: string;
    script_public_key_type: string;
  }>;
}

