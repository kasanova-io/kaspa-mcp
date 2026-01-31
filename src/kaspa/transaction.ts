// ABOUTME: Transaction building and submission module
// ABOUTME: Uses kaspa-wasm Generator for KIP-9 compliant transaction creation

import * as kaspa from 'kaspa-wasm';
import { getApi } from './api.js';
import { getWallet } from './wallet.js';

const {
  Generator,
  RpcClient,
  Resolver,
  Encoding,
  sompiToKaspaString,
  Address,
} = kaspa;

export interface SendResult {
  txId: string;
  fee: string;
}

export async function sendKaspa(
  to: string,
  amountSompi: bigint,
  priorityFee: bigint = 0n
): Promise<SendResult> {
  const wallet = getWallet();
  const senderAddress = wallet.getAddress();
  const api = getApi(wallet.getNetworkId());

  const rpc = new RpcClient({
    resolver: new Resolver(),
    encoding: Encoding.Borsh,
    networkId: wallet.getNetworkId(),
  });

  await rpc.connect({});

  try {
    const { isSynced } = await rpc.getServerInfo();
    if (!isSynced) {
      throw new Error('RPC node is not synced');
    }

    // Fetch UTXOs via RPC - returns properly formatted UtxoEntry objects
    const { entries } = await rpc.getUtxosByAddresses([new Address(senderAddress)]);

    if (!entries || entries.length === 0) {
      throw new Error('No UTXOs available');
    }

    // Check balance
    const feeEstimate = await api.getFeeEstimate();
    const totalBalance = entries.reduce((sum: bigint, e: { amount: bigint }) => sum + e.amount, 0n);
    const estimatedFee = BigInt(Math.ceil(feeEstimate.priorityBucket.feerate * 3000));
    const totalRequired = amountSompi + estimatedFee + priorityFee;

    if (totalBalance < totalRequired) {
      throw new Error(
        `Insufficient balance: have ${sompiToKaspaString(totalBalance)} KAS, need ~${sompiToKaspaString(totalRequired)} KAS (including estimated fees)`
      );
    }

    // Sort UTXOs by amount (smallest first for efficient UTXO consolidation)
    entries.sort((a: { amount: bigint }, b: { amount: bigint }) => (a.amount > b.amount ? 1 : -1));

    // Create generator with RPC-provided UTXOs
    const generator = new Generator({
      entries,
      outputs: [{ address: to, amount: amountSompi }],
      priorityFee,
      changeAddress: senderAddress,
      networkId: wallet.getNetworkId(),
    });

    let pending: kaspa.PendingTransaction | undefined;
    let lastTxId = '';

    while ((pending = await generator.next())) {
      await pending.sign([wallet.getPrivateKey()]);
      lastTxId = await pending.submit(rpc);
    }

    const summary = generator.summary();

    return {
      txId: lastTxId,
      fee: sompiToKaspaString(summary.fees).toString(),
    };
  } finally {
    await rpc.disconnect();
  }
}
