export interface PasswordConfig {
  length: number;
  includeUppercase: boolean;
  includeLowercase: boolean;
  includeNumbers: boolean;
  includeSpecialChars: boolean;
  minNumbers: number;
  minSpecialChars: number;
}

export const DEFAULT_PASSWORD_CONFIG: PasswordConfig = {
  length: 12,
  includeUppercase: true,
  includeLowercase: true,
  includeNumbers: true,
  includeSpecialChars: false,
  minNumbers: 1,
  minSpecialChars: 1,
};
