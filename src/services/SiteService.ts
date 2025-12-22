/**
 * Site Service
 * 
 * Manages CRUD operations for site password entries in the user's encrypted vault.
 * Handles encryption/decryption of passwords, validation, searching, and password reuse detection.
 * All operations are scoped to the currently authenticated user.
 * 
 * @module services/SiteService
 */

import { Site, CreateSiteInput, UpdateSiteInput } from '../models/Site';
import { CryptoService } from './CryptoService';
import { AuthService } from './AuthService';
import { Database } from './database';

/**
 * Custom error class for site-related errors
 */
export class SiteError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SiteError';
  }
}

/**
 * Service for managing site password entries
 * 
 * Responsibilities:
 * - CRUD operations for site entries
 * - Password encryption/decryption
 * - Search and filtering
 * - URL/IP validation
 * - Password reuse detection
 * 
 * All operations require an authenticated user and are scoped to that user's vault.
 * 
 * @example
 * ```typescript
 * const siteService = new SiteService(cryptoService, authService, database);
 * 
 * // Create a new site entry
 * const site = await siteService.createSite({
 *   userId: 'user-123',
 *   siteName: 'GitHub',
 *   url: 'https://github.com',
 *   username: 'myusername',
 *   password: 'GeneratedPassword123!'
 * });
 * 
 * // Search for sites
 * const results = await siteService.searchSites('github');
 * 
 * // Check for password reuse
 * const reused = await siteService.checkPasswordReuse('MyPassword123!');
 * ```
 */
export class SiteService {
  /**
   * Creates a new SiteService instance
   * 
   * @param cryptoService - Service for encryption/decryption operations
   * @param authService - Service for authentication and user management
   * @param database - Database instance for data persistence
   */
  constructor(
    private cryptoService: CryptoService,
    private authService: AuthService,
    private database: Database
  ) {}

  /**
   * Creates a new site entry with encrypted password
   * 
   * @param input - Site data including plain-text password
   * @returns Created site entry with encrypted password
   * @throws {SiteError} If user is not authenticated or validation fails
   */
  async createSite(input: CreateSiteInput): Promise<Site> {
    const user = this.getCurrentUser();

    // Validate input
    if (!input.siteName?.trim()) {
      throw new SiteError('Site name is required');
    }
    if (!input.url?.trim()) {
      throw new SiteError('URL or IP address is required');
    }
    if (!input.username?.trim()) {
      throw new SiteError('Username is required');
    }
    if (!input.password) {
      throw new SiteError('Password is required');
    }

    // For now, store password in plain text in the vault
    // The entire vault will be encrypted by the Database layer
    const now = Date.now();
    const site: Site = {
      id: this.cryptoService.generateUUID(),
      userId: user.id,
      siteName: input.siteName.trim(),
      url: input.url.trim(),
      username: input.username.trim(),
      encryptedPassword: input.password, // Stored as-is, vault handles encryption
      iv: '', // Not used with vault-level encryption
      notes: input.notes?.trim(),
      createdAt: now,
      lastModified: now,
      tags: input.tags || [],
    };

    // Save to user's vault
    await this.saveSiteToVault(user.id, site);

    return site;
  }

  /**
   * Retrieves a site entry by ID
   * 
   * @param siteId - Unique site identifier
   * @returns Site entry if found and belongs to current user, null otherwise
   * @throws {SiteError} If user is not authenticated
   */
  async getSite(siteId: string): Promise<Site | null> {
    const user = this.getCurrentUser();
    const sites = await this.loadSitesFromVault(user.id);
    
    const site = sites.find((s: Site) => s.id === siteId);
    if (site && site.userId !== user.id) {
      // Site exists but doesn't belong to current user
      return null;
    }
    
    return site || null;
  }

  /**
   * Retrieves all site entries for the current user
   * 
   * @returns Array of site entries (sorted by lastModified descending)
   * @throws {SiteError} If user is not authenticated
   */
  async getAllSites(): Promise<Site[]> {
    const user = this.getCurrentUser();
    const sites = await this.loadSitesFromVault(user.id);
    
    // Sort by lastModified descending (most recent first)
    return sites.sort((a: Site, b: Site) => b.lastModified - a.lastModified);
  }

  /**
   * Updates an existing site entry
   * 
   * @param siteId - Unique site identifier
   * @param updates - Partial site data to update
   * @returns Updated site entry
   * @throws {SiteError} If site not found, doesn't belong to user, or validation fails
   */
  async updateSite(siteId: string, updates: UpdateSiteInput): Promise<Site> {
    const user = this.getCurrentUser();
    const sites = await this.loadSitesFromVault(user.id);
    
    const siteIndex = sites.findIndex((s: Site) => s.id === siteId);
    if (siteIndex === -1) {
      throw new SiteError('Site not found');
    }
    
    const site = sites[siteIndex];
    if (!site) {
      throw new SiteError('Site not found');
    }
    if (site.userId !== user.id) {
      throw new SiteError('Site does not belong to current user');
    }
    
    // Apply updates
    const updatedSite: Site = {
      ...site,
      siteName: updates.siteName ?? site.siteName,
      url: updates.url ?? site.url,
      username: updates.username ?? site.username,
      encryptedPassword: updates.password ?? site.encryptedPassword,
      iv: site.iv,
      notes: updates.notes !== undefined ? updates.notes : site.notes,
      tags: updates.tags ?? site.tags,
      lastModified: Date.now(),
    };
    
    // Update in vault
    sites[siteIndex] = updatedSite;
    await this.saveSitesToVault(user.id, sites);
    
    return updatedSite;
  }

  /**
   * Deletes a site entry
   * 
   * @param siteId - Unique site identifier
   * @throws {SiteError} If site not found or doesn't belong to current user
   */
  async deleteSite(siteId: string): Promise<void> {
    const user = this.getCurrentUser();
    const sites = await this.loadSitesFromVault(user.id);
    
    const siteIndex = sites.findIndex((s: Site) => s.id === siteId);
    if (siteIndex === -1) {
      throw new SiteError('Site not found');
    }
    
    const site = sites[siteIndex];
    if (!site) {
      throw new SiteError('Site not found');
    }
    if (site.userId !== user.id) {
      throw new SiteError('Site does not belong to current user');
    }
    
    // Remove from vault
    sites.splice(siteIndex, 1);
    await this.saveSitesToVault(user.id, sites);
  }

  /**
   * Searches sites by name or URL (case-insensitive)
   * 
   * @param query - Search query string
   * @returns Array of matching sites
   * @throws {SiteError} If user is not authenticated
   */
  async searchSites(query: string): Promise<Site[]> {
    // TODO: Implement in TASK-070
    throw new Error('Not implemented');
  }

  /**
   * Sorts an array of sites
   * 
   * @param sites - Array of sites to sort
   * @param sortBy - Field to sort by
   * @param order - Sort order (ascending or descending)
   * @returns Sorted array of sites
   */
  sortSites(
    sites: Site[],
    sortBy: 'name' | 'dateAdded' | 'dateModified',
    order: 'asc' | 'desc' = 'asc'
  ): Site[] {
    // TODO: Implement in TASK-071
    throw new Error('Not implemented');
  }

  /**
   * Validates a URL or IP address
   * 
   * @param urlOrIp - URL or IP address string to validate
   * @returns Validation result with type and optional warning
   */
  validateUrlOrIp(urlOrIp: string): {
    valid: boolean;
    type: 'url' | 'ip' | null;
    warning: string | null;
  } {
    // TODO: Implement in TASK-072
    throw new Error('Not implemented');
  }

  /**
   * Checks if a password is reused across multiple sites
   * 
   * @param password - Plain-text password to check
   * @returns Array of sites using the same password
   * @throws {SiteError} If user is not authenticated
   */
  async checkPasswordReuse(password: string): Promise<Site[]> {
    // TODO: Implement in TASK-073
    throw new Error('Not implemented');
  }

  /**
   * Gets the current authenticated user
   * 
   * @returns Current user
   * @throws {SiteError} If no user is authenticated
   */
  private getCurrentUser() {
    const user = this.authService.getCurrentUser();
    if (!user) {
      throw new SiteError('User must be authenticated to perform this operation');
    }
    return user;
  }

  /**
   * Loads sites from the user's vault
   * 
   * @param userId - User ID
   * @returns Array of sites
   */
  private async loadSitesFromVault(userId: string): Promise<Site[]> {
    const vaultData = await this.database.getVault(userId);
    if (!vaultData) {
      return [];
    }

    try {
      const vault = JSON.parse(vaultData);
      return vault.sites || [];
    } catch (error) {
      console.error('[SiteService] Failed to parse vault data:', error);
      return [];
    }
  }

  /**
   * Saves a single site to the user's vault
   * 
   * @param userId - User ID
   * @param site - Site to save
   */
  private async saveSiteToVault(userId: string, site: Site): Promise<void> {
    const sites = await this.loadSitesFromVault(userId);
    sites.push(site);
    await this.saveSitesToVault(userId, sites);
  }

  /**
   * Saves all sites to the user's vault
   * 
   * @param userId - User ID
   * @param sites - Array of sites
   */
  private async saveSitesToVault(userId: string, sites: Site[]): Promise<void> {
    const vault = {
      version: 1,
      sites,
      lastSyncedAt: Date.now(),
    };

    await this.database.saveVault(userId, JSON.stringify(vault));
  }
}
