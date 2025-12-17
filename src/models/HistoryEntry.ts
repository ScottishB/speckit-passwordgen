export interface HistoryEntry {
  id: number;
  type: 'password' | 'passphrase';
  value: string;
  displayTimestamp: string;
  preview: string;
}
