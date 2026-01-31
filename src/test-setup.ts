// ABOUTME: Test setup file for vitest
// ABOUTME: Configures WebSocket polyfill and common mocks

import WebSocket from 'isomorphic-ws';
(globalThis as unknown as { WebSocket: typeof WebSocket }).WebSocket = WebSocket;
