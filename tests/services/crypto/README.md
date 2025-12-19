# Cryptography Service Tests

This directory contains unit tests for cryptography-related services:

- **CryptoService** - Password hashing, encryption, decryption, key derivation
- **TotpService** - TOTP token generation, validation, backup codes, QR codes

## Test Coverage Goals

- ✅ Unit tests for all cryptographic operations
- ✅ Encryption/decryption round-trip tests
- ✅ Key derivation performance tests
- ✅ TOTP token validation with time drift
- ✅ Error handling for invalid inputs

## Running Tests

```bash
# Run all crypto service tests
npm test -- tests/services/crypto

# Run with coverage
npm run test:coverage -- tests/services/crypto

# Watch mode
npm run test:watch -- tests/services/crypto
```

## Test Files

- `CryptoService.test.ts` - Password hashing, encryption, key derivation
- `TotpService.test.ts` - TOTP generation, validation, backup codes
