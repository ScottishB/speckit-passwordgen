import type { PasswordConfig } from '../models/PasswordConfig';
import type { PassphraseConfig } from '../models/PassphraseConfig';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export function validatePasswordConfig(config: PasswordConfig): ValidationResult {
  const errors: string[] = [];

  // Rule 1: Length must be between 8 and 128
  if (config.length < 8 || config.length > 128) {
    errors.push('Password length must be between 8 and 128 characters');
  }

  // Rule 2: At least one character type must be enabled
  if (!config.includeUppercase && !config.includeLowercase && 
      !config.includeNumbers && !config.includeSpecialChars) {
    errors.push('At least one character type must be enabled');
  }

  // Rule 3: If numbers disabled, minNumbers must be 0
  if (!config.includeNumbers && config.minNumbers > 0) {
    errors.push('Minimum numbers must be 0 when numbers are disabled');
  }

  // Rule 4: If special chars disabled, minSpecialChars must be 0
  if (!config.includeSpecialChars && config.minSpecialChars > 0) {
    errors.push('Minimum special characters must be 0 when special characters are disabled');
  }

  // Rule 5: minNumbers + minSpecialChars must be <= length
  if (config.minNumbers + config.minSpecialChars > config.length) {
    errors.push('Sum of minimum requirements exceeds password length');
  }

  // Rule 6: minNumbers must be <= length
  if (config.minNumbers > config.length) {
    errors.push('Minimum numbers cannot exceed password length');
  }

  // Rule 7: minSpecialChars must be <= length
  if (config.minSpecialChars > config.length) {
    errors.push('Minimum special characters cannot exceed password length');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

export function validatePassphraseConfig(config: PassphraseConfig): ValidationResult {
  const errors: string[] = [];

  // Rule 1: Word count must be between 3 and 8
  if (config.wordCount < 3 || config.wordCount > 8) {
    errors.push('Word count must be between 3 and 8');
  }

  // Rule 2: Separator max length 10 characters
  if (config.separator.length > 10) {
    errors.push('Separator must be 10 characters or less');
  }

  // Rule 3: Separator should not contain control characters
  if (/[\x00-\x1F\x7F]/.test(config.separator)) {
    errors.push('Separator cannot contain control characters');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
