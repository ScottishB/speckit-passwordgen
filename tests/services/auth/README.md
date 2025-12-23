# Authentication Service Tests

This directory contains unit tests for authentication-related services:

- **AuthService** - User registration, login, logout, account deletion
- **SessionService** - Session management, timeout handling, expiration checks
- **SecurityLogService** - Security event logging and retrieval

## Test Coverage Goals

- ✅ Unit tests for all service methods
- ✅ Error handling and validation
- ✅ Edge cases (account lockout, session expiration, etc.)
- ✅ Integration tests for auth flows

## Running Tests

```bash
# Run all auth service tests
npm test -- tests/services/auth

# Run with coverage
npm run test:coverage -- tests/services/auth

# Watch mode
npm run test:watch -- tests/services/auth
```

## Test Files

- `AuthService.test.ts` - User authentication and account management
- `SessionService.test.ts` - Session lifecycle and timeout handling
- `SecurityLogService.test.ts` - Security event logging
