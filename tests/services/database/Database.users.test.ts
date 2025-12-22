/**
 * Database User CRUD Tests
 * 
 * Tests for user management methods in the Database service
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Database } from '../../../src/services/database';
import type { User } from '../../../src/models/User';

describe('Database - User CRUD Methods', () => {
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
    lockedUntil: null,
    ...overrides,
  });

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
  // saveUser() Tests
  // ==========================================================================

  describe('saveUser()', () => {
    it('should save a new user', async () => {
      const user = createTestUser();

      const saved = await database.saveUser(user);

      expect(saved).toEqual(user);
      expect(saved.id).toBe(user.id);
    });

    it('should persist user to localStorage', async () => {
      const user = createTestUser();

      await database.saveUser(user);

      const stored = localStorage.getItem('pwgen_users');
      expect(stored).toBeDefined();
      
      const users = JSON.parse(stored!);
      expect(users).toHaveLength(1);
      expect(users[0].id).toBe(user.id);
    });

    it('should update existing user', async () => {
      const user = createTestUser();
      await database.saveUser(user);

      const updated = { ...user, username: 'updateduser' };
      const result = await database.saveUser(updated);

      expect(result.username).toBe('updateduser');
      
      const allUsers = await database.getAllUsers();
      expect(allUsers).toHaveLength(1);
    });

    it('should save multiple users', async () => {
      const user1 = createTestUser({ id: 'user-1', username: 'user1' });
      const user2 = createTestUser({ id: 'user-2', username: 'user2' });
      const user3 = createTestUser({ id: 'user-3', username: 'user3' });

      await database.saveUser(user1);
      await database.saveUser(user2);
      await database.saveUser(user3);

      const allUsers = await database.getAllUsers();
      expect(allUsers).toHaveLength(3);
    });

    it('should throw error if database not initialized', async () => {
      const uninitializedDb = new Database();
      const user = createTestUser();

      await expect(uninitializedDb.saveUser(user)).rejects.toThrow('Database not initialized');
    });
  });

  // ==========================================================================
  // getUser() Tests
  // ==========================================================================

  describe('getUser()', () => {
    it('should retrieve user by ID', async () => {
      const user = createTestUser({ id: 'test-id-123' });
      await database.saveUser(user);

      const retrieved = await database.getUser('test-id-123');

      expect(retrieved).not.toBeNull();
      expect(retrieved?.id).toBe('test-id-123');
      expect(retrieved?.username).toBe(user.username);
    });

    it('should return null for non-existent user', async () => {
      const retrieved = await database.getUser('non-existent-id');

      expect(retrieved).toBeNull();
    });

    it('should throw error if database not initialized', async () => {
      const uninitializedDb = new Database();

      await expect(uninitializedDb.getUser('any-id')).rejects.toThrow('Database not initialized');
    });

    it('should retrieve correct user from multiple users', async () => {
      await database.saveUser(createTestUser({ id: 'user-1', username: 'user1' }));
      await database.saveUser(createTestUser({ id: 'user-2', username: 'user2' }));
      await database.saveUser(createTestUser({ id: 'user-3', username: 'user3' }));

      const user = await database.getUser('user-2');

      expect(user?.username).toBe('user2');
    });
  });

  // ==========================================================================
  // getUserByUsername() Tests
  // ==========================================================================

  describe('getUserByUsername()', () => {
    it('should retrieve user by username', async () => {
      const user = createTestUser({ username: 'john_doe' });
      await database.saveUser(user);

      const retrieved = await database.getUserByUsername('john_doe');

      expect(retrieved).not.toBeNull();
      expect(retrieved?.username).toBe('john_doe');
      expect(retrieved?.id).toBe(user.id);
    });

    it('should return null for non-existent username', async () => {
      const retrieved = await database.getUserByUsername('non_existent');

      expect(retrieved).toBeNull();
    });

    it('should be case-sensitive', async () => {
      const user = createTestUser({ username: 'TestUser' });
      await database.saveUser(user);

      const retrieved = await database.getUserByUsername('testuser');

      expect(retrieved).toBeNull();
    });

    it('should throw error if database not initialized', async () => {
      const uninitializedDb = new Database();

      await expect(uninitializedDb.getUserByUsername('any-user')).rejects.toThrow('Database not initialized');
    });

    it('should retrieve correct user from multiple users', async () => {
      await database.saveUser(createTestUser({ id: 'user-1', username: 'alice' }));
      await database.saveUser(createTestUser({ id: 'user-2', username: 'bob' }));
      await database.saveUser(createTestUser({ id: 'user-3', username: 'charlie' }));

      const user = await database.getUserByUsername('bob');

      expect(user?.id).toBe('user-2');
    });
  });

  // ==========================================================================
  // getAllUsers() Tests
  // ==========================================================================

  describe('getAllUsers()', () => {
    it('should return empty array when no users exist', async () => {
      const users = await database.getAllUsers();

      expect(users).toEqual([]);
    });

    it('should return all users', async () => {
      await database.saveUser(createTestUser({ id: 'user-1', username: 'user1' }));
      await database.saveUser(createTestUser({ id: 'user-2', username: 'user2' }));
      await database.saveUser(createTestUser({ id: 'user-3', username: 'user3' }));

      const users = await database.getAllUsers();

      expect(users).toHaveLength(3);
      expect(users.map(u => u.username)).toEqual(['user1', 'user2', 'user3']);
    });

    it('should return copy of users array', async () => {
      await database.saveUser(createTestUser());

      const users1 = await database.getAllUsers();
      const users2 = await database.getAllUsers();

      expect(users1).not.toBe(users2);
      expect(users1).toEqual(users2);
    });

    it('should throw error if database not initialized', async () => {
      const uninitializedDb = new Database();

      await expect(uninitializedDb.getAllUsers()).rejects.toThrow('Database not initialized');
    });
  });

  // ==========================================================================
  // updateUser() Tests
  // ==========================================================================

  describe('updateUser()', () => {
    it('should update user username', async () => {
      const user = createTestUser({ username: 'oldname' });
      await database.saveUser(user);

      const updated = await database.updateUser(user.id, { username: 'newname' });

      expect(updated.username).toBe('newname');
      expect(updated.id).toBe(user.id);
    });

    it('should update user lastLogin', async () => {
      const user = createTestUser({ lastLogin: null });
      await database.saveUser(user);

      const loginTime = Date.now();
      const updated = await database.updateUser(user.id, { lastLogin: loginTime });

      expect(updated.lastLogin).toBe(loginTime);
    });

    it('should update multiple fields', async () => {
      const user = createTestUser({ failedLoginAttempts: 0, lockedUntil: null });
      await database.saveUser(user);

      const lockTime = Date.now() + 3600000;
      const updated = await database.updateUser(user.id, {
        failedLoginAttempts: 3,
        lockedUntil: lockTime,
      });

      expect(updated.failedLoginAttempts).toBe(3);
      expect(updated.lockedUntil).toBe(lockTime);
    });

    it('should not allow ID to be changed', async () => {
      const user = createTestUser({ id: 'original-id' });
      await database.saveUser(user);

      const updated = await database.updateUser('original-id', { id: 'new-id' } as any);

      expect(updated.id).toBe('original-id');
    });

    it('should persist updates to localStorage', async () => {
      const user = createTestUser();
      await database.saveUser(user);

      await database.updateUser(user.id, { username: 'updated' });

      const stored = localStorage.getItem('pwgen_users');
      const users = JSON.parse(stored!);
      expect(users[0].username).toBe('updated');
    });

    it('should throw error for non-existent user', async () => {
      await expect(
        database.updateUser('non-existent-id', { username: 'test' })
      ).rejects.toThrow('User not found');
    });

    it('should throw error if database not initialized', async () => {
      const uninitializedDb = new Database();

      await expect(
        uninitializedDb.updateUser('any-id', { username: 'test' })
      ).rejects.toThrow('Database not initialized');
    });

    it('should preserve fields not being updated', async () => {
      const user = createTestUser({
        username: 'testuser',
        passwordHash: 'hash123',
        salt: 'salt123',
        failedLoginAttempts: 5,
      });
      await database.saveUser(user);

      const updated = await database.updateUser(user.id, { username: 'newuser' });

      expect(updated.username).toBe('newuser');
      expect(updated.passwordHash).toBe('hash123');
      expect(updated.salt).toBe('salt123');
      expect(updated.failedLoginAttempts).toBe(5);
    });
  });

  // ==========================================================================
  // deleteUser() Tests
  // ==========================================================================

  describe('deleteUser()', () => {
    it('should delete user', async () => {
      const user = createTestUser();
      await database.saveUser(user);

      await database.deleteUser(user.id);

      const retrieved = await database.getUser(user.id);
      expect(retrieved).toBeNull();
    });

    it('should persist deletion to localStorage', async () => {
      const user = createTestUser();
      await database.saveUser(user);

      await database.deleteUser(user.id);

      const stored = localStorage.getItem('pwgen_users');
      const users = JSON.parse(stored!);
      expect(users).toHaveLength(0);
    });

    it('should delete user vault', async () => {
      const user = createTestUser({ id: 'vault-test-user' });
      await database.saveUser(user);
      await database.saveVault('vault-test-user', 'encrypted-vault-data');

      await database.deleteUser('vault-test-user');

      const vault = await database.getVault('vault-test-user');
      expect(vault).toBeNull();
    });

    it('should delete user sessions', async () => {
      const user = createTestUser({ id: 'session-test-user' });
      await database.saveUser(user);

      // Manually add sessions (session methods will be tested separately)
      const session = {
        id: 'session-1',
        userId: 'session-test-user',
        sessionToken: 'token',
        createdAt: Date.now(),
        lastActivity: Date.now(),
        expiresAt: Date.now() + 3600000,
        deviceInfo: 'test',
        ipAddress: 'local',
      };
      
      // Access private sessions array through save method (once implemented)
      // For now, just verify the deletion doesn't error
      await database.deleteUser('session-test-user');

      const retrieved = await database.getUser('session-test-user');
      expect(retrieved).toBeNull();
    });

    it('should throw error for non-existent user', async () => {
      await expect(
        database.deleteUser('non-existent-id')
      ).rejects.toThrow('User not found');
    });

    it('should throw error if database not initialized', async () => {
      const uninitializedDb = new Database();

      await expect(
        uninitializedDb.deleteUser('any-id')
      ).rejects.toThrow('Database not initialized');
    });

    it('should only delete specified user', async () => {
      await database.saveUser(createTestUser({ id: 'user-1', username: 'user1' }));
      await database.saveUser(createTestUser({ id: 'user-2', username: 'user2' }));
      await database.saveUser(createTestUser({ id: 'user-3', username: 'user3' }));

      await database.deleteUser('user-2');

      const allUsers = await database.getAllUsers();
      expect(allUsers).toHaveLength(2);
      expect(allUsers.map(u => u.id)).toEqual(['user-1', 'user-3']);
    });
  });

  // ==========================================================================
  // Integration Tests
  // ==========================================================================

  describe('Integration', () => {
    it('should handle full user lifecycle', async () => {
      // Create user
      const user = createTestUser({ username: 'lifecycle_user' });
      await database.saveUser(user);

      // Retrieve user
      let retrieved = await database.getUser(user.id);
      expect(retrieved?.username).toBe('lifecycle_user');

      // Update user
      await database.updateUser(user.id, { lastLogin: Date.now() });
      retrieved = await database.getUser(user.id);
      expect(retrieved?.lastLogin).not.toBeNull();

      // Delete user
      await database.deleteUser(user.id);
      retrieved = await database.getUser(user.id);
      expect(retrieved).toBeNull();
    });

    it('should persist across database close and reopen', async () => {
      const user = createTestUser({ username: 'persistent_user' });
      await database.saveUser(user);
      await database.close();

      // Create new database instance
      const newDb = new Database();
      await newDb.initialize();

      const retrieved = await newDb.getUserByUsername('persistent_user');
      expect(retrieved).not.toBeNull();
      expect(retrieved?.id).toBe(user.id);

      await newDb.close();
    });

    it('should handle multiple concurrent operations', async () => {
      const users = Array.from({ length: 10 }, (_, i) =>
        createTestUser({ id: `user-${i}`, username: `user${i}` })
      );

      // Save all users concurrently
      await Promise.all(users.map(u => database.saveUser(u)));

      const allUsers = await database.getAllUsers();
      expect(allUsers).toHaveLength(10);
    });
  });
});
