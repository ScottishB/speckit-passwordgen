# Data Model: Password Generation Web App

**Feature**: 001-password-gen  
**Date**: 2025-12-17  
**Purpose**: Define entities, relationships, and validation rules

## Entity Definitions

### PasswordConfig

Represents the configuration for password generation.

**Attributes**:
- `length: number` - Password length (8-128 characters)
- `includeUppercase: boolean` - Include uppercase letters (A-Z)
- `includeLowercase: boolean` - Include lowercase letters (a-z)
- `includeNumbers: boolean` - Include numbers (0-9)
- `includeSpecialChars: boolean` - Include special characters (!@#$%^&*()_+-=[]{}|;:,.<>?)
- `minNumbers: number` - Minimum count of numbers required (0-length)
- `minSpecialChars: number` - Minimum count of special characters required (0-length)

**Validation Rules**:
1. `length` must be between 8 and 128 (inclusive)
2. At least one character type must be enabled (`includeUppercase` OR `includeLowercase` OR `includeNumbers` OR `includeSpecialChars`)
3. If `includeNumbers` is false, `minNumbers` must be 0
4. If `includeSpecialChars` is false, `minSpecialChars` must be 0
5. `minNumbers + minSpecialChars` must be ≤ `length`
6. `minNumbers` must be ≤ `length`
7. `minSpecialChars` must be ≤ `length`

**Default Values**:
```typescript
{
  length: 12,
  includeUppercase: true,
  includeLowercase: true,
  includeNumbers: true,
  includeSpecialChars: false,
  minNumbers: 1,
  minSpecialChars: 1
}
```

**State Transitions**:
- When `includeNumbers` is toggled off → `minNumbers` resets to 0
- When `includeSpecialChars` is toggled off → `minSpecialChars` resets to 0
- When `length` is reduced below `minNumbers + minSpecialChars` → adjust minimums proportionally or show validation error

---

### PassphraseConfig

Represents the configuration for passphrase generation.

**Attributes**:
- `wordCount: number` - Number of words in passphrase (3-8)
- `includeUppercase: boolean` - Capitalize first letter of each word
- `includeNumbers: boolean` - Append random numbers to each word
- `separator: string` - Character(s) used to join words

**Validation Rules**:
1. `wordCount` must be between 3 and 8 (inclusive)
2. `separator` can be any string (including empty), max length 10 characters
3. `separator` should not contain characters that make passphrase difficult to read (e.g., control characters)

**Default Values**:
```typescript
{
  wordCount: 3,
  includeUppercase: false,
  includeNumbers: false,
  separator: '-'
}
```

**State Transitions**:
- No complex state transitions; all fields are independent

---

### GeneratedCredential

Represents a password or passphrase that has been generated and stored.

**Attributes**:
- `id: number` - Unique identifier (auto-increment primary key)
- `type: 'password' | 'passphrase'` - Type of credential
- `value: string` - The actual generated password or passphrase
- `timestamp: number` - Unix timestamp (milliseconds) when generated
- `config: string` - JSON-serialized configuration used to generate this credential

**Validation Rules**:
1. `type` must be either 'password' or 'passphrase'
2. `value` must be non-empty string
3. `timestamp` must be positive integer
4. `config` must be valid JSON string

**Relationships**:
- `config` deserializes to either `PasswordConfig` or `PassphraseConfig` based on `type`

**Lifecycle**:
1. **Create**: When user clicks "Generate" button
2. **Read**: When user views history list or clicks history item
3. **Update**: Not supported (credentials are immutable once generated)
4. **Delete**: Not supported in MVP (future feature: clear history)

---

### HistoryEntry (Derived View)

A view model for displaying history items in the UI. Not a database entity but derived from `GeneratedCredential`.

**Attributes**:
- `id: number` - From GeneratedCredential.id
- `type: 'password' | 'passphrase'` - From GeneratedCredential.type
- `value: string` - From GeneratedCredential.value
- `displayTimestamp: string` - Formatted timestamp (e.g., "2 minutes ago", "Dec 17, 2025 3:45 PM")
- `preview: string` - Truncated value for display (e.g., "Abc123••••••" for passwords, "word1-word2-•••" for passphrases)

**Display Rules**:
- Passwords show first 6 characters + "••••••"
- Passphrases show first 2 words + "•••"
- Timestamps use relative time for < 24 hours, absolute date for older

---

## Database Schema

### Table: `generated_credentials`

```sql
CREATE TABLE IF NOT EXISTS generated_credentials (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL CHECK(type IN ('password', 'passphrase')),
  value TEXT NOT NULL,
  timestamp INTEGER NOT NULL,
  config TEXT NOT NULL
);

CREATE INDEX idx_timestamp ON generated_credentials(timestamp DESC);
CREATE INDEX idx_type ON generated_credentials(type);
```

**Indexes**:
- `idx_timestamp`: Optimize history retrieval (most recent first)
- `idx_type`: Optimize filtering by credential type

**Storage Estimates**:
- Average password: 12 bytes (value) + ~100 bytes (config JSON) = ~112 bytes/record
- Average passphrase: 30 bytes (value) + ~80 bytes (config JSON) = ~110 bytes/record
- 1000 credentials ≈ 110 KB
- 10,000 credentials ≈ 1.1 MB (within browser storage limits)

---

## Entity Relationships

```
┌─────────────────┐
│ PasswordConfig  │
└────────┬────────┘
         │ generates
         ↓
┌─────────────────────┐
│ GeneratedCredential │──→ stored in → generated_credentials table
└────────┬────────────┘
         │ displayed as
         ↓
┌─────────────────┐
│  HistoryEntry   │──→ UI view model
└─────────────────┘

┌──────────────────┐
│ PassphraseConfig │
└────────┬─────────┘
         │ generates
         ↓
┌─────────────────────┐
│ GeneratedCredential │
└─────────────────────┘
```

**Flow**:
1. User configures `PasswordConfig` or `PassphraseConfig`
2. Generator service creates credential value
3. `GeneratedCredential` entity created with value + config + timestamp
4. Entity persisted to `generated_credentials` table
5. History list queries table and converts to `HistoryEntry` view models for display

---

## Validation Summary

### Cross-Entity Validations

1. **Password Generation**:
   - Must have at least one character type enabled
   - Minimum requirements must not exceed password length
   - Generated value must match configuration rules

2. **Passphrase Generation**:
   - Word count must use available words from wordlist
   - Generated value must contain exact word count specified
   - Separator correctly applied between all words

3. **History Storage**:
   - Credential type must match config structure
   - Config must be deserializable to correct type
   - Timestamp must be valid Unix time

### Error Handling

| Validation Failure | User Feedback | System Behavior |
|-------------------|---------------|-----------------|
| No character types selected | "Please enable at least one character type" | Disable generate button |
| Minimums exceed length | "Minimum requirements exceed password length" | Disable generate button |
| Database write failure | "Failed to save to history" | Show error but still display credential |
| Database read failure | "Failed to load history" | Show empty history with retry option |
| Invalid config deserialization | Log error | Skip corrupted history entry |

---

## Performance Considerations

### Query Optimization

**Most Recent N Items**:
```sql
SELECT * FROM generated_credentials
ORDER BY timestamp DESC
LIMIT ?;
```
- Uses `idx_timestamp` index
- Expected execution: <5ms for 10,000 records

**Filter by Type**:
```sql
SELECT * FROM generated_credentials
WHERE type = ?
ORDER BY timestamp DESC
LIMIT ?;
```
- Uses `idx_type` + `idx_timestamp` indexes
- Expected execution: <5ms for 10,000 records

### Memory Management

- Load history in batches (50 items at a time)
- Implement virtual scrolling for large history lists
- Periodically export database to IndexedDB (every 10 credentials generated)

---

## Future Extensibility

### Potential Schema Changes (Out of Scope for MVP)

1. **Favorites**: Add `is_favorite BOOLEAN` column to pin important credentials
2. **Categories**: Add `category TEXT` column to organize credentials
3. **Encryption**: Store `value` as encrypted blob with user-provided master password
4. **Export**: Add export timestamp and format columns
5. **Custom Wordlists**: Add `wordlist_id` foreign key for passphrase generation

### Migration Strategy

When schema changes are needed:
1. Check current schema version
2. Apply migrations sequentially
3. Preserve existing data
4. Update application to use new schema

```typescript
const SCHEMA_VERSION = 1;

function migrateDatabase(db: Database, currentVersion: number) {
  if (currentVersion < 1) {
    // Initial schema (current implementation)
    db.run(/* CREATE TABLE ... */);
  }
  // Future migrations will go here
  // if (currentVersion < 2) { ... }
}
```

---

## Summary

**Total Entities**: 3 core entities (PasswordConfig, PassphraseConfig, GeneratedCredential) + 1 view model (HistoryEntry)

**Storage**: Single SQLite table (`generated_credentials`) with 2 indexes

**Validation**: 12 validation rules ensuring data integrity and user input constraints

**Performance**: Optimized for read-heavy workload (history viewing) with indexes on timestamp and type

All entity definitions align with functional requirements (FR-001 through FR-022) from spec.md. No NEEDS CLARIFICATION items remain.
