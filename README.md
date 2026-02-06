# Kaspa MCP

MCP server for sending KAS on the Kaspa blockDAG.

## About Kaspa

[Kaspa](https://kaspa.org) is a fast, scalable Layer-1 cryptocurrency built on proof-of-work (PoW) and powered by the GHOSTDAG protocol — a novel consensus mechanism that extends Nakamoto's original design. Unlike traditional blockchains that discard competing blocks, GHOSTDAG allows parallel blocks to coexist and orders them within a Directed Acyclic Graph (blockDAG), enabling high throughput while preserving decentralization and security.

**Key Features:**
- **10 blocks per second** with sub-second finality (Crescendo upgrade, May 2025)
- **Proof of Work** using kHeavyHash algorithm
- **Fair launch** - no premine, no ICO, no token allocations
- **Decentralized** - runs on standard hardware

## Installation

```bash
npm install
npm run build
```

## Configuration

Set these environment variables:

| Variable | Required | Description |
|----------|----------|-------------|
| `KASPA_MNEMONIC` | Yes* | BIP39 mnemonic phrase (24 words) |
| `KASPA_PRIVATE_KEY` | Yes* | Hex-encoded private key (alternative to mnemonic) |
| `KASPA_NETWORK` | No | Network: `mainnet`, `testnet-10`, `testnet-11`. Defaults to `mainnet` |
| `KASPA_ACCOUNT_INDEX` | No | BIP44 account index when using mnemonic. Defaults to `0` |

*Either `KASPA_MNEMONIC` or `KASPA_PRIVATE_KEY` must be set.

## Usage with Claude Desktop

Add to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "kaspa": {
      "command": "npx",
      "args": ["kaspa-mcp"],
      "env": {
        "KASPA_MNEMONIC": "your twenty four word mnemonic phrase here ...",
        "KASPA_NETWORK": "mainnet"
      }
    }
  }
}
```

## Tools

### `generate_mnemonic`
Generate a new BIP39 mnemonic phrase and derive the corresponding Kaspa wallet address.

**Parameters:**
- `wordCount` (optional): Number of words - 12 or 24 (default: 12)
- `network` (optional): Network for address derivation - `mainnet`, `testnet-10`, or `testnet-11` (default: mainnet)

**Returns:**
```typescript
{
  mnemonic: string,    // The generated BIP39 mnemonic phrase
  address: string,     // Derived Kaspa address (account 0)
  network: string,     // Network used
  warning: string      // Security reminder
}
```

**Important:** The mnemonic is generated using cryptographically secure randomness. Save it securely - it cannot be recovered if lost.

### `get_my_address`
Get the Kaspa address derived from your configured private key or mnemonic.

**Returns:** `{ address: string }`

### `get_balance`
Get balance for a Kaspa address.

**Parameters:**
- `address` (optional): Address to check. Defaults to your wallet address.

**Returns:** `{ address: string, balance: string, utxoCount: number }`

### `get_fee_estimate`
Get current fee estimates from the network.

**Returns:** `{ priorityFee: string, normalFee: string, lowFee: string }`

### `send_kaspa`
Send KAS tokens to a recipient.

**Parameters:**
- `to`: Recipient Kaspa address (must match wallet network)
- `amount`: Amount in KAS as string (e.g., "10.5", max 8 decimal places)
- `priorityFee` (optional): Priority fee in sompi

**Returns:** `{ txId: string, fee: string }`

**Validations:**
- Address format and network prefix validation
- Amount must be a valid positive decimal number
- Maximum 8 decimal places (1 sompi = 0.00000001 KAS)
- Insufficient balance check before broadcast

### `get_transaction`
Get transaction details including inputs and outputs.

**Parameters:**
- `txId`: Transaction ID

**Returns:**
```typescript
{
  txId: string,
  accepted: boolean,
  blockHash?: string,
  blockTime?: number,
  inputs: Array<{ transactionId: string, index: number }>,
  outputs: Array<{ index: number, amount: string, address: string }>
}
```

## Example

![Demo of kaspa-mcp in Claude Code](https://raw.githubusercontent.com/kasanova-io/kaspa-mcp/main/assets/demo.png)

### Test Prompts

Try these prompts to verify your MCP is working:

```
"Generate a new Kaspa wallet for me"
```

```
"What is my Kaspa address?"
```

```
"How much KAS do I have?"
```

```
"What are the current network fees?"
```

```
"Send 5 KAS to kaspa:qz..."
```

The MCP will:
1. Validate the recipient address matches your network
2. Check your balance is sufficient
3. Build the transaction with KIP-9 compliant fees
4. Sign with your private key
5. Broadcast to the network via public nodes
6. Return the transaction ID

## Technical Details

- Uses [kaspa-wasm](https://github.com/aspect-build/aspect-cli) for cryptographic operations
- Connects to public nodes via Resolver for automatic node discovery
- Implements BIP44 derivation path `m/44'/111111'/account'` for mnemonic wallets
- Transaction building uses Generator for KIP-9 compliant UTXO management

## Security

- Private keys and mnemonics are only used locally for signing
- Keys are never sent to any external service
- Error messages are sanitized to prevent secret leakage
- All transactions require explicit user action via MCP tools

## Testing

```bash
npm test
```

The test suite includes deterministic test vectors based on the [Kaspium wallet](https://github.com/aspect-build/kaspium_wallet) for cross-implementation verification. Test vectors are stored in `src/kaspa/test-vectors.json` and include:

- Standard BIP39 test mnemonics (12 and 24 words)
- Known private key → address derivations
- Invalid input validation

These vectors ensure that key derivation is consistent across Kaspa wallet implementations using the BIP44 path `m/44'/111111'/account'/0/0`.

**Note:** Coin type `111111` is Kaspa's de-facto standard, used by rusty-kaspa (official node), Kaspium, and kaspa-wasm. While not formally registered in SLIP-0044, it is the established ecosystem convention.

## Networks

| Network | Address Prefix | API Endpoint |
|---------|---------------|--------------|
| `mainnet` | `kaspa:` | api.kaspa.org |
| `testnet-10` | `kaspatest:` | api-tn10.kaspa.org |
| `testnet-11` | `kaspatest:` | api-tn11.kaspa.org |

## License

ISC
