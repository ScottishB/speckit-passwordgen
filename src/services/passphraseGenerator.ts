import type { PassphraseConfig } from '../models/PassphraseConfig';
import { DEFAULT_PASSPHRASE_CONFIG } from '../models/PassphraseConfig';
import { validatePassphraseConfig, type ValidationResult } from './validator';
import wordlist from '../assets/wordlist.json';

export class PassphraseGenerator {
  private wordlist: string[] = wordlist;

  generate(config: PassphraseConfig): string {
    const validation = this.validate(config);
    if (!validation.isValid) {
      throw new Error(`Invalid configuration: ${validation.errors.join(', ')}`);
    }

    const words: string[] = [];

    for (let i = 0; i < config.wordCount; i++) {
      const randomIndex = this.getRandomInt(this.wordlist.length);
      let word = this.wordlist[randomIndex]!;

      // Apply uppercase if enabled
      if (config.includeUppercase) {
        word = word.charAt(0).toUpperCase() + word.slice(1);
      }

      // Append numbers if enabled
      if (config.includeNumbers) {
        const randomNum = this.getRandomInt(1000);
        word += randomNum.toString();
      }

      words.push(word);
    }

    return words.join(config.separator);
  }

  validate(config: PassphraseConfig): ValidationResult {
    return validatePassphraseConfig(config);
  }

  getDefaultConfig(): PassphraseConfig {
    return { ...DEFAULT_PASSPHRASE_CONFIG };
  }

  getWordlist(): string[] {
    return [...this.wordlist];
  }

  private getRandomInt(max: number): number {
    const randomBuffer = new Uint32Array(1);
    crypto.getRandomValues(randomBuffer);
    return randomBuffer[0]! % max;
  }
}
