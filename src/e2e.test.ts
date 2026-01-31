// ABOUTME: End-to-end tests for Kaspa MCP server
// ABOUTME: Tests the MCP server tool handlers with real wallet operations

import { describe, it, expect, vi, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

// Valid test mnemonic (24 words)
const TEST_MNEMONIC = 'matter client cigar north mixed hard rail kitten flat shrug view group diagram release goose thumb benefit fire confirm swamp skill merry genre visa';

// Simulate the tool response wrapper from index.ts
type ToolResponse = {
  content: Array<{ type: 'text'; text: string }>;
  isError?: boolean;
};

async function wrapToolHandler<T>(handler: () => Promise<T>): Promise<ToolResponse> {
  try {
    const result = await handler();
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  } catch (error) {
    return {
      content: [{ type: 'text', text: `Error: ${error}` }],
      isError: true,
    };
  }
}

describe('End-to-End Tests', () => {
  const mockFetch = vi.fn();
  const originalFetch = globalThis.fetch;
  const originalEnv = process.env;

  beforeAll(() => {
    process.env = {
      ...originalEnv,
      KASPA_MNEMONIC: TEST_MNEMONIC,
      KASPA_NETWORK: 'mainnet',
    };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  beforeEach(() => {
    globalThis.fetch = mockFetch;
    mockFetch.mockReset();
    vi.resetModules();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
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

    it('wraps error in MCP format with isError flag', async () => {
      const handler = async () => {
        throw new Error('Test error');
      };

      const response = await wrapToolHandler(handler);

      expect(response.isError).toBe(true);
      expect(response.content).toHaveLength(1);
      expect(response.content[0].text).toContain('Error:');
      expect(response.content[0].text).toContain('Test error');
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
    it('get_my_address returns valid mainnet address', async () => {
      const { getMyAddress } = await import('./tools/get-my-address.js');

      const response = await wrapToolHandler(() => getMyAddress());

      expect(response.isError).toBeUndefined();
      const result = JSON.parse(response.content[0].text);
      expect(result.address).toMatch(/^kaspa:/);
    });

    it('get_balance returns formatted balance', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ balance: '10000000000' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([{ utxo: 1 }, { utxo: 2 }, { utxo: 3 }]),
        });

      const { getBalance } = await import('./tools/get-balance.js');

      const response = await wrapToolHandler(() => getBalance({}));

      expect(response.isError).toBeUndefined();
      const result = JSON.parse(response.content[0].text);
      expect(result.balance).toBe('100');
      expect(result.utxoCount).toBe(3);
    });

    it('get_fee_estimate returns all fee tiers', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            priorityBucket: { feerate: 2.0 },
            normalBuckets: [{ feerate: 1.5 }],
            lowBuckets: [{ feerate: 1.0 }],
          }),
      });

      const { getFeeEstimate } = await import('./tools/get-fee-estimate.js');

      const response = await wrapToolHandler(() => getFeeEstimate());

      expect(response.isError).toBeUndefined();
      const result = JSON.parse(response.content[0].text);
      expect(result.priorityFee).toBe('2');
      expect(result.normalFee).toBe('1.5');
      expect(result.lowFee).toBe('1');
    });

    it('get_transaction returns transaction status', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            transaction_id: 'txid123',
            is_accepted: true,
            block_hash: ['hash1'],
            block_time: 1234567890,
            inputs: [{ previous_outpoint_hash: 'prev_tx', previous_outpoint_index: 0 }],
            outputs: [{ amount: '10000000000', script_public_key_address: 'kaspa:qptest' }],
          }),
      });

      const { getTransaction } = await import('./tools/get-transaction.js');

      const response = await wrapToolHandler(() => getTransaction({ txId: 'txid123' }));

      expect(response.isError).toBeUndefined();
      const result = JSON.parse(response.content[0].text);
      expect(result.txId).toBe('txid123');
      expect(result.accepted).toBe(true);
      expect(result.outputs).toHaveLength(1);
      expect(result.outputs[0].address).toBe('kaspa:qptest');
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
    it('API timeout is handled gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network timeout'));

      const { getFeeEstimate } = await import('./tools/get-fee-estimate.js');

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
