# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2025-01-30

### Added
- Initial release
- MCP server for Kaspa transactions via Claude Desktop
- `get_my_address` - Get wallet address from configured key
- `get_balance` - Check balance for any Kaspa address
- `get_fee_estimate` - Get current network fee estimates
- `send_kaspa` - Send KAS tokens with validation
- `get_transaction` - Check transaction status and details
- Support for mainnet, testnet-10, and testnet-11
- BIP39 mnemonic and raw private key support
- BIP44 derivation path m/44'/111111'/account'
- Comprehensive input validation
- Security-focused error handling (no secret leakage)
