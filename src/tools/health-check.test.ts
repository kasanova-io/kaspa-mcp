// ABOUTME: Tests for health-check MCP tool against real testnet
// ABOUTME: Validates three-tier health status with spyOn for failure paths

import { describe, it, expect, vi, afterEach } from 'vitest';
import { healthCheck } from './health-check.js';
import * as walletModule from '../kaspa/wallet.js';
import { getApi } from '../kaspa/api.js';
import { TESTNET_ADDRESS, TESTNET_NETWORK } from '../test-helpers.js';

describe('healthCheck', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns healthy when all checks pass', async () => {
    const result = await healthCheck();

    expect(result.status).toBe('healthy');
    expect(result.checks.wallet.ok).toBe(true);
    expect(result.checks.address.ok).toBe(true);
    expect(result.checks.address.address).toBe(TESTNET_ADDRESS);
    expect(result.checks.api.ok).toBe(true);
  });

  it('returns correct network', async () => {
    const result = await healthCheck();

    expect(result.network).toBe(TESTNET_NETWORK);
  });

  it('returns server version', async () => {
    const result = await healthCheck();

    expect(result.version).toBe('0.3.0');
  });

  it('returns degraded when API is unreachable', async () => {
    const api = getApi(TESTNET_NETWORK);
    vi.spyOn(api, 'getFeeEstimate').mockRejectedValue(new Error('Network timeout'));

    const result = await healthCheck();

    expect(result.status).toBe('degraded');
    expect(result.checks.wallet.ok).toBe(true);
    expect(result.checks.address.ok).toBe(true);
    expect(result.checks.api.ok).toBe(false);
    expect(result.checks.api.error).toBe('Network timeout');
  });

  it('returns unhealthy when wallet is not configured', async () => {
    vi.spyOn(walletModule, 'getWallet').mockImplementation(() => {
      throw new Error('KASPA_PRIVATE_KEY or KASPA_MNEMONIC is required');
    });

    const result = await healthCheck();

    expect(result.status).toBe('unhealthy');
    expect(result.checks.wallet.ok).toBe(false);
    expect(result.checks.wallet.error).toBe('KASPA_PRIVATE_KEY or KASPA_MNEMONIC is required');
    expect(result.checks.address.ok).toBe(false);
    expect(result.checks.api.ok).toBe(false);
  });

  it('returns unhealthy when address derivation fails', async () => {
    const wallet = walletModule.getWallet();
    vi.spyOn(wallet, 'getAddress').mockImplementation(() => {
      throw new Error('HD derivation failed');
    });

    const result = await healthCheck();

    expect(result.status).toBe('unhealthy');
    expect(result.checks.wallet.ok).toBe(true);
    expect(result.checks.address.ok).toBe(false);
    expect(result.checks.address.error).toBe('HD derivation failed');
  });

  it('handles non-Error thrown from wallet', async () => {
    vi.spyOn(walletModule, 'getWallet').mockImplementation(() => {
      throw 'string error';  // eslint-disable-line no-throw-literal
    });

    const result = await healthCheck();

    expect(result.status).toBe('unhealthy');
    expect(result.checks.wallet.ok).toBe(false);
    expect(result.checks.wallet.error).toBe('string error');
  });

  it('handles non-Error thrown from API', async () => {
    const api = getApi(TESTNET_NETWORK);
    vi.spyOn(api, 'getFeeEstimate').mockRejectedValue(42);

    const result = await healthCheck();

    expect(result.status).toBe('degraded');
    expect(result.checks.api.ok).toBe(false);
    expect(result.checks.api.error).toBe('42');
  });
});
