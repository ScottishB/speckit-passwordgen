/**
 * Configuration for password generation
 */
export interface PasswordConfig {
  /** Password length (8-128 characters) */
  length: number;
  
  /** Include uppercase letters (A-Z) */
  includeUppercase: boolean;
  
  /** Include lowercase letters (a-z) */
  includeLowercase: boolean;
  
  /** Include numbers (0-9) */
  includeNumbers: boolean;
  
  /** Include special characters (!@#$%^&*()_+-=[]{}|;:,.<>?) */
  includeSpecialChars: boolean;
  
  /** Minimum count of numbers required */
  minNumbers: number;
  
  /** Minimum count of special characters required */
  minSpecialChars: number;
}

/**
 * Configuration for passphrase generation
 */
export interface PassphraseConfig {
  /** Number of words in passphrase (3-8) */
  wordCount: number;
  
  /** Capitalize first letter of each word */
  includeUppercase: boolean;
  
  /** Append random numbers to each word */
  includeNumbers: boolean;
  
  /** Character(s) used to join words */
  separator: string;
}

/**
 * A generated password or passphrase with metadata
 */
export interface GeneratedCredential {
  /** Unique identifier */
  id: number;
  
  /** Type of credential */
  type: 'password' | 'passphrase';
  
  /** The actual generated password or passphrase */
  value: string;
  
  /** Unix timestamp (milliseconds) when generated */
  timestamp: number;
  
  /** JSON-serialized configuration used to generate this credential */
  config: string;
}

/**
 * View model for displaying history items
 */
export interface HistoryEntry {
  /** From GeneratedCredential.id */
  id: number;
  
  /** From GeneratedCredential.type */
  type: 'password' | 'passphrase';
  
  /** From GeneratedCredential.value */
  value: string;
  
  /** Formatted timestamp (e.g., "2 minutes ago", "Dec 17, 2025 3:45 PM") */
  displayTimestamp: string;
  
  /** Truncated value for display */
  preview: string;
}

/**
 * Result of clipboard operation
 */
export interface ClipboardResult {
  /** Whether the operation succeeded */
  success: boolean;
  
  /** Message to display to user */
  message: string;
}

/**
 * Result of validation operation
 */
export interface ValidationResult {
  /** Whether the configuration is valid */
  isValid: boolean;
  
  /** Error messages if validation failed */
  errors: string[];
}
