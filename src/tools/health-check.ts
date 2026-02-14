// ABOUTME: MCP tool to check server health before performing wallet operations
// ABOUTME: Validates wallet config, address derivation, and API connectivity

import { getWallet } from '../kaspa/wallet.js';
import { getApi } from '../kaspa/api.js';

export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: {
    wallet: { ok: boolean; error?: string };
    address: { ok: boolean; address?: string; error?: string };
    api: { ok: boolean; error?: string };
  };
  network: string;
  version: string;
}

const VERSION = '0.3.0';

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export async function healthCheck(): Promise<HealthCheckResult> {
  const checks: HealthCheckResult['checks'] = {
    wallet: { ok: false },
    address: { ok: false },
    api: { ok: false },
  };
  let network = 'unknown';

  // Check 1: Wallet configuration
  let wallet;
  try {
    wallet = getWallet();
    checks.wallet = { ok: true };
  } catch (error) {
    checks.wallet = { ok: false, error: errorMessage(error) };
    return { status: 'unhealthy', checks, network, version: VERSION };
  }

  network = wallet.getNetworkId();

  // Check 2: Address derivation
  try {
    const address = wallet.getAddress();
    checks.address = { ok: true, address };
  } catch (error) {
    checks.address = { ok: false, error: errorMessage(error) };
  }

  // Check 3: API connectivity
  try {
    const api = getApi(network);
    await api.getFeeEstimate();
    checks.api = { ok: true };
  } catch (error) {
    checks.api = { ok: false, error: errorMessage(error) };
  }

  // Compute overall status
  let status: HealthCheckResult['status'];
  if (!checks.wallet.ok || !checks.address.ok) {
    status = 'unhealthy';
  } else if (!checks.api.ok) {
    status = 'degraded';
  } else {
    status = 'healthy';
  }

  return { status, checks, network, version: VERSION };
}
