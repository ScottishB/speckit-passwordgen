import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MigrationService } from '../../../src/services/MigrationService';
import { AuthService } from '../../../src/services/AuthService';
import { SiteService } from '../../../src/services/SiteService';
import { CryptoService } from '../../../src/services/CryptoService';
import { SessionService } from '../../../src/services/SessionService';
import { SecurityLogService } from '../../../src/services/SecurityLogService';
import { Database } from '../../../src/services/database';

describe('MigrationService', () => {
  let database: Database;
  let cryptoService: CryptoService;
  let sessionService: SessionService;
  let securityLogService: SecurityLogService;
  let authService: AuthService;
  let siteService: SiteService;
  let migrationService: MigrationService;

  beforeEach(async () => {
    // Clear localStorage
    localStorage.clear();

    // Initialize services
    database = new Database();
    await database.initialize();

    cryptoService = new CryptoService();
    sessionService = new SessionService(database);
    securityLogService = new SecurityLogService(database);
    const totpService = new (await import('../../../src/services/TotpService')).TotpService();
    authService = new AuthService(cryptoService, sessionService, securityLogService, totpService, database);
    siteService = new SiteService(cryptoService, authService, database);
    migrationService = new MigrationService(authService, siteService);
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('Constructor', () => {
    it('should create MigrationService instance', () => {
      expect(migrationService).toBeInstanceOf(MigrationService);
    });

    it('should accept AuthService and SiteService dependencies', () => {
      const service = new MigrationService(authService, siteService);
      expect(service).toBeInstanceOf(MigrationService);
    });
  });

  describe('checkForOldData', () => {
    it('should return false when no legacy data exists', () => {
      const hasOldData = migrationService.checkForOldData();
      expect(hasOldData).toBe(false);
    });

    it('should return true when legacy data exists', () => {
      // Create mock legacy data
      const legacyData = [
        {
          id: 1,
          type: 'password' as const,
          value: 'TestPassword123!',
          length: 16,
          includeNumbers: true,
          includeSymbols: true,
          includeUppercase: true,
          timestamp: Date.now() - 86400000 // 1 day ago
        }
      ];

      localStorage.setItem('password-gen-credentials', JSON.stringify(legacyData));

      const hasOldData = migrationService.checkForOldData();
      expect(hasOldData).toBe(true);
    });

    it('should return false when legacy data is empty array', () => {
      localStorage.setItem('password-gen-credentials', JSON.stringify([]));

      const hasOldData = migrationService.checkForOldData();
      expect(hasOldData).toBe(false);
    });

    it('should return false when legacy data is malformed JSON', () => {
      localStorage.setItem('password-gen-credentials', '{invalid json}');

      const hasOldData = migrationService.checkForOldData();
      expect(hasOldData).toBe(false);
    });
  });

  describe('exportOldData', () => {
    it('should throw error when no legacy data exists', () => {
      expect(() => migrationService.exportOldData()).toThrow('No legacy data found to export');
    });

    it('should export legacy data as formatted JSON', () => {
      const legacyData = [
        {
          id: 1,
          type: 'password' as const,
          value: 'TestPassword123!',
          length: 16,
          includeNumbers: true,
          includeSymbols: true,
          includeUppercase: true,
          timestamp: Date.now()
        },
        {
          id: 2,
          type: 'passphrase' as const,
          value: 'correct-horse-battery-staple',
          wordCount: 4,
          timestamp: Date.now()
        }
      ];

      localStorage.setItem('password-gen-credentials', JSON.stringify(legacyData));

      const exportedData = migrationService.exportOldData();
      const parsed = JSON.parse(exportedData);

      expect(parsed).toHaveProperty('version', '1.0');
      expect(parsed).toHaveProperty('exportDate');
      expect(parsed).toHaveProperty('credentialCount', 2);
      expect(parsed.credentials).toHaveLength(2);
      expect(parsed.credentials[0]).toHaveProperty('id', 1);
      expect(parsed.credentials[0]).toHaveProperty('type', 'password');
      expect(parsed.credentials[0]).toHaveProperty('password', 'TestPassword123!');
      expect(parsed.credentials[1]).toHaveProperty('type', 'passphrase');
    });

    it('should include settings for password type credentials', () => {
      const legacyData = [
        {
          id: 1,
          type: 'password' as const,
          value: 'Test123!',
          length: 12,
          includeNumbers: true,
          includeSymbols: true,
          includeUppercase: false,
          timestamp: Date.now()
        }
      ];

      localStorage.setItem('password-gen-credentials', JSON.stringify(legacyData));

      const exportedData = migrationService.exportOldData();
      const parsed = JSON.parse(exportedData);

      expect(parsed.credentials[0].settings).toEqual({
        includeNumbers: true,
        includeSymbols: true,
        includeUppercase: false
      });
    });

    it('should format dates as ISO strings', () => {
      const timestamp = Date.now();
      const legacyData = [
        {
          id: 1,
          type: 'password' as const,
          value: 'Test123!',
          timestamp
        }
      ];

      localStorage.setItem('password-gen-credentials', JSON.stringify(legacyData));

      const exportedData = migrationService.exportOldData();
      const parsed = JSON.parse(exportedData);

      expect(parsed.credentials[0].createdAt).toBe(new Date(timestamp).toISOString());
    });
  });

  describe('getOldDataStats', () => {
    it('should return zero stats when no legacy data exists', () => {
      const stats = migrationService.getOldDataStats();

      expect(stats).toEqual({
        count: 0,
        passwords: 0,
        passphrases: 0,
        oldestDate: null,
        newestDate: null
      });
    });

    it('should return correct stats for legacy data', () => {
      const oldTimestamp = Date.now() - 86400000 * 7; // 7 days ago
      const newTimestamp = Date.now();

      const legacyData = [
        {
          id: 1,
          type: 'password' as const,
          value: 'Test1',
          timestamp: oldTimestamp
        },
        {
          id: 2,
          type: 'password' as const,
          value: 'Test2',
          timestamp: newTimestamp
        },
        {
          id: 3,
          type: 'passphrase' as const,
          value: 'Test3',
          timestamp: Date.now() - 86400000
        }
      ];

      localStorage.setItem('password-gen-credentials', JSON.stringify(legacyData));

      const stats = migrationService.getOldDataStats();

      expect(stats.count).toBe(3);
      expect(stats.passwords).toBe(2);
      expect(stats.passphrases).toBe(1);
      expect(stats.oldestDate).toBe(new Date(oldTimestamp).toISOString());
      expect(stats.newestDate).toBe(new Date(newTimestamp).toISOString());
    });

    it('should handle empty array gracefully', () => {
      localStorage.setItem('password-gen-credentials', JSON.stringify([]));

      const stats = migrationService.getOldDataStats();

      expect(stats).toEqual({
        count: 0,
        passwords: 0,
        passphrases: 0,
        oldestDate: null,
        newestDate: null
      });
    });
  });

  describe('deleteOldData', () => {
    it('should remove legacy data from localStorage', () => {
      const legacyData = [
        {
          id: 1,
          type: 'password' as const,
          value: 'Test123!',
          timestamp: Date.now()
        }
      ];

      localStorage.setItem('password-gen-credentials', JSON.stringify(legacyData));
      expect(localStorage.getItem('password-gen-credentials')).not.toBeNull();

      migrationService.deleteOldData();

      expect(localStorage.getItem('password-gen-credentials')).toBeNull();
    });

    it('should not throw error when no legacy data exists', () => {
      expect(() => migrationService.deleteOldData()).not.toThrow();
    });
  });

  describe('migrateToNewUser', () => {
    it('should throw error when no legacy data exists', async () => {
      await expect(
        migrationService.migrateToNewUser('testuser', 'TestPassword123!')
      ).rejects.toThrow('No legacy data found to migrate');
    });

    it('should throw error when legacy data is empty', async () => {
      localStorage.setItem('password-gen-credentials', JSON.stringify([]));

      await expect(
        migrationService.migrateToNewUser('testuser', 'TestPassword123!')
      ).rejects.toThrow('Legacy data is empty or invalid');
    });

    it('should create new user and migrate credentials', async () => {
      const legacyData = [
        {
          id: 1,
          type: 'password' as const,
          value: 'LegacyPassword123!',
          length: 18,
          includeNumbers: true,
          includeSymbols: true,
          includeUppercase: true,
          timestamp: Date.now() - 86400000
        },
        {
          id: 2,
          type: 'passphrase' as const,
          value: 'correct-horse-battery-staple',
          wordCount: 4,
          timestamp: Date.now()
        }
      ];

      localStorage.setItem('password-gen-credentials', JSON.stringify(legacyData));

      await migrationService.migrateToNewUser('newuser', 'NewPassword123!');

      // Verify user was created
      const user = await database.getUserByUsername('newuser');
      expect(user).not.toBeNull();
      expect(user?.username).toBe('newuser');

      // Verify user is logged in
      expect(authService.getCurrentUser()).not.toBeNull();
      expect(authService.getCurrentUser()?.username).toBe('newuser');

      // Verify credentials were migrated to vault as sites
      const sites = await siteService.getAllSites();
      expect(sites).toHaveLength(2);

      // Verify first credential (password type)
      const site1 = sites.find(s => s.siteName === 'Migrated Password #1');
      expect(site1).toBeDefined();
      expect(site1?.tags).toContain('migrated');
      expect(site1?.tags).toContain('password');
      expect(site1?.notes).toContain('Migrated from legacy password generator');
      expect(site1?.notes).toContain('Original ID: 1');

      // Verify second credential (passphrase type)
      const site2 = sites.find(s => s.siteName === 'Migrated Password #2');
      expect(site2).toBeDefined();
      expect(site2?.tags).toContain('migrated');
      expect(site2?.tags).toContain('passphrase');
    });

    it('should delete legacy data after successful migration', async () => {
      const legacyData = [
        {
          id: 1,
          type: 'password' as const,
          value: 'Test123!',
          timestamp: Date.now()
        }
      ];

      localStorage.setItem('password-gen-credentials', JSON.stringify(legacyData));

      await migrationService.migrateToNewUser('testuser', 'TestPassword123!');

      // Legacy data should be removed
      expect(localStorage.getItem('password-gen-credentials')).toBeNull();
    });

    it('should handle migration errors gracefully', async () => {
      const legacyData = [
        {
          id: 1,
          type: 'password' as const,
          value: 'Test123!',
          timestamp: Date.now()
        }
      ];

      localStorage.setItem('password-gen-credentials', JSON.stringify(legacyData));

      // Try to migrate with weak password (should fail validation)
      await expect(
        migrationService.migrateToNewUser('testuser', 'weak')
      ).rejects.toThrow();

      // Legacy data should still exist since migration failed
      expect(localStorage.getItem('password-gen-credentials')).not.toBeNull();
    });

    it('should migrate multiple credentials successfully', async () => {
      const legacyData = Array.from({ length: 5 }, (_, i) => ({
        id: i + 1,
        type: 'password' as const,
        value: `Password${i + 1}!`,
        length: 12,
        timestamp: Date.now() - (i * 1000)
      }));

      localStorage.setItem('password-gen-credentials', JSON.stringify(legacyData));

      await migrationService.migrateToNewUser('testuser', 'TestPassword123!');

      const sites = await siteService.getAllSites();
      expect(sites).toHaveLength(5);

      // Verify all sites have migrated tag
      sites.forEach(site => {
        expect(site.tags).toContain('migrated');
      });
    });

    it('should include migration notes with credential details', async () => {
      const timestamp = Date.now();
      const legacyData = [
        {
          id: 42,
          type: 'password' as const,
          value: 'Complex123!@#',
          length: 16,
          includeNumbers: true,
          includeSymbols: true,
          includeUppercase: true,
          timestamp
        }
      ];

      localStorage.setItem('password-gen-credentials', JSON.stringify(legacyData));

      await migrationService.migrateToNewUser('testuser', 'TestPassword123!');

      const sites = await siteService.getAllSites();
      expect(sites).toHaveLength(1);
      const migratedSite = sites[0]!;

      expect(migratedSite.notes).toContain('Migrated from legacy password generator');
      expect(migratedSite.notes).toContain('Original ID: 42');
      expect(migratedSite.notes).toContain('Length: 16');
      expect(migratedSite.notes).toContain('Settings: numbers, symbols, uppercase');
      expect(migratedSite.notes).toContain(new Date(timestamp).toLocaleString());
    });

    it('should handle passphrase type credentials differently in notes', async () => {
      const timestamp = Date.now();
      const legacyData = [
        {
          id: 1,
          type: 'passphrase' as const,
          value: 'correct-horse-battery-staple',
          wordCount: 4,
          timestamp
        }
      ];

      localStorage.setItem('password-gen-credentials', JSON.stringify(legacyData));

      await migrationService.migrateToNewUser('testuser', 'TestPassword123!');

      const sites = await siteService.getAllSites();
      expect(sites).toHaveLength(1);
      const migratedSite = sites[0]!;

      expect(migratedSite.notes).toContain('Word count: 4');
      expect(migratedSite.notes).not.toContain('Length:');
      expect(migratedSite.notes).not.toContain('Settings:');
    });

    it('should not keep legacy data if no credentials were migrated successfully', async () => {
      const legacyData = [
        {
          id: 1,
          type: 'password' as const,
          value: 'Test123!',
          timestamp: Date.now()
        }
      ];

      localStorage.setItem('password-gen-credentials', JSON.stringify(legacyData));

      // Mock siteService.createSite to always fail
      vi.spyOn(siteService, 'createSite').mockRejectedValue(new Error('Failed to create site'));

      await expect(
        migrationService.migrateToNewUser('testuser', 'TestPassword123!')
      ).rejects.toThrow('No credentials were successfully migrated');

      // Legacy data should still exist
      expect(localStorage.getItem('password-gen-credentials')).not.toBeNull();
    });
  });

  describe('Integration: Full Migration Flow', () => {
    it('should complete full migration workflow', async () => {
      // Step 1: Check for old data (should be false initially)
      expect(migrationService.checkForOldData()).toBe(false);

      // Step 2: Create mock legacy data
      const legacyData = [
        {
          id: 1,
          type: 'password' as const,
          value: 'MyOldPassword123!',
          length: 18,
          includeNumbers: true,
          includeSymbols: true,
          includeUppercase: true,
          timestamp: Date.now() - 86400000 * 30 // 30 days ago
        },
        {
          id: 2,
          type: 'passphrase' as const,
          value: 'random-words-here-test',
          wordCount: 4,
          timestamp: Date.now() - 86400000 * 15 // 15 days ago
        },
        {
          id: 3,
          type: 'password' as const,
          value: 'AnotherOne456$',
          length: 14,
          includeNumbers: true,
          includeSymbols: true,
          includeUppercase: false,
          timestamp: Date.now() - 86400000 // 1 day ago
        }
      ];

      localStorage.setItem('password-gen-credentials', JSON.stringify(legacyData));

      // Step 3: Verify old data is detected
      expect(migrationService.checkForOldData()).toBe(true);

      // Step 4: Get statistics
      const stats = migrationService.getOldDataStats();
      expect(stats.count).toBe(3);
      expect(stats.passwords).toBe(2);
      expect(stats.passphrases).toBe(1);

      // Step 5: Perform migration
      await migrationService.migrateToNewUser('migrateduser', 'SecurePassword123!@#');

      // Step 6: Verify user is created and logged in
      const currentUser = authService.getCurrentUser();
      expect(currentUser).not.toBeNull();
      expect(currentUser?.username).toBe('migrateduser');

      // Step 7: Verify all credentials are migrated
      const sites = await siteService.getAllSites();
      expect(sites).toHaveLength(3);

      // Step 8: Verify legacy data is deleted
      expect(migrationService.checkForOldData()).toBe(false);
      expect(localStorage.getItem('password-gen-credentials')).toBeNull();

      // Step 9: Verify migrated sites have correct attributes
      sites.forEach(site => {
        expect(site.tags).toContain('migrated');
        expect(site.siteName).toMatch(/Migrated Password #\d/);
        expect(site.notes).toContain('Migrated from legacy password generator');
        expect(site.userId).toBe(currentUser?.id);
      });
    });

    it('should handle export workflow correctly', async () => {
      // Create legacy data
      const legacyData = [
        {
          id: 1,
          type: 'password' as const,
          value: 'ExportTest123!',
          timestamp: Date.now()
        }
      ];

      localStorage.setItem('password-gen-credentials', JSON.stringify(legacyData));

      // Export data
      const exportedData = migrationService.exportOldData();
      expect(exportedData).toBeTruthy();

      const parsed = JSON.parse(exportedData);
      expect(parsed.credentialCount).toBe(1);

      // Delete old data (user chose "Start Fresh")
      migrationService.deleteOldData();

      // Verify data is deleted
      expect(migrationService.checkForOldData()).toBe(false);
    });
  });
});
