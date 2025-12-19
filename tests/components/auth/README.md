# Authentication Component Tests

This directory contains unit and integration tests for authentication UI components:

- **LoginForm** - User login interface and validation
- **RegisterForm** - User registration with password strength checking
- **TotpSetupModal** - 2FA setup with QR code display
- **PasswordConfirmationDialog** - Password confirmation for sensitive actions
- **DeleteAccountModal** - Account deletion workflow

## Test Coverage Goals

- ✅ Unit tests for component logic
- ✅ Form validation and error handling
- ✅ User interaction flows
- ✅ Accessibility tests (WCAG 2.1 AA)
- ✅ Integration tests for complete auth flows

## Running Tests

```bash
# Run all auth component tests
npm test -- tests/components/auth

# Run with coverage
npm run test:coverage -- tests/components/auth

# Run accessibility tests
npm run test:a11y -- tests/components/auth

# Watch mode
npm run test:watch -- tests/components/auth
```

## Test Files

- `LoginForm.test.ts` - Login form validation and submission
- `RegisterForm.test.ts` - Registration form and password strength
- `TotpSetupModal.test.ts` - 2FA setup workflow
- `PasswordConfirmationDialog.test.ts` - Password confirmation dialog
- `DeleteAccountModal.test.ts` - Account deletion confirmation
