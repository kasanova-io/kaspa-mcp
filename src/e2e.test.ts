// ABOUTME: End-to-end tests for Kaspa MCP server against real testnet
// ABOUTME: Tests MCP tool handlers, registration, and full tool flows

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import { wrapToolHandler } from './wrap-tool-handler.js';
import { TESTNET_ADDRESS, TESTNET_TX_ID } from './test-helpers.js';

describe('End-to-End Tests', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('wrapToolHandler', () => {
    it('wraps successful result in MCP format', async () => {
      const handler = async () => ({ address: 'kaspa:qptest' });

      const response = await wrapToolHandler(handler);

      expect(response.isError).toBeUndefined();
      expect(response.content).toHaveLength(1);
      expect(response.content[0].type).toBe('text');
      const parsed = JSON.parse(response.content[0].text);
      expect(parsed.address).toBe('kaspa:qptest');
    });

    it('wraps Error in MCP format with isError flag', async () => {
      const handler = async () => {
        throw new Error('Test error');
      };

      const response = await wrapToolHandler(handler);

      expect(response.isError).toBe(true);
      expect(response.content).toHaveLength(1);
      expect(response.content[0].text).toBe('Error: Test error');
    });

    it('wraps non-Error throws with descriptive message', async () => {
      const handler = async () => {
        throw 'string error';  // eslint-disable-line no-throw-literal
      };

      const response = await wrapToolHandler(handler);

      expect(response.isError).toBe(true);
      expect(response.content[0].text).toBe('Error: Unexpected error: string error');
    });
  });

  describe('MCP Server Tool Registration', () => {
    it('can create MCP server with tool capabilities', () => {
      const server = new McpServer(
        { name: 'test-kaspa-mcp', version: '0.1.0' },
        { capabilities: { tools: {} } }
      );

      expect(server).toBeDefined();
    });

    it('can register get_my_address tool', async () => {
      const server = new McpServer(
        { name: 'test-kaspa-mcp', version: '0.1.0' },
        { capabilities: { tools: {} } }
      );

      const { getMyAddress } = await import('./tools/get-my-address.js');

      server.tool(
        'get_my_address',
        'Get the Kaspa address derived from the configured private key',
        async () => wrapToolHandler(() => getMyAddress())
      );

      expect(server).toBeDefined();
    });

    it('can register get_balance tool with schema', async () => {
      const server = new McpServer(
        { name: 'test-kaspa-mcp', version: '0.1.0' },
        { capabilities: { tools: {} } }
      );

      const { getBalance } = await import('./tools/get-balance.js');

      server.tool(
        'get_balance',
        'Get balance for a Kaspa address',
        {
          address: z.string().optional().describe('Kaspa address to check'),
        },
        async (params) => wrapToolHandler(() => getBalance({ address: params.address }))
      );

      expect(server).toBeDefined();
    });

    it('can register send_kaspa tool with required params', async () => {
      const server = new McpServer(
        { name: 'test-kaspa-mcp', version: '0.1.0' },
        { capabilities: { tools: {} } }
      );

      const { sendKaspa } = await import('./tools/send-kaspa.js');

      server.tool(
        'send_kaspa',
        'Send KAS tokens',
        {
          to: z.string().describe('Recipient address'),
          amount: z.string().describe('Amount in KAS'),
          priorityFee: z.number().optional().describe('Priority fee in sompi'),
        },
        async (params) =>
          wrapToolHandler(() =>
            sendKaspa({
              to: params.to,
              amount: params.amount,
              priorityFee: params.priorityFee,
            })
          )
      );

      expect(server).toBeDefined();
    });
  });

  describe('Full Tool Flow E2E', () => {
    it('get_my_address returns valid testnet address', async () => {
      const { getMyAddress } = await import('./tools/get-my-address.js');

      const response = await wrapToolHandler(() => getMyAddress());

      expect(response.isError).toBeUndefined();
      const result = JSON.parse(response.content[0].text);
      expect(result.address).toBe(TESTNET_ADDRESS);
    });

    it('get_balance returns formatted balance', async () => {
      const { getBalance } = await import('./tools/get-balance.js');

      const response = await wrapToolHandler(() => getBalance({}));

      expect(response.isError).toBeUndefined();
      const result = JSON.parse(response.content[0].text);
      expect(Number(result.balance)).toBeGreaterThanOrEqual(0);
    });

    it('get_fee_estimate returns all fee tiers', async () => {
      const { getFeeEstimate } = await import('./tools/get-fee-estimate.js');

      const response = await wrapToolHandler(() => getFeeEstimate());

      expect(response.isError).toBeUndefined();
      const result = JSON.parse(response.content[0].text);
      expect(Number(result.priorityFee)).toBeGreaterThan(0);
      expect(result.normalFee).toBeDefined();
      expect(result.lowFee).toBeDefined();
    });

    it('get_transaction returns transaction status', async () => {
      const { getTransaction } = await import('./tools/get-transaction.js');

      const response = await wrapToolHandler(() => getTransaction({ txId: TESTNET_TX_ID }));

      expect(response.isError).toBeUndefined();
      const result = JSON.parse(response.content[0].text);
      expect(result.txId).toBe(TESTNET_TX_ID);
      expect(result.accepted).toBe(true);
      expect(result.outputs.length).toBeGreaterThan(0);
    });

    it('send_kaspa validation error returns isError', async () => {
      const { sendKaspa } = await import('./tools/send-kaspa.js');

      const response = await wrapToolHandler(() =>
        sendKaspa({ to: 'invalid', amount: '1' })
      );

      expect(response.isError).toBe(true);
      expect(response.content[0].text).toContain('Invalid Kaspa address');
    });
  });

  describe('Error Handling E2E', () => {
    it('API error is handled gracefully', async () => {
      const { getApi } = await import('./kaspa/api.js');
      const { getFeeEstimate } = await import('./tools/get-fee-estimate.js');

      const api = getApi('testnet-10');
      vi.spyOn(api, 'getFeeEstimate').mockRejectedValue(new Error('Network timeout'));

      const response = await wrapToolHandler(() => getFeeEstimate());

      expect(response.isError).toBe(true);
      expect(response.content[0].text).toContain('Network timeout');
    });

    it('missing txId parameter returns error', async () => {
      const { getTransaction } = await import('./tools/get-transaction.js');

      const response = await wrapToolHandler(() => getTransaction({ txId: '' }));

      expect(response.isError).toBe(true);
      expect(response.content[0].text).toContain('Transaction ID (txId) is required');
    });
  });
});
