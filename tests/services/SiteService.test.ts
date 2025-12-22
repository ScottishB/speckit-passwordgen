import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SiteService, SiteError } from '../../src/services/SiteService';
import { CryptoService } from '../../src/services/CryptoService';
import { Database } from '../../src/services/database';
import type { Site, CreateSiteInput, UpdateSiteInput } from '../../src/models/Site';
import type { User } from '../../src/models/User';
import type { AuthService } from '../../src/services/AuthService';

// Mock AuthService to avoid argon2-browser WASM issues in Node.js
const createMockAuthService = (mockUser: User | null) => {
  return {
    getCurrentUser: vi.fn(() => mockUser),
    getCurrentSession: vi.fn(() => null),
    isAuthenticated: vi.fn(() => mockUser !== null),
  } as unknown as AuthService;
};

describe('SiteService', () => {
  let siteService: SiteService;
  let cryptoService: CryptoService;
  let mockAuthService: AuthService;
  let database: Database;
  let mockUser: User;

  beforeEach(async () => {
    database = new Database();
    await database.initialize();
    
    cryptoService = new CryptoService();
    
    // Create mock user
    mockUser = {
      id: 'test-user-id',
      username: 'testuser',
      passwordHash: 'hash',
      salt: 'salt',
      createdAt: Date.now(),
      failedLoginAttempts: 0,
      lastLogin: null,
      lastFailedLogin: null,
      accountLockedUntil: null,
      totpSecret: null,
      backupCodes: [],
      backupCodesUsed: []
    };

    mockAuthService = createMockAuthService(mockUser);
    siteService = new SiteService(cryptoService, mockAuthService, database);
  });

  afterEach(() => {
    // Clear localStorage between tests
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
  });

  describe('CRUD Operations', () => {
    describe('createSite', () => {
      it('should create a site with valid input', async () => {
        const input: CreateSiteInput = {
          userId: mockUser.id,
          siteName: 'GitHub',
          url: 'https://github.com',
          username: 'testuser',
          password: 'SecurePassword123!',
          notes: 'My GitHub account'
        };

        const site = await siteService.createSite(input);

        expect(site.id).toBeDefined();
        expect(site.siteName).toBe('GitHub');
        expect(site.url).toBe('https://github.com');
        expect(site.username).toBe('testuser');
        expect(site.encryptedPassword).toBe('SecurePassword123!');
        expect(site.notes).toBe('My GitHub account');
        expect(site.createdAt).toBeGreaterThan(0);
        expect(site.lastModified).toBeGreaterThan(0);
      });

      it('should trim whitespace from input fields', async () => {
        const input: CreateSiteInput = {
          userId: mockUser.id,
          siteName: '  GitHub  ',
          url: '  https://github.com  ',
          username: '  testuser  ',
          password: '  SecurePassword123!  ',
          notes: '  My GitHub account  '
        };

        const site = await siteService.createSite(input);

        expect(site.siteName).toBe('GitHub');
        expect(site.url).toBe('https://github.com');
        expect(site.username).toBe('testuser');
        expect(site.encryptedPassword).toBe('SecurePassword123!');
        expect(site.notes).toBe('My GitHub account');
      });

      it('should throw error if siteName is empty', async () => {
        const input: CreateSiteInput = {
          userId: mockUser.id,
          siteName: '',
          url: 'https://github.com',
          username: 'testuser',
          password: 'SecurePassword123!'
        };

        await expect(siteService.createSite(input)).rejects.toThrow('Site name is required');
      });

      it('should throw error if user is not authenticated', async () => {
        mockAuthService = createMockAuthService(null);
        siteService = new SiteService(cryptoService, mockAuthService, database);

        const input: CreateSiteInput = {
          userId: mockUser.id,
          siteName: 'GitHub',
          url: 'https://github.com',
          username: 'testuser',
          password: 'SecurePassword123!'
        };

        await expect(siteService.createSite(input)).rejects.toThrow('User must be authenticated to perform this operation');
      });
    });

    describe('getAllSites', () => {
      it('should return all sites for current user', async () => {
        const input1: CreateSiteInput = {
          userId: mockUser.id,
          siteName: 'GitHub',
          url: 'https://github.com',
          username: 'testuser',
          password: 'SecurePassword123!'
        };

        const input2: CreateSiteInput = {
          userId: mockUser.id,
          siteName: 'GitLab',
          url: 'https://gitlab.com',
          username: 'testuser',
          password: 'SecurePassword456!'
        };

        await siteService.createSite(input1);
        // Small delay to ensure different timestamps
        await new Promise(resolve => setTimeout(resolve, 10));
        await siteService.createSite(input2);

        const sites = await siteService.getAllSites();

        expect(sites).toHaveLength(2);
        expect(sites[0]?.siteName).toBe('GitLab'); // Most recent first
        expect(sites[1]?.siteName).toBe('GitHub');
      });

      it('should return empty array if no sites', async () => {
        const sites = await siteService.getAllSites();

        expect(sites).toEqual([]);
      });
    });

    describe('searchSites', () => {
      beforeEach(async () => {
        await siteService.createSite({
          userId: mockUser.id,
          siteName: 'GitHub',
          url: 'https://github.com',
          username: 'testuser',
          password: 'pass1'
        });

        await siteService.createSite({
          userId: mockUser.id,
          siteName: 'GitLab',
          url: 'https://gitlab.com',
          username: 'testuser',
          password: 'pass2'
        });
      });

      it('should search by site name (case-insensitive)', async () => {
        const results = await siteService.searchSites('github');

        expect(results).toHaveLength(1);
        expect(results[0]?.siteName).toBe('GitHub');
      });

      it('should return all sites if query is empty', async () => {
        const results = await siteService.searchSites('');

        expect(results).toHaveLength(2);
      });
    });

    describe('validateUrlOrIp', () => {
      it('should validate https URL', () => {
        const result = siteService.validateUrlOrIp('https://example.com');

        expect(result.valid).toBe(true);
        expect(result.type).toBe('url');
        expect(result.warning).toBeNull();
      });

      it('should validate IPv4 address', () => {
        const result = siteService.validateUrlOrIp('192.168.1.1');

        expect(result.valid).toBe(true);
        expect(result.type).toBe('ip');
        expect(result.warning).toBeNull();
      });

      it('should reject empty string', () => {
        const result = siteService.validateUrlOrIp('');

        expect(result.valid).toBe(false);
        expect(result.warning).toBe('URL or IP address is required');
      });

      it('should validate http URL', () => {
        const result = siteService.validateUrlOrIp('http://example.com');

        expect(result.valid).toBe(true);
        expect(result.type).toBe('url');
      });

      it('should validate IPv6 address', () => {
        const result = siteService.validateUrlOrIp('2001:0db8:85a3:0000:0000:8a2e:0370:7334');

        expect(result.valid).toBe(true);
        expect(result.type).toBe('ip');
      });

      it('should validate IPv6 localhost', () => {
        const result = siteService.validateUrlOrIp('::1');

        expect(result.valid).toBe(true);
        expect(result.type).toBe('ip');
      });

      it('should reject invalid URL', () => {
        const result = siteService.validateUrlOrIp('not a valid url');

        expect(result.valid).toBe(false);
      });
    });

    describe('getSite', () => {
      let siteId: string;

      beforeEach(async () => {
        const input: CreateSiteInput = {
          userId: mockUser.id,
          siteName: 'GitHub',
          url: 'https://github.com',
          username: 'testuser',
          password: 'SecurePassword123!'
        };
        const site = await siteService.createSite(input);
        siteId = site.id;
      });

      it('should retrieve site by ID', async () => {
        const site = await siteService.getSite(siteId);

        expect(site).not.toBeNull();
        expect(site?.siteName).toBe('GitHub');
        expect(site?.username).toBe('testuser');
      });

      it('should return null for non-existent site', async () => {
        const site = await siteService.getSite('non-existent-id');

        expect(site).toBeNull();
      });

      it('should throw error if user is not authenticated', async () => {
        const unauthService = new SiteService(cryptoService, createMockAuthService(null), database);

        await expect(unauthService.getSite(siteId)).rejects.toThrow('User must be authenticated to perform this operation');
      });
    });

    describe('updateSite', () => {
      let siteId: string;

      beforeEach(async () => {
        const input: CreateSiteInput = {
          userId: mockUser.id,
          siteName: 'GitHub',
          url: 'https://github.com',
          username: 'testuser',
          password: 'SecurePassword123!'
        };
        const site = await siteService.createSite(input);
        siteId = site.id;
      });

      it('should update site with all fields', async () => {
        const update: UpdateSiteInput = {
          siteName: 'GitHub Enterprise',
          url: 'https://github.enterprise.com',
          username: 'newuser',
          password: 'NewPassword456!',
          notes: 'Updated notes'
        };

        const updated = await siteService.updateSite(siteId, update);

        expect(updated?.siteName).toBe('GitHub Enterprise');
        expect(updated?.url).toBe('https://github.enterprise.com');
        expect(updated?.username).toBe('newuser');
        expect(updated?.encryptedPassword).toBe('NewPassword456!');
        expect(updated?.notes).toBe('Updated notes');
      });

      it('should update site with partial fields', async () => {
        const update: UpdateSiteInput = {
          siteName: 'GitHub Updated'
        };

        const updated = await siteService.updateSite(siteId, update);

        expect(updated?.siteName).toBe('GitHub Updated');
        expect(updated?.username).toBe('testuser');
      });

      it('should trim whitespace from updated fields', async () => {
        const update: UpdateSiteInput = {
          siteName: '  Trimmed Site  ',
          username: '  trimmed_user  '
        };

        const updated = await siteService.updateSite(siteId, update);

        expect(updated?.siteName).toBe('Trimmed Site');
        expect(updated?.username).toBe('trimmed_user');
      });

      it('should return null for non-existent site', async () => {
        const update: UpdateSiteInput = {
          siteName: 'Updated'
        };

        const updated = await siteService.updateSite('non-existent-id', update);

        expect(updated).toBeNull();
      });

      it('should throw error if user is not authenticated', async () => {
        const unauthService = new SiteService(cryptoService, createMockAuthService(null), database);
        const update: UpdateSiteInput = {
          siteName: 'Updated'
        };

        await expect(unauthService.updateSite(siteId, update)).rejects.toThrow('User must be authenticated to perform this operation');
      });
    });

    describe('deleteSite', () => {
      let siteId: string;

      beforeEach(async () => {
        const input: CreateSiteInput = {
          userId: mockUser.id,
          siteName: 'GitHub',
          url: 'https://github.com',
          username: 'testuser',
          password: 'SecurePassword123!'
        };
        const site = await siteService.createSite(input);
        siteId = site.id;
      });

      it('should delete site by ID', async () => {
        const result = await siteService.deleteSite(siteId);

        expect(result).toBe(true);

        const sites = await siteService.getAllSites();
        expect(sites).toHaveLength(0);
      });

      it('should return false for non-existent site', async () => {
        const result = await siteService.deleteSite('non-existent-id');

        expect(result).toBe(false);
      });

      it('should throw error if user is not authenticated', async () => {
        const unauthService = new SiteService(cryptoService, createMockAuthService(null), database);

        await expect(unauthService.deleteSite(siteId)).rejects.toThrow('User must be authenticated to perform this operation');
      });
    });

    describe('sortSites', () => {
      let sites: Site[];

      beforeEach(async () => {
        const input1: CreateSiteInput = {
          userId: mockUser.id,
          siteName: 'Zebra',
          url: 'https://zebra.com',
          username: 'user1',
          password: 'pass1'
        };
        await siteService.createSite(input1);
        await new Promise(resolve => setTimeout(resolve, 10));

        const input2: CreateSiteInput = {
          userId: mockUser.id,
          siteName: 'Apple',
          url: 'https://apple.com',
          username: 'user2',
          password: 'pass2'
        };
        await siteService.createSite(input2);
        await new Promise(resolve => setTimeout(resolve, 10));

        const input3: CreateSiteInput = {
          userId: mockUser.id,
          siteName: 'Microsoft',
          url: 'https://microsoft.com',
          username: 'user3',
          password: 'pass3'
        };
        await siteService.createSite(input3);

        sites = await siteService.getAllSites();
      });

      it('should sort by name ascending', () => {
        const sorted = siteService.sortSites(sites, 'name', 'asc');

        expect(sorted[0]?.siteName).toBe('Apple');
        expect(sorted[1]?.siteName).toBe('Microsoft');
        expect(sorted[2]?.siteName).toBe('Zebra');
      });

      it('should sort by name descending', () => {
        const sorted = siteService.sortSites(sites, 'name', 'desc');

        expect(sorted[0]?.siteName).toBe('Zebra');
        expect(sorted[1]?.siteName).toBe('Microsoft');
        expect(sorted[2]?.siteName).toBe('Apple');
      });

      it('should sort by dateAdded ascending', () => {
        const sorted = siteService.sortSites(sites, 'dateAdded', 'asc');

        expect(sorted[0]?.siteName).toBe('Zebra');
        expect(sorted[2]?.siteName).toBe('Microsoft');
      });

      it('should sort by dateModified descending', () => {
        const sorted = siteService.sortSites(sites, 'dateModified', 'desc');

        expect(sorted[0]?.siteName).toBe('Microsoft');
        expect(sorted[2]?.siteName).toBe('Zebra');
      });

      it('should not mutate original array', () => {
        const original = [...sites];
        siteService.sortSites(sites, 'name', 'asc');

        expect(sites).toEqual(original);
      });
    });

    describe('checkPasswordReuse', () => {
      beforeEach(async () => {
        const input1: CreateSiteInput = {
          userId: mockUser.id,
          siteName: 'Site1',
          url: 'https://site1.com',
          username: 'user1',
          password: 'SharedPassword123!'
        };
        await siteService.createSite(input1);

        const input2: CreateSiteInput = {
          userId: mockUser.id,
          siteName: 'Site2',
          url: 'https://site2.com',
          username: 'user2',
          password: 'SharedPassword123!'
        };
        await siteService.createSite(input2);

        const input3: CreateSiteInput = {
          userId: mockUser.id,
          siteName: 'Site3',
          url: 'https://site3.com',
          username: 'user3',
          password: 'UniquePassword456!'
        };
        await siteService.createSite(input3);
      });

      it('should find sites with reused password', async () => {
        const sites = await siteService.checkPasswordReuse('SharedPassword123!');

        expect(sites).toHaveLength(2);
        expect(sites.some(s => s.siteName === 'Site1')).toBe(true);
        expect(sites.some(s => s.siteName === 'Site2')).toBe(true);
      });

      it('should return empty array if no matches', async () => {
        const sites = await siteService.checkPasswordReuse('NonExistentPassword');

        expect(sites).toEqual([]);
      });

      it('should throw error if user is not authenticated', async () => {
        const unauthService = new SiteService(cryptoService, createMockAuthService(null), database);

        await expect(unauthService.checkPasswordReuse('password')).rejects.toThrow('User must be authenticated to perform this operation');
      });
    });
  });
});
