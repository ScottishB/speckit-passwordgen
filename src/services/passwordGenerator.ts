import type { PasswordConfig } from '../models/PasswordConfig';
import { DEFAULT_PASSWORD_CONFIG } from '../models/PasswordConfig';
import { validatePasswordConfig, type ValidationResult } from './validator';

export class PasswordGenerator {
  private readonly UPPERCASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  private readonly LOWERCASE = 'abcdefghijklmnopqrstuvwxyz';
  private readonly NUMBERS = '0123456789';
  private readonly SPECIAL_CHARS = '!@#$%^&*()_+-=[]{}|;:,.<>?';

  generate(config: PasswordConfig): string {
    const validation = this.validate(config);
    if (!validation.isValid) {
      throw new Error(`Invalid configuration: ${validation.errors.join(', ')}`);
    }

    const chars: string[] = [];

    // Add minimum required numbers first
    if (config.includeNumbers && config.minNumbers > 0) {
      for (let i = 0; i < config.minNumbers; i++) {
        chars.push(this.getRandomChar(this.NUMBERS));
      }
    }

    // Add minimum required special characters
    if (config.includeSpecialChars && config.minSpecialChars > 0) {
      for (let i = 0; i < config.minSpecialChars; i++) {
        chars.push(this.getRandomChar(this.SPECIAL_CHARS));
      }
    }

    // Build pool of all enabled character types
    let pool = '';
    if (config.includeUppercase) pool += this.UPPERCASE;
    if (config.includeLowercase) pool += this.LOWERCASE;
    if (config.includeNumbers) pool += this.NUMBERS;
    if (config.includeSpecialChars) pool += this.SPECIAL_CHARS;

    // Fill remaining length with random characters from pool
    while (chars.length < config.length) {
      chars.push(this.getRandomChar(pool));
    }

    // Fisher-Yates shuffle to randomize positions
    for (let i = chars.length - 1; i > 0; i--) {
      const j = this.getRandomInt(i + 1);
      const temp = chars[i]!;
      chars[i] = chars[j]!;
      chars[j] = temp;
    }

    return chars.join('');
  }

  validate(config: PasswordConfig): ValidationResult {
    return validatePasswordConfig(config);
  }

  getDefaultConfig(): PasswordConfig {
    return { ...DEFAULT_PASSWORD_CONFIG };
  }

  private getRandomChar(pool: string): string {
    const randomIndex = this.getRandomInt(pool.length);
    return pool[randomIndex]!;
  }

  private getRandomInt(max: number): number {
    // Use crypto.getRandomValues for cryptographically secure randomness
    const randomBuffer = new Uint32Array(1);
    crypto.getRandomValues(randomBuffer);
    return randomBuffer[0]! % max;
  }
}
