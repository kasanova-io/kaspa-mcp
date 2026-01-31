#!/usr/bin/env node
// ABOUTME: MCP server entry point for Kaspa transactions
// ABOUTME: Registers all tools and starts the stdio transport

import './kaspa/setup.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

import { getMyAddress } from './tools/get-my-address.js';
import { getBalance } from './tools/get-balance.js';
import { getFeeEstimate } from './tools/get-fee-estimate.js';
import { sendKaspa } from './tools/send-kaspa.js';
import { getTransaction } from './tools/get-transaction.js';

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
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return {
      content: [{ type: 'text', text: `Error: ${errorMessage}` }],
      isError: true,
    };
  }
}

const server = new McpServer(
  {
    name: 'kaspa-mcp',
    version: '0.1.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.tool(
  'get_my_address',
  'Get the Kaspa address derived from the configured private key',
  async () => wrapToolHandler(() => getMyAddress())
);

server.tool(
  'get_balance',
  'Get balance for a Kaspa address (defaults to your wallet address)',
  {
    address: z.string().optional().describe('Kaspa address to check (optional, defaults to your address)'),
  },
  async (params) => wrapToolHandler(() => getBalance({ address: params.address }))
);

server.tool(
  'get_fee_estimate',
  'Get current fee estimates from the Kaspa network',
  async () => wrapToolHandler(() => getFeeEstimate())
);

server.tool(
  'send_kaspa',
  'Send KAS tokens to a recipient address',
  {
    to: z.string().describe('Recipient Kaspa address'),
    amount: z.string().describe('Amount to send in KAS'),
    priorityFee: z.number().optional().describe('Priority fee in sompi (optional)'),
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

server.tool(
  'get_transaction',
  'Get transaction status and details',
  {
    txId: z.string().describe('Transaction ID'),
  },
  async (params) => wrapToolHandler(() => getTransaction({ txId: params.txId }))
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Kaspa MCP server started');
}

main().catch((error) => {
  // Log only the message to prevent secret leakage in stack traces
  const safeMessage = error instanceof Error ? error.message : 'Unknown error';
  console.error('Fatal error:', safeMessage);
  process.exit(1);
});
