import { AuthService } from './AuthService';
import { SiteService } from './SiteService';
import type { GeneratedCredential } from '../models/GeneratedCredential';

/**
 * Legacy credential structure from old password generator
 */
interface LegacyCredential {
  id: number;
  type: 'password' | 'passphrase';
  value: string;
  length?: number;
  wordCount?: number;
  includeNumbers?: boolean;
  includeSymbols?: boolean;
  includeUppercase?: boolean;
  timestamp: number;
  userId?: string; // Optional, may not exist in old data
}

/**
 * Service for migrating old single-user data to new multi-user system
 * 
 * Handles detection of legacy data stored in 'password-gen-credentials' key
 * and provides migration utilities to move this data to a new user account
 * with proper encryption.
 */
export class MigrationService {
  private static readonly LEGACY_STORAGE_KEY = 'password-gen-credentials';

  constructor(
    private authService: AuthService,
    private siteService: SiteService
  ) {}

  /**
   * Checks if old data exists in localStorage
   * 
   * Looks for the legacy 'password-gen-credentials' key which was used
   * by the original password generator before multi-user support.
   * 
   * @returns {boolean} True if legacy data exists and is non-empty
   * 
   * @example
   * ```typescript
   * const migrationService = new MigrationService(authService, siteService);
   * if (migrationService.checkForOldData()) {
   *   // Show migration modal
   * }
   * ```
   */
  checkForOldData(): boolean {
    try {
      const legacyData = localStorage.getItem(MigrationService.LEGACY_STORAGE_KEY);
      if (!legacyData) {
        return false;
      }

      const credentials: LegacyCredential[] = JSON.parse(legacyData);
      return Array.isArray(credentials) && credentials.length > 0;
    } catch (error) {
      console.error('[MigrationService] Error checking for old data:', error);
      return false;
    }
  }

  /**
   * Exports old data as JSON string
   * 
   * Retrieves legacy credentials and formats them for export or backup.
   * This allows users to save their data before starting fresh.
   * 
   * @returns {string} JSON string of legacy credentials
   * @throws {Error} If no legacy data exists or parsing fails
   * 
   * @example
   * ```typescript
   * const exportData = migrationService.exportOldData();
   * const blob = new Blob([exportData], { type: 'application/json' });
   * // Create download link for blob
   * ```
   */
  exportOldData(): string {
    try {
      const legacyData = localStorage.getItem(MigrationService.LEGACY_STORAGE_KEY);
      if (!legacyData) {
        throw new Error('No legacy data found to export');
      }

      const credentials: LegacyCredential[] = JSON.parse(legacyData);
      
      // Format for export with metadata
      const exportData = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        credentialCount: credentials.length,
        credentials: credentials.map(cred => ({
          id: cred.id,
          type: cred.type,
          password: cred.value,
          length: cred.length,
          wordCount: cred.wordCount,
          settings: {
            includeNumbers: cred.includeNumbers,
            includeSymbols: cred.includeSymbols,
            includeUppercase: cred.includeUppercase
          },
          createdAt: new Date(cred.timestamp).toISOString()
        }))
      };

      return JSON.stringify(exportData, null, 2);
    } catch (error) {
      console.error('[MigrationService] Error exporting old data:', error);
      throw new Error('Failed to export legacy data: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  }

  /**
   * Migrates old data to a new user account
   * 
   * Creates a new user with the provided credentials, converts legacy
   * password history to site entries in the encrypted vault, and removes
   * the old data from localStorage.
   * 
   * Process:
   * 1. Register new user with provided username/password
   * 2. Login to create session
   * 3. Convert legacy credentials to site entries
   * 4. Save each entry to encrypted vault
   * 5. Delete legacy storage key
   * 
   * @param {string} username - Username for new account (3-20 chars, alphanumeric)
   * @param {string} password - Password for new account (must meet strength requirements)
   * @returns {Promise<void>} Resolves when migration completes
   * @throws {Error} If registration fails, no legacy data exists, or migration fails
   * 
   * @example
   * ```typescript
   * try {
   *   await migrationService.migrateToNewUser('myusername', 'SecurePassword123!');
   *   console.log('Migration successful!');
   * } catch (error) {
   *   console.error('Migration failed:', error.message);
   * }
   * ```
   */
  async migrateToNewUser(username: string, password: string): Promise<void> {
    try {
      // Step 1: Verify legacy data exists
      const legacyData = localStorage.getItem(MigrationService.LEGACY_STORAGE_KEY);
      if (!legacyData) {
        throw new Error('No legacy data found to migrate');
      }

      const credentials: LegacyCredential[] = JSON.parse(legacyData);
      if (!Array.isArray(credentials) || credentials.length === 0) {
        throw new Error('Legacy data is empty or invalid');
      }

      console.log(`[MigrationService] Starting migration of ${credentials.length} credentials...`);

      // Step 2: Register new user
      console.log('[MigrationService] Creating new user account...');
      const user = await this.authService.register(username, password);
      console.log(`[MigrationService] User created: ${user.id}`);

      // Step 3: Login to create session
      console.log('[MigrationService] Logging in...');
      await this.authService.login(username, password);
      console.log('[MigrationService] Login successful');

      // Step 4: Convert legacy credentials to site entries
      console.log('[MigrationService] Converting credentials to site entries...');
      let successCount = 0;
      let errorCount = 0;

      // Get current user ID for site creation
      const currentUser = this.authService.getCurrentUser();
      if (!currentUser) {
        throw new Error('User session expired during migration');
      }

      for (const credential of credentials) {
        try {
          // Create a site entry for each legacy credential
          // Use a generic naming pattern since old data didn't have site names
          const siteName = `Migrated Password #${credential.id}`;
          const url = ''; // Old data didn't have URLs

          await this.siteService.createSite({
            userId: currentUser.id,
            siteName,
            url,
            username: '', // Old data didn't have usernames
            password: credential.value, // SiteService will encrypt this
            notes: this.formatMigrationNotes(credential),
            tags: ['migrated', credential.type]
          });

          successCount++;
          console.log(`[MigrationService] Migrated credential ${credential.id}`);
        } catch (error) {
          errorCount++;
          console.error(`[MigrationService] Failed to migrate credential ${credential.id}:`, error);
        }
      }

      console.log(`[MigrationService] Migration complete: ${successCount} succeeded, ${errorCount} failed`);

      // Step 5: Delete legacy data
      if (successCount > 0) {
        console.log('[MigrationService] Removing legacy data...');
        localStorage.removeItem(MigrationService.LEGACY_STORAGE_KEY);
        console.log('[MigrationService] Legacy data removed');
      } else {
        throw new Error('Migration failed: No credentials were successfully migrated');
      }

    } catch (error) {
      console.error('[MigrationService] Migration failed:', error);
      throw new Error('Failed to migrate data: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  }

  /**
   * Deletes legacy data without migrating
   * 
   * Removes the old 'password-gen-credentials' key from localStorage.
   * This is used when users choose "Start Fresh" instead of migrating.
   * 
   * @returns {void}
   * 
   * @example
   * ```typescript
   * migrationService.deleteOldData();
   * console.log('Legacy data deleted');
   * ```
   */
  deleteOldData(): void {
    try {
      localStorage.removeItem(MigrationService.LEGACY_STORAGE_KEY);
      console.log('[MigrationService] Legacy data deleted');
    } catch (error) {
      console.error('[MigrationService] Error deleting old data:', error);
      throw new Error('Failed to delete legacy data');
    }
  }

  /**
   * Formats migration notes for a legacy credential
   * 
   * Creates a descriptive note that includes the original generation
   * settings and timestamp for reference.
   * 
   * @private
   * @param {LegacyCredential} credential - Legacy credential to format
   * @returns {string} Formatted notes
   */
  private formatMigrationNotes(credential: LegacyCredential): string {
    const lines: string[] = [
      'Migrated from legacy password generator',
      `Original ID: ${credential.id}`,
      `Generated: ${new Date(credential.timestamp).toLocaleString()}`
    ];

    if (credential.type === 'password') {
      lines.push(`Length: ${credential.length || 'unknown'}`);
      const settings: string[] = [];
      if (credential.includeNumbers) settings.push('numbers');
      if (credential.includeSymbols) settings.push('symbols');
      if (credential.includeUppercase) settings.push('uppercase');
      if (settings.length > 0) {
        lines.push(`Settings: ${settings.join(', ')}`);
      }
    } else if (credential.type === 'passphrase') {
      lines.push(`Word count: ${credential.wordCount || 'unknown'}`);
    }

    return lines.join('\n');
  }

  /**
   * Gets statistics about legacy data
   * 
   * Returns information about the number and types of credentials
   * in the legacy storage.
   * 
   * @returns {object} Statistics object
   * @returns {number} count - Total number of credentials
   * @returns {number} passwords - Number of password-type credentials
   * @returns {number} passphrases - Number of passphrase-type credentials
   * @returns {string} oldestDate - ISO date of oldest credential
   * @returns {string} newestDate - ISO date of newest credential
   * 
   * @example
   * ```typescript
   * const stats = migrationService.getOldDataStats();
   * console.log(`Found ${stats.count} credentials to migrate`);
   * ```
   */
  getOldDataStats(): {
    count: number;
    passwords: number;
    passphrases: number;
    oldestDate: string | null;
    newestDate: string | null;
  } {
    try {
      const legacyData = localStorage.getItem(MigrationService.LEGACY_STORAGE_KEY);
      if (!legacyData) {
        return {
          count: 0,
          passwords: 0,
          passphrases: 0,
          oldestDate: null,
          newestDate: null
        };
      }

      const credentials: LegacyCredential[] = JSON.parse(legacyData);
      
      const passwords = credentials.filter(c => c.type === 'password').length;
      const passphrases = credentials.filter(c => c.type === 'passphrase').length;
      
      const timestamps = credentials
        .map(c => c.timestamp)
        .filter((t): t is number => typeof t === 'number')
        .sort((a, b) => a - b);
      
      let oldestDate: string | null = null;
      let newestDate: string | null = null;
      
      if (timestamps.length > 0) {
        oldestDate = new Date(timestamps[0]!).toISOString();
        newestDate = new Date(timestamps[timestamps.length - 1]!).toISOString();
      }

      return {
        count: credentials.length,
        passwords,
        passphrases,
        oldestDate,
        newestDate
      };
    } catch (error) {
      console.error('[MigrationService] Error getting stats:', error);
      return {
        count: 0,
        passwords: 0,
        passphrases: 0,
        oldestDate: null,
        newestDate: null
      };
    }
  }
}
