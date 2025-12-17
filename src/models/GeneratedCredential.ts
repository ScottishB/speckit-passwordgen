export interface GeneratedCredential {
  id: number;
  type: 'password' | 'passphrase';
  value: string;
  timestamp: number;
  config: string;
}
