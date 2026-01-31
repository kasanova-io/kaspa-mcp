// ABOUTME: MCP tool to get current fee estimates from the Kaspa network
// ABOUTME: Returns priority and normal fee rates in sompi/gram

import { getApi } from '../kaspa/api.js';
import { getWallet } from '../kaspa/wallet.js';

export interface GetFeeEstimateResult {
  priorityFee: string;
  normalFee: string;
  lowFee: string;
}

export async function getFeeEstimate(): Promise<GetFeeEstimateResult> {
  const api = getApi(getWallet().getNetworkId());
  const feeEstimate = await api.getFeeEstimate();

  return {
    priorityFee: feeEstimate.priorityBucket.feerate.toString(),
    normalFee: feeEstimate.normalBuckets[0]?.feerate.toString() || '0',
    lowFee: feeEstimate.lowBuckets[0]?.feerate.toString() || '0',
  };
}
