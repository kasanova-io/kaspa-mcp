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
import { generateMnemonic } from './tools/generate-mnemonic.js';
import { healthCheck } from './tools/health-check.js';
import { wrapToolHandler } from './wrap-tool-handler.js';

const server = new McpServer(
  {
    name: 'kaspa-mcp',
    version: '0.3.2',
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
    payload: z.string().optional().describe('Hex-encoded transaction payload (optional)'),
  },
  async (params) =>
    wrapToolHandler(() =>
      sendKaspa({
        to: params.to,
        amount: params.amount,
        priorityFee: params.priorityFee,
        payload: params.payload,
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

server.tool(
  'generate_mnemonic',
  'Generate a new BIP39 mnemonic phrase and derive the corresponding Kaspa wallet address. Use this to create a new wallet.',
  {
    wordCount: z.union([z.literal(12), z.literal(24)]).optional().describe('Number of words (12 or 24, default: 12)'),
    network: z.enum(['mainnet', 'testnet-10', 'testnet-11']).optional().describe('Network for address derivation (default: mainnet)'),
  },
  async (params) =>
    wrapToolHandler(() =>
      generateMnemonic({
        wordCount: params.wordCount,
        network: params.network,
      })
    )
);

server.tool(
  'health_check',
  'Check server health: wallet config, address derivation, and API connectivity',
  async () => wrapToolHandler(() => healthCheck())
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
