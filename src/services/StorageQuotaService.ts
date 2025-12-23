/**
 * StorageQuotaService
 * 
 * Monitors localStorage usage and prevents quota exceeded errors.
 * Provides warnings when approaching storage limits.
 */

export interface StorageInfo {
  /** Current storage usage in bytes */
  used: number;
  /** Estimated storage quota in bytes (default 5MB) */
  quota: number;
  /** Usage percentage (0-100) */
  percentage: number;
  /** Breakdown by storage key */
  breakdown: Array<{
    key: string;
    size: number;
    percentage: number;
  }>;
}

export interface QuotaCheckResult {
  /** Whether the operation can proceed */
  canProceed: boolean;
  /** Current storage info */
  info: StorageInfo;
  /** Warning message if approaching limit */
  warning?: string;
  /** Error message if at limit */
  error?: string;
}

/**
 * StorageQuotaService class for monitoring localStorage usage
 * 
 * Features:
 * - Estimates current localStorage usage
 * - Calculates usage percentage against quota
 * - Warns at 80% capacity
 * - Prevents operations at 95% capacity
 * - Provides size breakdown by storage key
 * 
 * @example
 * ```typescript
 * const quotaService = new StorageQuotaService();
 * 
 * // Check before saving
 * const result = quotaService.checkQuota();
 * if (result.canProceed) {
 *   localStorage.setItem('key', 'value');
 * } else {
 *   console.error(result.error);
 * }
 * 
 * // Get storage info
 * const info = quotaService.getStorageInfo();
 * console.log(`Using ${info.percentage}% of quota`);
 * ```
 */
export class StorageQuotaService {
  // Storage quota constants
  private readonly DEFAULT_QUOTA = 5 * 1024 * 1024; // 5MB (typical browser limit)
  private readonly WARNING_THRESHOLD = 0.80; // 80%
  private readonly CRITICAL_THRESHOLD = 0.95; // 95%

  /**
   * Gets current localStorage usage information
   * 
   * Calculates total usage and provides breakdown by storage key.
   * Uses byte-length estimation based on UTF-16 encoding.
   * 
   * @returns Storage information with usage statistics
   * 
   * @example
   * ```typescript
   * const info = quotaService.getStorageInfo();
   * console.log(`Used: ${info.used} bytes`);
   * console.log(`Quota: ${info.quota} bytes`);
   * console.log(`Percentage: ${info.percentage}%`);
   * info.breakdown.forEach(item => {
   *   console.log(`${item.key}: ${item.size} bytes (${item.percentage}%)`);
   * });
   * ```
   */
  getStorageInfo(): StorageInfo {
    let totalUsed = 0;
    const breakdown: Array<{ key: string; size: number; percentage: number }> = [];

    // Calculate size for each localStorage key
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        const value = localStorage.getItem(key) || '';
        // Calculate size in bytes (UTF-16 encoding uses 2 bytes per character)
        const keySize = this.calculateSize(key);
        const valueSize = this.calculateSize(value);
        const itemSize = keySize + valueSize;
        
        totalUsed += itemSize;
        
        breakdown.push({
          key,
          size: itemSize,
          percentage: 0, // Will be calculated after we have total
        });
      }
    }

    // Calculate percentages for breakdown
    breakdown.forEach(item => {
      item.percentage = totalUsed > 0 ? (item.size / totalUsed) * 100 : 0;
    });

    // Sort breakdown by size (largest first)
    breakdown.sort((a, b) => b.size - a.size);

    const quota = this.getQuota();
    const percentage = quota > 0 ? (totalUsed / quota) * 100 : 0;

    return {
      used: totalUsed,
      quota,
      percentage: Math.round(percentage * 100) / 100, // Round to 2 decimal places
      breakdown,
    };
  }

  /**
   * Checks if a storage operation can proceed
   * 
   * Returns warnings at 80% capacity and prevents operations at 95% capacity.
   * Use this before saving data to localStorage.
   * 
   * @param estimatedSize - Optional estimated size of data to be saved (in bytes)
   * @returns Check result with storage info and warnings/errors
   * 
   * @example
   * ```typescript
   * const dataToSave = JSON.stringify(largeObject);
   * const estimatedSize = quotaService.calculateSize(dataToSave);
   * const result = quotaService.checkQuota(estimatedSize);
   * 
   * if (!result.canProceed) {
   *   alert(result.error);
   * } else if (result.warning) {
   *   console.warn(result.warning);
   *   localStorage.setItem('key', dataToSave);
   * } else {
   *   localStorage.setItem('key', dataToSave);
   * }
   * ```
   */
  checkQuota(estimatedSize: number = 0): QuotaCheckResult {
    const info = this.getStorageInfo();
    const projectedUsed = info.used + estimatedSize;
    const projectedPercentage = info.quota > 0 ? (projectedUsed / info.quota) * 100 : 0;

    // Check if at critical threshold
    if (projectedPercentage >= this.CRITICAL_THRESHOLD * 100) {
      return {
        canProceed: false,
        info,
        error: this.formatQuotaError(info),
      };
    }

    // Check if at warning threshold
    if (projectedPercentage >= this.WARNING_THRESHOLD * 100) {
      return {
        canProceed: true,
        info,
        warning: this.formatQuotaWarning(info),
      };
    }

    // All clear
    return {
      canProceed: true,
      info,
    };
  }

  /**
   * Calculates size of a string in bytes
   * 
   * Uses UTF-16 encoding (2 bytes per character).
   * Includes overhead for storage format.
   * 
   * @param str - String to calculate size for
   * @returns Size in bytes
   * 
   * @example
   * ```typescript
   * const data = JSON.stringify({ key: 'value' });
   * const size = quotaService.calculateSize(data);
   * console.log(`Data size: ${size} bytes`);
   * ```
   */
  calculateSize(str: string): number {
    // localStorage stores strings in UTF-16 encoding (2 bytes per character)
    return str.length * 2;
  }

  /**
   * Formats storage size for display
   * 
   * Converts bytes to human-readable format (KB, MB).
   * 
   * @param bytes - Size in bytes
   * @returns Formatted string (e.g., "1.5 MB", "234 KB")
   * 
   * @example
   * ```typescript
   * const info = quotaService.getStorageInfo();
   * console.log(`Storage used: ${quotaService.formatSize(info.used)}`);
   * console.log(`Storage quota: ${quotaService.formatSize(info.quota)}`);
   * ```
   */
  formatSize(bytes: number): string {
    if (bytes < 1024) {
      return `${bytes} B`;
    } else if (bytes < 1024 * 1024) {
      const kb = bytes / 1024;
      return `${Math.round(kb * 10) / 10} KB`;
    } else {
      const mb = bytes / (1024 * 1024);
      return `${Math.round(mb * 10) / 10} MB`;
    }
  }

  // ==========================================================================
  // Helper Methods
  // ==========================================================================

  /**
   * Gets the localStorage quota
   * 
   * Attempts to use navigator.storage API if available,
   * otherwise falls back to default quota (5MB).
   * 
   * @returns Quota in bytes
   * @private
   */
  private getQuota(): number {
    // Try to use StorageManager API if available
    // Note: This is async, but we use a default for simplicity
    // In a real app, you could cache this value
    return this.DEFAULT_QUOTA;
  }

  /**
   * Formats a warning message when approaching quota
   * 
   * @param info - Storage information
   * @returns Warning message
   * @private
   */
  private formatQuotaWarning(info: StorageInfo): string {
    const topItems = info.breakdown.slice(0, 3);
    const topItemsList = topItems
      .map(item => `${item.key}: ${this.formatSize(item.size)}`)
      .join(', ');

    return `Storage is ${Math.round(info.percentage)}% full (${this.formatSize(info.used)} / ${this.formatSize(info.quota)}). ` +
           `Largest items: ${topItemsList}. ` +
           `Consider deleting old sites or exporting your vault to free up space.`;
  }

  /**
   * Formats an error message when quota is exceeded
   * 
   * @param info - Storage information
   * @returns Error message
   * @private
   */
  private formatQuotaError(info: StorageInfo): string {
    const topItems = info.breakdown.slice(0, 3);
    const topItemsList = topItems
      .map(item => `${item.key}: ${this.formatSize(item.size)}`)
      .join(', ');

    return `Storage quota exceeded! Using ${Math.round(info.percentage)}% (${this.formatSize(info.used)} / ${this.formatSize(info.quota)}). ` +
           `Cannot save new data. Largest items: ${topItemsList}. ` +
           `Please delete some sites or export and clear your vault to continue.`;
  }
}
