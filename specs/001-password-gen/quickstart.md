# Developer Quickstart: Password Generation Web App

**Feature**: 001-password-gen  
**Branch**: `001-password-gen`  
**Last Updated**: 2025-12-17

## Overview

Single-page web application for generating secure passwords and passphrases with local history storage. Built with Vite, TypeScript, and browser-based SQLite.

## Prerequisites

- **Node.js**: v18 or higher
- **npm**: v9 or higher (or yarn/pnpm equivalent)
- **Modern Browser**: Chrome 90+, Firefox 88+, Safari 14+, or Edge 90+
- **Git**: For version control

## Quick Start

### 1. Clone and Setup

```bash
# Ensure you're on the feature branch
git checkout 001-password-gen

# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:5173`

### 2. Project Structure

```
src/
├── models/              # Data models (PasswordConfig, PassphraseConfig, etc.)
├── services/            # Business logic (generators, database, clipboard)
├── components/          # UI components (Password Form, Passphrase Form, History)
├── styles/              # CSS files (main.css, forms.css, history.css)
├── assets/              # Static assets (wordlist.json)
├── main.ts              # Application entry point
└── index.html           # Single-page HTML

tests/
├── unit/                # Unit tests for services
├── integration/         # End-to-end flow tests
└── accessibility/       # Accessibility compliance tests

specs/001-password-gen/
├── spec.md              # Feature specification
├── plan.md              # Implementation plan (this phase)
├── research.md          # Technical research
├── data-model.md        # Entity definitions
└── contracts/           # TypeScript interfaces
```

### 3. Development Commands

```bash
# Start dev server with hot module reload
npm run dev

# Run all tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run accessibility tests specifically
npm run test:a11y

# Build for production
npm run build

# Preview production build
npm run preview

# Type-check without building
npm run type-check

# Lint code
npm run lint
```

## Key Concepts

### Password Generation

Passwords are generated using the Web Crypto API for cryptographically secure randomness. The generator ensures:

1. **Character pools**: Based on selected types (uppercase, lowercase, numbers, special chars)
2. **Minimum requirements**: Guaranteed minimum counts of specific character types
3. **Fisher-Yates shuffle**: Unbiased randomization of character positions

See [research.md](./research.md#2-password-generation-algorithm) for detailed algorithm.

### Passphrase Generation

Passphrases use random words from the EFF Long Wordlist (7,776 words):

1. **Word selection**: Cryptographically random selection from wordlist
2. **Uppercase option**: Capitalize first letter of each word
3. **Numbers option**: Append random numbers to each word
4. **Custom separator**: Join words with user-defined character(s)

See [research.md](./research.md#3-passphrase-word-list) for wordlist details.

### Local Storage

Uses sql.js (SQLite compiled to WebAssembly) for structured data storage:

1. **In-memory database**: Fast operations (<10ms queries)
2. **IndexedDB persistence**: Automatic backup every 10 credentials
3. **Schema versioning**: Migration support for future changes

See [data-model.md](./data-model.md) for database schema.

## Development Workflow

### 1. Implementing a New Feature

```bash
# 1. Ensure tests exist (TDD approach)
# Create test file in tests/unit/ or tests/integration/

# 2. Run tests (they should fail)
npm run test

# 3. Implement feature
# Edit files in src/

# 4. Run tests again (they should pass)
npm run test

# 5. Check test coverage
npm run test:coverage

# 6. Commit changes
git add .
git commit -m "feat: add password generation service"
```

### 2. Testing Accessibility

```bash
# Run accessibility tests
npm run test:a11y

# Manual keyboard testing:
# 1. Open app in browser (npm run dev)
# 2. Use Tab key to navigate through all interactive elements
# 3. Use Space/Enter to activate buttons/checkboxes
# 4. Ensure all functionality is keyboard-accessible

# Use browser DevTools Accessibility Inspector:
# 1. Open DevTools > Accessibility tab
# 2. Inspect ARIA attributes
# 3. Check color contrast ratios
# 4. Verify semantic HTML structure
```

### 3. Responsive Design Testing

```bash
# Development server supports device emulation
npm run dev

# In browser DevTools:
# 1. Open Responsive Design Mode (Cmd+Opt+M on Mac, Ctrl+Shift+M on Windows)
# 2. Test at breakpoints: 320px, 768px, 1024px, 1920px, 2560px
# 3. Toggle between portrait and landscape
# 4. Verify touch targets are 44x44px minimum
```

## Configuration Files

### vite.config.ts

```typescript
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    target: 'es2022',
    minify: 'terser',
    rollupOptions: {
      output: {
        manualChunks: {
          'sql-js': ['sql.js'],
          'wordlist': ['./src/assets/wordlist.json']
        }
      }
    }
  }
});
```

### vitest.config.ts

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      lines: 80,
      functions: 80,
      branches: 80,
      statements: 80
    }
  }
});
```

### tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "lib": ["ES2022", "DOM"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

## Common Tasks

### Adding a New Service

1. Define interface in `specs/001-password-gen/contracts/`
2. Create implementation in `src/services/`
3. Create tests in `tests/unit/`
4. Export from `src/services/index.ts`

```typescript
// specs/001-password-gen/contracts/myService.ts
export interface IMyService {
  doSomething(): void;
}

// src/services/myService.ts
import type { IMyService } from '../../specs/001-password-gen/contracts/myService';

export class MyService implements IMyService {
  doSomething(): void {
    // Implementation
  }
}

// tests/unit/myService.test.ts
import { describe, it, expect } from 'vitest';
import { MyService } from '../../src/services/myService';

describe('MyService', () => {
  it('should do something', () => {
    const service = new MyService();
    service.doSomething();
    // Assertions
  });
});
```

### Adding a New UI Component

1. Define interface in `specs/001-password-gen/contracts/components.ts`
2. Create HTML structure in `src/index.html`
3. Create component logic in `src/components/`
4. Create styles in `src/styles/`
5. Create tests in `tests/integration/` and `tests/accessibility/`

```html
<!-- src/index.html -->
<div id="my-component" class="my-component">
  <button aria-label="Do something">Click me</button>
</div>
```

```typescript
// src/components/MyComponent.ts
import type { IMyComponent } from '../../specs/001-password-gen/contracts/components';

export class MyComponent implements IMyComponent {
  private element: HTMLElement;
  
  constructor(elementId: string) {
    this.element = document.getElementById(elementId)!;
    this.attachEventListeners();
  }
  
  private attachEventListeners(): void {
    const button = this.element.querySelector('button')!;
    button.addEventListener('click', () => this.handleClick());
  }
  
  private handleClick(): void {
    // Implementation
  }
}
```

```css
/* src/styles/my-component.css */
.my-component {
  display: flex;
  gap: var(--space-md);
}

.my-component button {
  min-width: var(--touch-target);
  min-height: var(--touch-target);
}
```

## Troubleshooting

### Issue: SQLite not loading

**Symptoms**: "Cannot find sql-wasm.wasm" error

**Solution**:
```bash
# Ensure sql-wasm.wasm is in public/ directory
cp node_modules/sql.js/dist/sql-wasm.wasm public/

# Verify Vite config has correct locateFile path
```

### Issue: Tests failing with "localStorage not defined"

**Symptoms**: Test errors mentioning localStorage

**Solution**:
```typescript
// Add to vitest.config.ts
export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts']
  }
});

// tests/setup.ts
global.localStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
} as any;
```

### Issue: Accessibility tests failing

**Symptoms**: axe-core violations reported

**Solution**:
1. Check ARIA labels on all interactive elements
2. Verify color contrast ratios (use browser DevTools)
3. Ensure proper heading hierarchy (h1 > h2 > h3)
4. Add alt text to images
5. Ensure form inputs have associated labels

### Issue: Bundle size too large

**Symptoms**: Build output > 5MB

**Solution**:
```bash
# Analyze bundle
npm run build -- --stats

# Check for unnecessary dependencies
npm run build -- --analyze

# Optimize imports (use named imports)
# Before: import _ from 'lodash';
# After: import { debounce } from 'lodash';
```

## Constitution Compliance Checklist

Before committing code, verify:

- [ ] **Accessibility**: All interactive elements have ARIA labels
- [ ] **Accessibility**: Keyboard navigation works for all functionality
- [ ] **Accessibility**: Color contrast meets WCAG 2.1 AA
- [ ] **Readability**: Code has clear variable/function names
- [ ] **Readability**: Complex logic has explanatory comments
- [ ] **Responsive Design**: Tested at 320px, 768px, 1024px+
- [ ] **Testing**: Unit test coverage ≥ 80%
- [ ] **Testing**: Accessibility tests pass 100%
- [ ] **Safety**: Changes committed before major refactoring

## Resources

- [Feature Specification](./spec.md) - User requirements and acceptance criteria
- [Implementation Plan](./plan.md) - Technical approach and architecture
- [Technical Research](./research.md) - Decisions and alternatives considered
- [Data Model](./data-model.md) - Entity definitions and database schema
- [Contracts](./contracts/) - TypeScript interface definitions
- [Constitution](../../.specify/memory/constitution.md) - Project principles and standards

## Next Steps

After completing Phase 1 (planning), proceed to:

1. Run `/speckit.tasks` to generate task breakdown
2. Implement tasks in order of priority (P1 → P2 → P3)
3. Ensure all tests pass before marking tasks complete
4. Submit PR when all acceptance criteria met

## Getting Help

- Check [research.md](./research.md) for technical decisions
- Review [contracts/](./contracts/) for interface definitions
- Consult [data-model.md](./data-model.md) for entity relationships
- Refer to [constitution](../../.specify/memory/constitution.md) for project standards
