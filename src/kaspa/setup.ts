// ABOUTME: WebSocket polyfill setup for Node.js environment
// ABOUTME: Must be imported before any kaspa-wasm usage

import WebSocket from 'isomorphic-ws';
(globalThis as unknown as { WebSocket: typeof WebSocket }).WebSocket = WebSocket;
