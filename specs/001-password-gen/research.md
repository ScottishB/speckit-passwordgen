# Technical Research: Password Generation Web App

**Feature**: 001-password-gen  
**Date**: 2025-12-17  
**Purpose**: Resolve technical unknowns and document best practices for implementation

## Research Areas

### 1. Browser-Based SQLite Storage

**Question**: How to implement SQLite in a browser environment for local persistence?

**Decision**: Use sql.js library

**Rationale**:
- sql.js is SQLite compiled to WebAssembly, runs entirely in browser
- No server dependencies - meets offline-capable requirement
- Full SQL.ite feature set available
- Mature library (~9k GitHub stars) with active maintenance
- Can persist to IndexedDB or export/import binary database files

**Implementation Approach**:
```typescript
import initSqlJs from 'sql.js';

// Initialize SQLite
const SQL = await initSqlJs({
  locateFile: file => `/sql-wasm.wasm`
});

// Load existing database from IndexedDB or create new
const db = new SQL.Database(existingData || undefined);

// Create schema
db.run(`
  CREATE TABLE IF NOT EXISTS generated_credentials (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    value TEXT NOT NULL,
    timestamp INTEGER NOT NULL,
    config TEXT NOT NULL
  )
`);
```

**Alternatives Considered**:
- **IndexedDB directly**: Rejected because requires complex query logic; SQL provides better query capabilities
- **LocalStorage**: Rejected due to 5-10MB size limits and lack of structured query support
- **better-sqlite3**: Rejected because it's Node.js only, not browser-compatible

**Performance Considerations**:
- sql.js WASM binary is ~1.5MB (within 5MB bundle budget)
- In-memory operations are fast (<10ms for simple queries)
- Persist to IndexedDB periodically to prevent data loss
- Export binary on each change (database.export()) for backup

---

### 2. Password Generation Algorithm

**Question**: What's the best practice for generating cryptographically secure random passwords with character type constraints?

**Decision**: Use Web Crypto API (`crypto.getRandomValues()`) with Fisher-Yates shuffle algorithm

**Rationale**:
- `crypto.getRandomValues()` provides cryptographically secure random numbers (CSPRNG)
- Browser-native, no dependencies
- Fisher-Yates ensures unbiased selection from character pools
- Meets requirement to guarantee minimum character counts

**Implementation Approach**:
```typescript
function generatePassword(config: PasswordConfig): string {
  // Build character pools
  const pools: string[] = [];
  if (config.uppercase) pools.push('ABCDEFGHIJKLMNOPQRSTUVWXYZ');
  if (config.lowercase) pools.push('abcdefghijklmnopqrstuvwxyz');
  if (config.numbers) pools.push('0123456789');
  if (config.specialChars) pools.push('!@#$%^&*()_+-=[]{}|;:,.<>?');
  
  // Ensure minimum requirements first
  const chars: string[] = [];
  if (config.numbers) {
    for (let i = 0; i < config.minNumbers; i++) {
      chars.push(getRandomChar('0123456789'));
    }
  }
  if (config.specialChars) {
    for (let i = 0; i < config.minSpecialChars; i++) {
      chars.push(getRandomChar('!@#$%^&*()_+-=[]{}|;:,.<>?'));
    }
  }
  
  // Fill remaining with random selection from all pools
  const allChars = pools.join('');
  while (chars.length < config.length) {
    chars.push(getRandomChar(allChars));
  }
  
  // Fisher-Yates shuffle to randomize positions
  for (let i = chars.length - 1; i > 0; i--) {
    const j = crypto.getRandomValues(new Uint32Array(1))[0] % (i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  
  return chars.join('');
}

function getRandomChar(pool: string): string {
  const randomIndex = crypto.getRandomValues(new Uint32Array(1))[0] % pool.length;
  return pool[randomIndex];
}
```

**Alternatives Considered**:
- **Math.random()**: Rejected because not cryptographically secure
- **uuid library**: Rejected because generates fixed format, not customizable passwords
- **Simple concatenation**: Rejected because predictable minimum char positions

**Security Considerations**:
- Web Crypto API provides CSPRNG quality randomness
- Fisher-Yates shuffle prevents positional patterns
- No password weakness from predictable minimum character placement

---

### 3. Passphrase Word List

**Question**: What word list should be used for passphrase generation?

**Decision**: EFF Long Wordlist (7,776 words)

**Rationale**:
- Electronic Frontier Foundation curated list specifically for passphrases
- 7,776 words (6^5) provides ~12.9 bits of entropy per word
- Words are memorable, distinct, and avoid profanity
- 3-word passphrase = ~38.7 bits entropy (strong enough for most use cases)
- Public domain, freely usable

**Implementation Approach**:
```typescript
import wordlist from './assets/wordlist.json';

function generatePassphrase(config: PassphraseConfig): string {
  const words: string[] = [];
  
  for (let i = 0; i < config.wordCount; i++) {
    const randomIndex = crypto.getRandomValues(new Uint32Array(1))[0] % wordlist.length;
    let word = wordlist[randomIndex];
    
    // Apply uppercase if enabled
    if (config.uppercase) {
      word = word.charAt(0).toUpperCase() + word.slice(1);
    }
    
    // Append numbers if enabled
    if (config.numbers) {
      const randomNum = crypto.getRandomValues(new Uint32Array(1))[0] % 1000;
      word += randomNum;
    }
    
    words.push(word);
  }
  
  return words.join(config.separator);
}
```

**Alternatives Considered**:
- **Custom word list**: Rejected because reinventing the wheel; EFF list is proven
- **Dictionary file**: Rejected due to size (hundreds of MB) and inappropriate words
- **BIP39 word list**: Considered but EFF list is more human-readable

**Source**: https://www.eff.org/files/2016/07/18/eff_large_wordlist.txt

---

### 4. Accessibility Testing with Vitest

**Question**: How to achieve 100% automated accessibility testing coverage with Vitest?

**Decision**: Use @axe-core/playwright + Playwright component testing + Vitest

**Rationale**:
- @axe-core is industry standard accessibility testing engine (Deque Systems)
- Playwright component testing allows testing components in real browser
- Integrates with Vitest for unified test runner
- Can test WCAG 2.1 Level AA compliance automatically
- Supports keyboard navigation testing

**Implementation Approach**:
```typescript
// tests/accessibility/keyboard.test.ts
import { test, expect } from '@playwright/experimental-ct-react';
import { injectAxe, checkA11y } from '@axe-core/playwright';
import PasswordForm from '../src/components/PasswordForm';

test.describe('Password Form Accessibility', () => {
  test('passes axe accessibility checks', async ({ mount, page }) => {
    await mount(<PasswordForm />);
    await injectAxe(page);
    await checkA11y(page);
  });
  
  test('keyboard navigation works', async ({ mount, page }) => {
    await mount(<PasswordForm />);
    
    // Tab through all interactive elements
    await page.keyboard.press('Tab');
    await expect(page.locator('[aria-label="Password length"]')).toBeFocused();
    
    await page.keyboard.press('Tab');
    await expect(page.locator('[aria-label="Include uppercase"]')).toBeFocused();
    
    // Test space bar activates checkbox
    await page.keyboard.press('Space');
    await expect(page.locator('[aria-label="Include uppercase"]')).toBeChecked();
  });
});
```

**Alternatives Considered**:
- **jest-axe**: Rejected because Vitest is test runner, not Jest
- **pa11y**: Considered but @axe-core has better Playwright integration
- **Manual testing only**: Rejected because constitution requires automated testing

**Coverage Target**: 100% of interactive elements tested for WCAG 2.1 AA compliance

---

### 5. Responsive Design Strategy

**Question**: What's the best approach for responsive layout without CSS frameworks?

**Decision**: CSS Grid + Flexbox + Custom Properties (CSS Variables)

**Rationale**:
- Native CSS Grid and Flexbox are mature and well-supported
- No framework dependencies keeps bundle small
- CSS Custom Properties enable theme consistency and easy maintenance
- Mobile-first approach ensures core functionality on smallest screens
- Meets constitution requirement to prioritize readability (custom CSS is more readable than framework classes)

**Implementation Approach**:
```css
/* styles/main.css */
:root {
  /* Spacing scale */
  --space-xs: 0.25rem;
  --space-sm: 0.5rem;
  --space-md: 1rem;
  --space-lg: 1.5rem;
  --space-xl: 2rem;
  
  /* Typography scale */
  --text-xs: 0.75rem;
  --text-sm: 0.875rem;
  --text-base: 1rem;
  --text-lg: 1.125rem;
  --text-xl: 1.25rem;
  
  /* Touch targets */
  --touch-target: 44px;
  
  /* Breakpoints applied via media queries */
}

/* Mobile-first base styles */
.app-container {
  display: grid;
  grid-template-rows: auto 1fr;
  gap: var(--space-lg);
  padding: var(--space-md);
  min-height: 100vh;
}

.form-grid {
  display: grid;
  gap: var(--space-md);
  grid-template-columns: 1fr;
}

/* Tablet */
@media (min-width: 768px) {
  .app-container {
    padding: var(--space-xl);
  }
  
  .form-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

/* Desktop */
@media (min-width: 1024px) {
  .app-container {
    max-width: 1200px;
    margin: 0 auto;
  }
  
  .form-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}
```

**Alternatives Considered**:
- **Tailwind CSS**: Rejected due to large dependency and constitution's "minimal dependencies" requirement
- **Bootstrap**: Rejected due to heavy bundle size and unnecessary features
- **Styled Components**: Rejected because constitution prefers "modern HTML/CSS over TS"

**Testing Strategy**: Test at breakpoints 320px, 768px, 1024px, 1920px, 2560px

---

### 6. Clipboard API Error Handling

**Question**: How to handle clipboard access failures gracefully?

**Decision**: Progressive enhancement with fallback to manual copy instructions

**Rationale**:
- Clipboard API requires HTTPS or localhost (security requirement)
- Some browsers/contexts block clipboard access
- User may deny permission
- Fallback ensures core functionality works without clipboard

**Implementation Approach**:
```typescript
// src/services/clipboard.ts
export async function copyToClipboard(text: string): Promise<{
  success: boolean;
  message: string;
}> {
  // Try modern Clipboard API first
  if (navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return { success: true, message: 'Copied to clipboard!' };
    } catch (err) {
      console.warn('Clipboard API failed:', err);
    }
  }
  
  // Fallback: execCommand (deprecated but widely supported)
  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const success = document.execCommand('copy');
    document.body.removeChild(textarea);
    
    if (success) {
      return { success: true, message: 'Copied to clipboard!' };
    }
  } catch (err) {
    console.warn('execCommand fallback failed:', err);
  }
  
  // Final fallback: Show modal with text to copy manually
  return {
    success: false,
    message: 'Unable to copy automatically. Please copy manually: ' + text
  };
}
```

**Edge Cases Handled**:
- No clipboard API support
- User permission denied
- Clipboard API failure (network issues, security context)
- Non-HTTPS context

---

### 7. Vite Configuration for Optimal Bundle Size

**Question**: How to configure Vite to meet <5MB bundle size constraint?

**Decision**: Code splitting + tree shaking + compression + lazy loading

**Rationale**:
- Vite has excellent tree shaking built-in
- Code splitting prevents loading unused code
- Lazy loading of wordlist reduces initial bundle
- Rollup (Vite's bundler) handles optimization well

**Implementation Approach**:
```typescript
// vite.config.ts
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    target: 'es2022',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.logs in production
        passes: 2
      }
    },
    rollupOptions: {
      output: {
        manualChunks: {
          'sql-js': ['sql.js'], // Separate chunk for SQLite WASM
          'wordlist': ['./src/assets/wordlist.json'] // Lazy load wordlist
        }
      }
    },
    chunkSizeWarningLimit: 1500 // Warn if chunks exceed 1.5MB
  },
  optimizeDeps: {
    include: ['sql.js']
  }
});
```

**Bundle Size Breakdown (Estimated)**:
- Vite runtime: ~10KB
- Application code: ~50KB (minified + gzipped)
- sql.js WASM: ~1.5MB
- Wordlist JSON: ~50KB
- **Total**: ~1.6MB (well under 5MB limit)

**Alternatives Considered**:
- **Webpack**: Rejected because Vite is faster and simpler to configure
- **Parcel**: Considered but Vite has better TypeScript support

---

## Summary of Key Decisions

| Area | Decision | Rationale |
|------|----------|-----------|
| Storage | sql.js (SQLite WASM) | Full SQL capabilities, offline-capable, ~1.5MB |
| Password Generation | Web Crypto API + Fisher-Yates | CSPRNG security, unbiased distribution |
| Wordlist | EFF Long Wordlist (7,776 words) | Proven for passphrases, ~12.9 bits/word entropy |
| Accessibility Testing | @axe-core/playwright + Vitest | Industry standard, 100% coverage achievable |
| Responsive CSS | Grid + Flexbox + Custom Properties | No framework dependencies, readable, maintainable |
| Clipboard Handling | Progressive enhancement with fallback | Graceful degradation for permission/API failures |
| Build Tool | Vite with code splitting | Fast, excellent tree shaking, <5MB achievable |

## Dependencies Required

```json
{
  "dependencies": {
    "sql.js": "^1.10.0"
  },
  "devDependencies": {
    "vite": "^5.0.0",
    "vitest": "^1.0.0",
    "typescript": "^5.3.0",
    "@axe-core/playwright": "^4.8.0",
    "@playwright/experimental-ct-react": "^1.40.0",
    "terser": "^5.26.0"
  }
}
```

**Total Dependencies**: 6 (minimal as required by constitution)

## Next Steps

All technical unknowns have been resolved. Proceed to Phase 1:
1. Generate data-model.md with entity definitions
2. Create contracts/ with TypeScript interfaces
3. Generate quickstart.md for developer onboarding
4. Update agent context files
