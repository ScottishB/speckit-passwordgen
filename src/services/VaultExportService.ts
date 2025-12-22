import { CryptoService } from './CryptoService';
import { Database } from './database';
import { HistoryService } from './HistoryService';
import type { Site } from '../models/Site';
import type { HistoryEntry } from '../models/HistoryEntry';

/**
 * Export data structure containing vault contents
 */
export interface VaultExport {
  /** Export format version for future compatibility */
  version: number;
  /** Timestamp when export was created */
  exportedAt: number;
  /** User ID who created the export */
  userId: string;
  /** Username for reference */
  username: string;
  /** Array of site entries with passwords */
  sites: Site[];
  /** Password generation history */
  history: HistoryEntry[];
  /** Total number of items exported */
  itemCount: {
    sites: number;
    history: number;
  };
}

/**
 * Encrypted export file structure
 */
export interface EncryptedExport {
  /** Export format version */
  version: number;
  /** Encryption initialization vector (base64) */
  iv: string;
  /** Salt used for key derivation (base64) */
  salt: string;
  /** Encrypted data (base64) */
  data: string;
  /** Timestamp when encrypted */
  encryptedAt: number;
}

/**
 * Options for exporting vault data
 */
export interface ExportOptions {
  /** Include password generation history (default: true) */
  includeHistory?: boolean;
  /** Include site notes (default: true) */
  includeNotes?: boolean;
  /** Pretty-print JSON (default: false for smaller files) */
  prettyPrint?: boolean;
}

/**
 * Service for exporting and importing vault data
 * 
 * Provides secure export/import of vault contents with encryption.
 * Exports include sites, passwords, and optionally history.
 * 
 * @example
 * ```typescript
 * const exportService = new VaultExportService(cryptoService, database, historyService);
 * 
 * // Export vault
 * const encryptedData = await exportService.exportVault(
 *   userId,
 *   username,
 *   password,
 *   { includeHistory: true }
 * );
 * 
 * // Download as file
 * exportService.downloadExport(encryptedData, 'my-vault-backup');
 * ```
 */
export class VaultExportService {
  private readonly EXPORT_VERSION = 1;
  private readonly MIME_TYPE = 'application/json';

  constructor(
    private cryptoService: CryptoService,
    private database: Database,
    private historyService: HistoryService
  ) {}

  /**
   * Exports vault data as encrypted JSON
   * 
   * Collects sites and optionally history, encrypts with user's password,
   * and returns encrypted export ready for download.
   * 
   * @param userId - User ID to export data for
   * @param username - Username for reference in export
   * @param password - Password to encrypt export (user's master password)
   * @param options - Export options
   * @returns Encrypted export data
   * 
   * @throws {Error} If user not found or encryption fails
   * 
   * @example
   * ```typescript
   * const encrypted = await exportService.exportVault(
   *   'user-123',
   *   'john@example.com',
   *   'masterPassword',
   *   { includeHistory: true, includeNotes: true }
   * );
   * ```
   */
  async exportVault(
    userId: string,
    username: string,
    password: string,
    options: ExportOptions = {}
  ): Promise<EncryptedExport> {
    const {
      includeHistory = true,
      includeNotes = true,
      prettyPrint = false,
    } = options;

    // Load vault data
    const vault = await this.database.getVault(userId);
    if (!vault) {
      throw new Error('Vault not found for user');
    }

    // Decrypt vault to get sites
    const salt = vault.salt;
    const key = await this.cryptoService.deriveEncryptionKey(password, salt);
    const decryptedVault = await this.cryptoService.decryptData(
      vault.encryptedData,
      vault.iv,
      key
    );

    let sites: Site[] = decryptedVault.sites || [];

    // Optionally strip notes
    if (!includeNotes) {
      sites = sites.map(site => {
        const { notes, ...siteWithoutNotes } = site;
        return siteWithoutNotes as Site;
      });
    }

    // Load history if requested
    let history: HistoryEntry[] = [];
    if (includeHistory) {
      history = await this.historyService.getHistory(userId);
    }

    // Create export structure
    const exportData: VaultExport = {
      version: this.EXPORT_VERSION,
      exportedAt: Date.now(),
      userId,
      username,
      sites,
      history,
      itemCount: {
        sites: sites.length,
        history: history.length,
      },
    };

    // Convert to JSON
    const jsonData = prettyPrint
      ? JSON.stringify(exportData, null, 2)
      : JSON.stringify(exportData);

    // Generate new salt for export encryption
    const exportSalt = this.cryptoService.generateSalt();
    const exportKey = await this.cryptoService.deriveEncryptionKey(
      password,
      exportSalt
    );

    // Encrypt export data
    const encrypted = await this.cryptoService.encryptData(jsonData, exportKey);

    // Create encrypted export structure
    const encryptedExport: EncryptedExport = {
      version: this.EXPORT_VERSION,
      iv: encrypted.iv,
      salt: exportSalt,
      data: encrypted.encrypted,
      encryptedAt: Date.now(),
    };

    return encryptedExport;
  }

  /**
   * Triggers browser download of encrypted export
   * 
   * Creates a data URL and triggers download with given filename.
   * Automatically adds timestamp and .json extension.
   * 
   * @param encryptedExport - Encrypted export data
   * @param baseFilename - Base filename (without extension)
   * 
   * @example
   * ```typescript
   * const encrypted = await exportService.exportVault(...);
   * exportService.downloadExport(encrypted, 'my-vault-backup');
   * // Downloads: my-vault-backup-2025-12-22.json
   * ```
   */
  downloadExport(encryptedExport: EncryptedExport, baseFilename: string): void {
    const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const filename = `${baseFilename}-${timestamp}.json`;

    const jsonString = JSON.stringify(encryptedExport, null, 2);
    const blob = new Blob([jsonString], { type: this.MIME_TYPE });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';

    document.body.appendChild(link);
    link.click();

    // Cleanup
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Imports vault data from encrypted export
   * 
   * Decrypts export file and returns vault data for review or import.
   * Does NOT automatically save to database - caller must handle that.
   * 
   * @param encryptedExport - Encrypted export data
   * @param password - Password to decrypt export
   * @returns Decrypted vault export data
   * 
   * @throws {Error} If decryption fails or export format invalid
   * 
   * @example
   * ```typescript
   * const fileContent = await file.text();
   * const encryptedExport = JSON.parse(fileContent);
   * const vaultData = await exportService.importVault(
   *   encryptedExport,
   *   'masterPassword'
   * );
   * // Review vaultData, then save to database if desired
   * ```
   */
  async importVault(
    encryptedExport: EncryptedExport,
    password: string
  ): Promise<VaultExport> {
    // Validate export format
    if (encryptedExport.version !== this.EXPORT_VERSION) {
      throw new Error(
        `Unsupported export version: ${encryptedExport.version}. ` +
        `Expected version ${this.EXPORT_VERSION}.`
      );
    }

    // Derive decryption key
    const key = await this.cryptoService.deriveEncryptionKey(
      password,
      encryptedExport.salt
    );

    // Decrypt data
    const decryptedJson = await this.cryptoService.decryptData(
      encryptedExport.data,
      encryptedExport.iv,
      key
    );

    // Parse and validate
    const vaultExport: VaultExport = typeof decryptedJson === 'string'
      ? JSON.parse(decryptedJson)
      : decryptedJson;

    // Validate structure
    if (!vaultExport.version || !vaultExport.sites || !vaultExport.itemCount) {
      throw new Error('Invalid export file structure');
    }

    return vaultExport;
  }

  /**
   * Validates encrypted export file format
   * 
   * Checks if file contains required fields without decrypting.
   * Useful for validating file before attempting import.
   * 
   * @param fileContent - Raw file content as string
   * @returns Validation result
   * 
   * @example
   * ```typescript
   * const result = exportService.validateExportFile(fileContent);
   * if (!result.valid) {
   *   console.error(result.error);
   * }
   * ```
   */
  validateExportFile(fileContent: string): {
    valid: boolean;
    error?: string;
    version?: number;
  } {
    try {
      const parsed = JSON.parse(fileContent);

      // Check required fields
      if (typeof parsed.version !== 'number') {
        return { valid: false, error: 'Missing or invalid version field' };
      }

      if (typeof parsed.iv !== 'string') {
        return { valid: false, error: 'Missing or invalid iv field' };
      }

      if (typeof parsed.salt !== 'string') {
        return { valid: false, error: 'Missing or invalid salt field' };
      }

      if (typeof parsed.data !== 'string') {
        return { valid: false, error: 'Missing or invalid data field' };
      }

      if (typeof parsed.encryptedAt !== 'number') {
        return { valid: false, error: 'Missing or invalid encryptedAt field' };
      }

      // Check version compatibility
      if (parsed.version > this.EXPORT_VERSION) {
        return {
          valid: false,
          error: `Export file version ${parsed.version} is newer than supported version ${this.EXPORT_VERSION}`,
          version: parsed.version,
        };
      }

      return { valid: true, version: parsed.version };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Invalid JSON format',
      };
    }
  }

  /**
   * Calculates estimated size of export
   * 
   * Estimates file size based on site count and history entries.
   * Useful for warning users about large exports.
   * 
   * @param siteCount - Number of sites
   * @param historyCount - Number of history entries
   * @returns Estimated size in bytes
   * 
   * @example
   * ```typescript
   * const size = exportService.estimateExportSize(50, 100);
   * console.log(`Estimated export size: ${size} bytes`);
   * ```
   */
  estimateExportSize(siteCount: number, historyCount: number): number {
    // Average site entry: ~500 bytes (with encrypted password, notes, etc.)
    // Average history entry: ~200 bytes
    // Base overhead: ~500 bytes (metadata, encryption data)

    const baseSiteSize = 500;
    const baseHistorySize = 200;
    const baseOverhead = 500;

    return (
      baseOverhead +
      siteCount * baseSiteSize +
      historyCount * baseHistorySize
    );
  }

  /**
   * Formats export size for display
   * 
   * Converts bytes to human-readable format (KB, MB).
   * 
   * @param bytes - Size in bytes
   * @returns Formatted size string
   * 
   * @example
   * ```typescript
   * const formatted = exportService.formatSize(1536000);
   * console.log(formatted); // "1.5 MB"
   * ```
   */
  formatSize(bytes: number): string {
    if (bytes < 1024) {
      return `${bytes} B`;
    } else if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    } else {
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }
  }
}
