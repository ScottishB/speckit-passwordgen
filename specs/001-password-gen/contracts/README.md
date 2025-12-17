# API Contracts Documentation

**Feature**: 001-password-gen  
**Date**: 2025-12-17  
**Purpose**: TypeScript interface contracts for all services and components

## Overview

This directory contains TypeScript interface definitions that serve as contracts between different parts of the application. These interfaces define the API surface without implementation details.

## Files

### models.ts
Core data models and value objects:
- `PasswordConfig` - Configuration for password generation
- `PassphraseConfig` - Configuration for passphrase generation
- `GeneratedCredential` - Stored credential with metadata
- `HistoryEntry` - View model for display
- `ClipboardResult` - Result of clipboard operations
- `ValidationResult` - Result of validation operations

### generators.ts
Generation service interfaces:
- `IPasswordGenerator` - Password generation service
- `IPassphraseGenerator` - Passphrase generation service

### database.ts
Data persistence interfaces:
- `IDatabase` - SQLite database operations
- `IHistoryService` - History management operations

### clipboard.ts
Clipboard operation interface:
- `IClipboardService` - Copy to clipboard with fallback

### components.ts
UI component interfaces:
- `IPasswordFormComponent` - Password tab component
- `IPassphraseFormComponent` - Passphrase tab component
- `IHistoryListComponent` - History display component
- `IAppComponent` - Main application component

## Usage

These contracts should be imported and implemented by the corresponding TypeScript modules in `src/`:

```typescript
// src/services/passwordGenerator.ts
import type { IPasswordGenerator } from '../contracts/generators';
import type { PasswordConfig, ValidationResult } from '../contracts/models';

export class PasswordGenerator implements IPasswordGenerator {
  generate(config: PasswordConfig): string {
    // Implementation
  }
  
  validate(config: PasswordConfig): ValidationResult {
    // Implementation
  }
  
  getDefaultConfig(): PasswordConfig {
    // Implementation
  }
}
```

## Design Principles

1. **Interface Segregation**: Each interface has a single, focused responsibility
2. **Dependency Inversion**: Components depend on interfaces, not concrete implementations
3. **Explicit Contracts**: All public methods documented with JSDoc
4. **Type Safety**: Strong typing with TypeScript for compile-time guarantees
5. **Testability**: Interfaces enable easy mocking for unit tests

## Testing

Each interface can be tested independently by creating mock implementations:

```typescript
// tests/mocks/MockPasswordGenerator.ts
import type { IPasswordGenerator } from '../../contracts/generators';

export class MockPasswordGenerator implements IPasswordGenerator {
  generate = vi.fn().mockReturnValue('MockPassword123!');
  validate = vi.fn().mockReturnValue({ isValid: true, errors: [] });
  getDefaultConfig = vi.fn().mockReturnValue({ /* defaults */ });
}
```

## Constitutional Alignment

These contracts align with project constitution principles:

- **Readability**: Clear, documented interfaces with descriptive names
- **Testing**: Interfaces enable 80%+ test coverage through mocking
- **Accessibility**: Component interfaces include keyboard and ARIA requirements
- **Safety**: Type-safe contracts prevent runtime errors

## Next Steps

Implementations of these interfaces will be created in Phase 2 (implementation) as part of the task list.
