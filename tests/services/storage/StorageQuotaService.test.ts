import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { StorageQuotaService } from '../../../src/services/StorageQuotaService';

describe('StorageQuotaService', () => {
  let quotaService: StorageQuotaService;

  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    quotaService = new StorageQuotaService();
  });

  afterEach(() => {
    localStorage.clear();
  });

  // ==========================================================================
  // Constructor Tests
  // ==========================================================================

  describe('Constructor', () => {
    it('should create StorageQuotaService instance', () => {
      expect(quotaService).toBeInstanceOf(StorageQuotaService);
    });
  });

  // ==========================================================================
  // getStorageInfo() Tests
  // ==========================================================================

  describe('getStorageInfo()', () => {
    it('should return empty storage info when localStorage is empty', () => {
      const info = quotaService.getStorageInfo();

      expect(info.used).toBe(0);
      expect(info.quota).toBeGreaterThan(0);
      expect(info.percentage).toBe(0);
      expect(info.breakdown).toHaveLength(0);
    });

    it('should calculate storage usage for single item', () => {
      localStorage.setItem('test-key', 'test-value');

      const info = quotaService.getStorageInfo();

      // Key: 8 chars * 2 = 16 bytes
      // Value: 10 chars * 2 = 20 bytes
      // Total: 36 bytes expected
      expect(info.used).toBe(36);
      expect(info.percentage).toBeGreaterThanOrEqual(0); // Small percentage but valid
      expect(info.breakdown).toHaveLength(1);
      expect(info.breakdown[0]?.key).toBe('test-key');
      expect(info.breakdown[0]?.size).toBe(36);
    });

    it('should calculate storage usage for multiple items', () => {
      localStorage.setItem('key1', 'value1');
      localStorage.setItem('key2', 'value2');
      localStorage.setItem('key3', 'value3');

      const info = quotaService.getStorageInfo();

      expect(info.used).toBeGreaterThan(0);
      expect(info.breakdown).toHaveLength(3);
    });

    it('should sort breakdown by size (largest first)', () => {
      localStorage.setItem('small', 'a');
      localStorage.setItem('large', 'x'.repeat(1000));
      localStorage.setItem('medium', 'y'.repeat(100));

      const info = quotaService.getStorageInfo();

      expect(info.breakdown[0]?.key).toBe('large');
      expect(info.breakdown[1]?.key).toBe('medium');
      expect(info.breakdown[2]?.key).toBe('small');
    });

    it('should calculate percentages for breakdown items', () => {
      localStorage.setItem('item1', 'value1');
      localStorage.setItem('item2', 'value2');

      const info = quotaService.getStorageInfo();

      const totalPercentage = info.breakdown.reduce((sum, item) => sum + item.percentage, 0);
      expect(Math.round(totalPercentage)).toBe(100);
    });

    it('should handle large data correctly', () => {
      const largeData = 'x'.repeat(100000);
      localStorage.setItem('large-item', largeData);

      const info = quotaService.getStorageInfo();

      expect(info.used).toBeGreaterThan(100000);
      expect(info.percentage).toBeGreaterThan(0);
    });

    it('should include both key and value in size calculation', () => {
      const key = 'test-key';
      const value = 'test-value';
      localStorage.setItem(key, value);

      const info = quotaService.getStorageInfo();
      const expectedSize = (key.length + value.length) * 2; // UTF-16 encoding

      expect(info.breakdown[0]?.size).toBe(expectedSize);
    });
  });

  // ==========================================================================
  // checkQuota() Tests
  // ==========================================================================

  describe('checkQuota()', () => {
    it('should allow operation when storage is empty', () => {
      const result = quotaService.checkQuota();

      expect(result.canProceed).toBe(true);
      expect(result.warning).toBeUndefined();
      expect(result.error).toBeUndefined();
    });

    it('should allow operation with small data', () => {
      localStorage.setItem('small-data', 'small value');

      const result = quotaService.checkQuota(1000);

      expect(result.canProceed).toBe(true);
      expect(result.warning).toBeUndefined();
    });

    it('should warn when approaching 80% capacity', () => {
      // Fill storage to ~85% (assuming 5MB quota)
      const largeData = 'x'.repeat(2 * 1024 * 1024); // ~4MB
      localStorage.setItem('large-data', largeData);

      const result = quotaService.checkQuota();

      expect(result.canProceed).toBe(true);
      expect(result.warning).toBeDefined();
      expect(result.warning).toContain('Storage is');
      expect(result.warning).toContain('full');
    });

    it('should prevent operation at 95% capacity', () => {
      // Fill storage to ~96% (assuming 5MB quota)
      const largeData = 'x'.repeat(2.4 * 1024 * 1024); // ~4.8MB
      localStorage.setItem('large-data', largeData);

      const result = quotaService.checkQuota();

      expect(result.canProceed).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('quota exceeded');
    });

    it('should consider estimated size in quota check', () => {
      // Fill to 70%
      const largeData = 'x'.repeat(1.75 * 1024 * 1024); // ~3.5MB
      localStorage.setItem('existing-data', largeData);

      // Try to add data that would push over 95%
      const estimatedSize = 1.5 * 1024 * 1024 * 2; // ~1.5MB in bytes

      const result = quotaService.checkQuota(estimatedSize);

      expect(result.canProceed).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should include storage info in result', () => {
      const testData = 'x'.repeat(100);
      localStorage.setItem('test-data', testData);

      const result = quotaService.checkQuota();

      expect(result.info).toBeDefined();
      expect(result.info.used).toBeGreaterThan(0);
      expect(result.info.quota).toBeGreaterThan(0);
      expect(result.info.percentage).toBeGreaterThanOrEqual(0);
    });

    it('should include top items in warning message', () => {
      localStorage.setItem('item1', 'x'.repeat(1000));
      localStorage.setItem('item2', 'y'.repeat(2000));
      localStorage.setItem('item3', 'z'.repeat(3000));

      // Fill to trigger warning
      const largeData = 'a'.repeat(2 * 1024 * 1024);
      localStorage.setItem('large', largeData);

      const result = quotaService.checkQuota();

      if (result.warning) {
        expect(result.warning).toContain('Largest items');
        expect(result.warning).toContain('large');
      }
    });

    it('should include top items in error message', () => {
      localStorage.setItem('item1', 'x'.repeat(1000));
      localStorage.setItem('item2', 'y'.repeat(2000));

      // Fill to trigger error
      const largeData = 'a'.repeat(2.4 * 1024 * 1024);
      localStorage.setItem('huge', largeData);

      const result = quotaService.checkQuota();

      expect(result.error).toContain('Largest items');
      expect(result.error).toContain('huge');
    });
  });

  // ==========================================================================
  // calculateSize() Tests
  // ==========================================================================

  describe('calculateSize()', () => {
    it('should calculate size for empty string', () => {
      const size = quotaService.calculateSize('');

      expect(size).toBe(0);
    });

    it('should calculate size for ASCII characters', () => {
      const text = 'hello';
      const size = quotaService.calculateSize(text);

      // UTF-16 encoding: 2 bytes per character
      expect(size).toBe(text.length * 2);
    });

    it('should calculate size for unicode characters', () => {
      const text = '你好世界'; // Chinese characters
      const size = quotaService.calculateSize(text);

      expect(size).toBe(text.length * 2);
    });

    it('should calculate size for JSON string', () => {
      const json = JSON.stringify({ key: 'value', number: 123 });
      const size = quotaService.calculateSize(json);

      expect(size).toBe(json.length * 2);
    });

    it('should calculate size for large string', () => {
      const largeString = 'x'.repeat(100000);
      const size = quotaService.calculateSize(largeString);

      expect(size).toBe(200000); // 100000 * 2
    });
  });

  // ==========================================================================
  // formatSize() Tests
  // ==========================================================================

  describe('formatSize()', () => {
    it('should format bytes correctly', () => {
      expect(quotaService.formatSize(0)).toBe('0 B');
      expect(quotaService.formatSize(100)).toBe('100 B');
      expect(quotaService.formatSize(1023)).toBe('1023 B');
    });

    it('should format kilobytes correctly', () => {
      expect(quotaService.formatSize(1024)).toBe('1 KB');
      expect(quotaService.formatSize(1536)).toBe('1.5 KB');
      expect(quotaService.formatSize(10240)).toBe('10 KB');
    });

    it('should format megabytes correctly', () => {
      expect(quotaService.formatSize(1024 * 1024)).toBe('1 MB');
      expect(quotaService.formatSize(1.5 * 1024 * 1024)).toBe('1.5 MB');
      expect(quotaService.formatSize(5 * 1024 * 1024)).toBe('5 MB');
    });

    it('should round to 1 decimal place', () => {
      expect(quotaService.formatSize(1536)).toBe('1.5 KB');
      expect(quotaService.formatSize(1587)).toBe('1.5 KB'); // 1.55 rounds to 1.5
      expect(quotaService.formatSize(1638)).toBe('1.6 KB'); // 1.6 stays 1.6
    });
  });

  // ==========================================================================
  // Integration Tests
  // ==========================================================================

  describe('Integration', () => {
    it('should monitor storage throughout lifecycle', () => {
      // Start empty
      let info = quotaService.getStorageInfo();
      expect(info.percentage).toBe(0);

      // Add some data
      localStorage.setItem('data1', 'x'.repeat(1000));
      info = quotaService.getStorageInfo();
      expect(info.percentage).toBeGreaterThan(0);

      // Add more data
      localStorage.setItem('data2', 'y'.repeat(2000));
      info = quotaService.getStorageInfo();
      const midPercentage = info.percentage;
      expect(midPercentage).toBeGreaterThan(0);

      // Remove data
      localStorage.removeItem('data1');
      info = quotaService.getStorageInfo();
      expect(info.percentage).toBeLessThan(midPercentage);
    });

    it('should handle real-world vault data', () => {
      const mockVault = {
        version: 1,
        sites: Array.from({ length: 50 }, (_, i) => ({
          id: `site-${i}`,
          siteName: `Site ${i}`,
          url: `https://example${i}.com`,
          username: `user${i}@example.com`,
          password: 'x'.repeat(50), // Encrypted password
          iv: 'y'.repeat(24),
          createdAt: Date.now(),
          lastModified: Date.now(),
        })),
      };

      const vaultJson = JSON.stringify(mockVault);
      localStorage.setItem('pwgen_vault_user-123', vaultJson);

      const info = quotaService.getStorageInfo();
      expect(info.used).toBeGreaterThan(0);
      expect(info.breakdown[0]?.key).toBe('pwgen_vault_user-123');
      expect(info.breakdown[0]?.percentage).toBeGreaterThan(90); // Should be largest item
    });

    it('should help prevent quota exceeded errors', () => {
      // Fill storage to near quota (simulate ~96% full with 5MB quota)
      const largeData = 'x'.repeat(2.4 * 1024 * 1024); // ~4.8MB worth of data
      localStorage.setItem('large-vault', largeData);

      // Try to add more data
      const newSiteData = 'y'.repeat(100000);
      const estimatedSize = quotaService.calculateSize(newSiteData);
      
      const result = quotaService.checkQuota(estimatedSize);
      
      // Should prevent operation since we're already at 96%
      expect(result.canProceed).toBe(false);
      expect(result.error).toBeDefined();
      
      // Verify storage info
      const info = quotaService.getStorageInfo();
      expect(info.percentage).toBeGreaterThan(90);
    });
  });
});
