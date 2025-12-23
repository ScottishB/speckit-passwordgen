import type { GeneratedCredential } from '../models/GeneratedCredential';
import type { HistoryEntry } from '../models/HistoryEntry';
import { Database } from './database';

export class HistoryService {
  constructor(private database: Database) {}

  /**
   * Get password/passphrase history for a specific user
   * @param userId - User ID to filter history by
   * @param limit - Maximum number of entries to return (default: 50)
   * @returns Array of history entries for the user
   */
  async getHistory(userId: string, limit = 50): Promise<HistoryEntry[]> {
    const credentials = await this.database.getAllCredentials(limit);
    // Filter by userId if the credential has a userId field
    const userCredentials = credentials.filter(c => 
      (c as any).userId === userId || !(c as any).userId // Include old entries without userId for backward compatibility
    );
    return userCredentials.map(c => this.toHistoryEntry(c));
  }

  /**
   * Get password/passphrase history filtered by type for a specific user
   * @param userId - User ID to filter history by
   * @param type - Type of credential ('password' or 'passphrase')
   * @param limit - Maximum number of entries to return (default: 50)
   * @returns Array of history entries for the user and type
   */
  async getHistoryByType(userId: string, type: 'password' | 'passphrase', limit = 50): Promise<HistoryEntry[]> {
    const credentials = await this.database.getCredentialsByType(type, limit);
    // Filter by userId if the credential has a userId field
    const userCredentials = credentials.filter(c => 
      (c as any).userId === userId || !(c as any).userId // Include old entries without userId for backward compatibility
    );
    return userCredentials.map(c => this.toHistoryEntry(c));
  }

  toHistoryEntry(credential: GeneratedCredential): HistoryEntry {
    return {
      id: credential.id,
      type: credential.type,
      value: credential.value,
      displayTimestamp: this.formatTimestamp(credential.timestamp),
      preview: this.generatePreview(credential.value, credential.type),
    };
  }

  private formatTimestamp(timestamp: number): string {
    const now = Date.now();
    const diff = now - timestamp;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    // Relative time for < 24 hours
    if (days === 0) {
      if (hours === 0) {
        if (minutes === 0) {
          return 'Just now';
        }
        return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
      }
      return `${hours} hour${hours === 1 ? '' : 's'} ago`;
    }

    // Absolute date for older
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }

  private generatePreview(value: string, type: 'password' | 'passphrase'): string {
    if (type === 'password') {
      // Show first 6 characters + "••••••"
      return value.length > 6 ? value.substring(0, 6) + '••••••' : value;
    } else {
      // Show first 2 words + "•••"
      const words = value.split(/[-\s_]/);
      if (words.length > 2) {
        return words.slice(0, 2).join('-') + '-•••';
      }
      return value;
    }
  }
}
