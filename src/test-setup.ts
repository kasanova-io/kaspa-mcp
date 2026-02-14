// ABOUTME: Test setup file for vitest
// ABOUTME: Configures WebSocket polyfill and testnet environment

import WebSocket from 'isomorphic-ws';
(globalThis as unknown as { WebSocket: typeof WebSocket }).WebSocket = WebSocket;

process.env.KASPA_NETWORK = 'testnet-10';
if (!process.env.KASPA_MNEMONIC) {
  process.env.KASPA_MNEMONIC =
    'matter client cigar north mixed hard rail kitten flat shrug view group diagram release goose thumb benefit fire confirm swamp skill merry genre visa';
}
