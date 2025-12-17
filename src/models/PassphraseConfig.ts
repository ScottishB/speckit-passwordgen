export interface PassphraseConfig {
  wordCount: number;
  includeUppercase: boolean;
  includeNumbers: boolean;
  separator: string;
}

export const DEFAULT_PASSPHRASE_CONFIG: PassphraseConfig = {
  wordCount: 3,
  includeUppercase: false,
  includeNumbers: false,
  separator: '-',
};
