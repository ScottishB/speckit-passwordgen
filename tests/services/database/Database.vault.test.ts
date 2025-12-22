/**
 * Database Vault Methods Tests
 * 
 * Tests for encrypted vault methods in the Database service
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Database } from '../../../src/services/database';
import type { User } from '../../../src/models/User';

describe('Database - Vault Methods', () => {
  let database: Database;

  // Helper function to create a test user
  const createTestUser = (overrides: Partial<User> = {}): User => ({
    id: 'test-user-id',
    username: 'testuser',
    passwordHash: '$argon2id$v=19$m=65536,t=3,p=1$...',
    salt: 'dGVzdHNhbHQ=',
    totpSecret: null,
    backupCodes: [],
    backupCodesUsed: [],
    createdAt: Date.now(),
    lastLogin: null,
    failedLoginAttempts: 0,
    lastFailedLogin: null,
    accountLockedUntil: null,
    ...overrides,
  });

  // Helper function to create encrypted vault data
  const createEncryptedVaultData = (sites: number = 3): string => {
    const vaultData = {
      version: 1,
      sites: Array.from({ length: sites }, (_, i) => ({
        id: `site-${i + 1}`,
        siteName: `example${i + 1}.com`,
        username: `user${i + 1}`,
        encryptedPassword: `encrypted-password-${i + 1}`,
        iv: `iv-${i + 1}`,
        authTag: `authTag-${i + 1}`,
      })),
    };
    return JSON.stringify(vaultData);
  };

  beforeEach(async () => {
    // Clear localStorage before each test
    localStorage.clear();
    
    database = new Database();
    await database.initialize();
  });

  afterEach(async () => {
    await database.close();
    localStorage.clear();
  });

  // ==========================================================================
  // saveVault() Tests
  // ==========================================================================

  describe('saveVault()', () => {
    it('should save encrypted vault data', async () => {
      const userId = 'user-123';
      const encryptedData = createEncryptedVaultData();

      await database.saveVault(userId, encryptedData);

      const stored = localStorage.getItem(`pwgen_vault_${userId}`);
      expect(stored).toBe(encryptedData);
    });

    it('should overwrite existing vault data', async () => {
      const userId = 'user-123';
      const initialData = createEncryptedVaultData(2);
      const updatedData = createEncryptedVaultData(5);

      await database.saveVault(userId, initialData);
      await database.saveVault(userId, updatedData);

      const stored = localStorage.getItem(`pwgen_vault_${userId}`);
      expect(stored).toBe(updatedData);
    });

    it('should save vaults for multiple users', async () => {
      await database.saveVault('user-1', createEncryptedVaultData(3));
      await database.saveVault('user-2', createEncryptedVaultData(2));
      await database.saveVault('user-3', createEncryptedVaultData(5));

      const vault1 = await database.getVault('user-1');
      const vault2 = await database.getVault('user-2');
      const vault3 = await database.getVault('user-3');

      expect(vault1).not.toBeNull();
      expect(vault2).not.toBeNull();
      expect(vault3).not.toBeNull();
    });

    it('should throw error if database not initialized', async () => {
      const uninitializedDb = new Database();
      const encryptedData = createEncryptedVaultData();

      await expect(uninitializedDb.saveVault('user-1', encryptedData)).rejects.toThrow('Database not initialized');
    });

    it('should persist vault immediately to localStorage', async () => {
      const userId = 'user-123';
      const encryptedData = createEncryptedVaultData();

      await database.saveVault(userId, encryptedData);

      // Verify it's in localStorage immediately
      const stored = localStorage.getItem(`pwgen_vault_${userId}`);
      expect(stored).toBe(encryptedData);
    });

    it('should handle empty vault data', async () => {
      const userId = 'user-123';
      const emptyVaultData = JSON.stringify({ version: 1, sites: [] });

      await database.saveVault(userId, emptyVaultData);

      const retrieved = await database.getVault(userId);
      expect(retrieved).toBe(emptyVaultData);
    });

    it('should handle large vault data', async () => {
      const userId = 'user-123';
      const largeVaultData = createEncryptedVaultData(1000);

      await database.saveVault(userId, largeVaultData);

      const retrieved = await database.getVault(userId);
      expect(retrieved).toBe(largeVaultData);
    });
  });

  // ==========================================================================
  // getVault() Tests
  // ==========================================================================

  describe('getVault()', () => {
    it('should retrieve encrypted vault data', async () => {
      const userId = 'user-123';
      const encryptedData = createEncryptedVaultData();

      await database.saveVault(userId, encryptedData);
      const retrieved = await database.getVault(userId);

      expect(retrieved).toBe(encryptedData);
    });

    it('should return null for non-existent vault', async () => {
      const retrieved = await database.getVault('non-existent-user');

      expect(retrieved).toBeNull();
    });

    it('should throw error if database not initialized', async () => {
      const uninitializedDb = new Database();

      await expect(uninitializedDb.getVault('user-1')).rejects.toThrow('Database not initialized');
    });

    it('should retrieve correct vault for specific user', async () => {
      await database.saveVault('user-1', createEncryptedVaultData(3));
      await database.saveVault('user-2', createEncryptedVaultData(2));
      await database.saveVault('user-3', createEncryptedVaultData(5));

      const vault2 = await database.getVault('user-2');
      expect(vault2).not.toBeNull();
      
      const parsed = JSON.parse(vault2!);
      expect(parsed.sites).toHaveLength(2);
    });

    it('should handle localStorage errors gracefully', async () => {
      const userId = 'user-123';
      
      // Save vault first
      await database.saveVault(userId, createEncryptedVaultData());
      
      // Mock localStorage.getItem to throw an error
      const originalGetItem = localStorage.getItem;
      localStorage.getItem = () => {
        throw new Error('localStorage error');
      };

      const retrieved = await database.getVault(userId);
      expect(retrieved).toBeNull();

      // Restore original method
      localStorage.getItem = originalGetItem;
    });
  });

  // ==========================================================================
  // deleteVault() Tests
  // ==========================================================================

  describe('deleteVault()', () => {
    it('should delete vault data', async () => {
      const userId = 'user-123';
      await database.saveVault(userId, createEncryptedVaultData());

      await database.deleteVault(userId);

      const retrieved = await database.getVault(userId);
      expect(retrieved).toBeNull();
    });

    it('should remove vault from localStorage', async () => {
      const userId = 'user-123';
      await database.saveVault(userId, createEncryptedVaultData());

      await database.deleteVault(userId);

      const stored = localStorage.getItem(`pwgen_vault_${userId}`);
      expect(stored).toBeNull();
    });

    it('should only delete specified user vault', async () => {
      await database.saveVault('user-1', createEncryptedVaultData(3));
      await database.saveVault('user-2', createEncryptedVaultData(2));
      await database.saveVault('user-3', createEncryptedVaultData(5));

      await database.deleteVault('user-2');

      const vault1 = await database.getVault('user-1');
      const vault2 = await database.getVault('user-2');
      const vault3 = await database.getVault('user-3');

      expect(vault1).not.toBeNull();
      expect(vault2).toBeNull();
      expect(vault3).not.toBeNull();
    });

    it('should throw error if database not initialized', async () => {
      const uninitializedDb = new Database();

      await expect(uninitializedDb.deleteVault('user-1')).rejects.toThrow('Database not initialized');
    });

    it('should throw error if localStorage fails', async () => {
      const userId = 'user-123';
      await database.saveVault(userId, createEncryptedVaultData());

      // Mock localStorage.removeItem to throw an error
      const originalRemoveItem = localStorage.removeItem;
      localStorage.removeItem = () => {
        throw new Error('localStorage error');
      };

      await expect(database.deleteVault(userId)).rejects.toThrow('Failed to delete vault from storage');

      // Restore original method
      localStorage.removeItem = originalRemoveItem;
    });
  });

  // ==========================================================================
  // Integration Tests
  // ==========================================================================

  describe('Integration', () => {
    it('should handle full vault lifecycle', async () => {
      const userId = 'lifecycle-user';
      const initialData = createEncryptedVaultData(3);
      const updatedData = createEncryptedVaultData(5);

      // Create vault
      await database.saveVault(userId, initialData);
      let retrieved = await database.getVault(userId);
      expect(retrieved).toBe(initialData);

      // Update vault
      await database.saveVault(userId, updatedData);
      retrieved = await database.getVault(userId);
      expect(retrieved).toBe(updatedData);

      // Delete vault
      await database.deleteVault(userId);
      retrieved = await database.getVault(userId);
      expect(retrieved).toBeNull();
    });

    it('should handle multi-user vaults independently', async () => {
      const userData: Record<string, string> = {
        'user-1': createEncryptedVaultData(2),
        'user-2': createEncryptedVaultData(5),
        'user-3': createEncryptedVaultData(3),
      };

      // Save all vaults
      for (const [userId, data] of Object.entries(userData)) {
        await database.saveVault(userId, data);
      }

      // Verify all vaults exist and are independent
      for (const [userId, data] of Object.entries(userData)) {
        const retrieved = await database.getVault(userId);
        expect(retrieved).toBe(data);
      }

      // Update one vault
      const updatedData = createEncryptedVaultData(10);
      await database.saveVault('user-2', updatedData);

      // Verify only user-2's vault changed
      expect(await database.getVault('user-1')).toBe(userData['user-1']);
      expect(await database.getVault('user-2')).toBe(updatedData);
      expect(await database.getVault('user-3')).toBe(userData['user-3']);
    });

    it('should persist vault across database close and reopen', async () => {
      const userId = 'persistent-user';
      const encryptedData = createEncryptedVaultData(5);

      await database.saveVault(userId, encryptedData);
      await database.close();

      // Create new database instance
      const newDb = new Database();
      await newDb.initialize();

      const retrieved = await newDb.getVault(userId);
      expect(retrieved).toBe(encryptedData);

      await newDb.close();
    });

    it('should cascade delete vault when user is deleted', async () => {
      const user = createTestUser({ id: 'user-with-vault' });
      await database.saveUser(user);
      await database.saveVault('user-with-vault', createEncryptedVaultData());

      // Verify vault exists
      let vault = await database.getVault('user-with-vault');
      expect(vault).not.toBeNull();

      // Delete user (should cascade delete vault)
      await database.deleteUser('user-with-vault');

      // Verify vault is deleted
      vault = await database.getVault('user-with-vault');
      expect(vault).toBeNull();
    });

    it('should handle concurrent vault operations', async () => {
      const userId = 'concurrent-user';
      const operations = Array.from({ length: 5 }, (_, i) =>
        database.saveVault(userId, createEncryptedVaultData(i + 1))
      );

      await Promise.all(operations);

      // Last write should win
      const retrieved = await database.getVault(userId);
      expect(retrieved).not.toBeNull();
    });

    it('should use correct storage key pattern', async () => {
      const userId = 'test-user';
      const encryptedData = createEncryptedVaultData();

      await database.saveVault(userId, encryptedData);

      // Verify storage key follows pattern: pwgen_vault_${userId}
      const key = `pwgen_vault_${userId}`;
      const stored = localStorage.getItem(key);
      expect(stored).toBe(encryptedData);
    });

    it('should handle vault operations for user with special characters in ID', async () => {
      const userId = 'user-with-special-chars_123-456';
      const encryptedData = createEncryptedVaultData();

      await database.saveVault(userId, encryptedData);
      const retrieved = await database.getVault(userId);

      expect(retrieved).toBe(encryptedData);
    });

    it('should support storing complex encrypted vault structures', async () => {
      const userId = 'complex-vault-user';
      const complexVault = JSON.stringify({
        version: 2,
        metadata: {
          lastModified: Date.now(),
          deviceId: 'device-123',
          syncStatus: 'synced',
        },
        sites: [
          {
            id: 'site-1',
            siteName: 'example.com',
            username: 'user1',
            encryptedPassword: 'base64-encrypted-data-here',
            iv: 'base64-iv-here',
            authTag: 'base64-auth-tag-here',
            notes: 'Encrypted notes',
            customFields: [
              { name: 'Security Question', encryptedValue: 'encrypted-value', iv: 'iv', authTag: 'tag' },
            ],
            tags: ['work', 'important'],
            favorite: true,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
        ],
      });

      await database.saveVault(userId, complexVault);
      const retrieved = await database.getVault(userId);

      expect(retrieved).toBe(complexVault);
      const parsed = JSON.parse(retrieved!);
      expect(parsed.version).toBe(2);
      expect(parsed.sites[0].customFields).toHaveLength(1);
      expect(parsed.sites[0].tags).toEqual(['work', 'important']);
    });
  });
});
