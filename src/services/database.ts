import type { GeneratedCredential } from '../models/GeneratedCredential';
import type { User } from '../models/User';
import type { Session } from '../models/Session';
import type { Site } from '../models/Site';
import type { SecurityEvent } from '../models/SecurityEvent';

/**
 * Database service for managing user data with localStorage
 * 
 * Implements multi-user support with encrypted vaults per user.
 * Uses localStorage with the following keys:
 * - pwgen_users: Array of User records
 * - pwgen_sessions: Array of Session records
 * - pwgen_vault_${userId}: Encrypted vault data for specific user
 * - pwgen_security_events: Array of SecurityEvent records
 * 
 * Legacy support (to be removed in future):
 * - password-gen-credentials: Old single-user credential storage
 */
export class Database {
  // Multi-user storage
  private users: User[] = [];
  private sessions: Session[] = [];
  private securityEvents: SecurityEvent[] = [];
  
  // Legacy storage (deprecated, for backwards compatibility)
  private credentials: GeneratedCredential[] = [];
  private nextId = 1;
  
  private initialized = false;

  // Storage keys
  private static readonly STORAGE_KEY_USERS = 'pwgen_users';
  private static readonly STORAGE_KEY_SESSIONS = 'pwgen_sessions';
  private static readonly STORAGE_KEY_VAULT_PREFIX = 'pwgen_vault_';
  private static readonly STORAGE_KEY_SECURITY_EVENTS = 'pwgen_security_events';
  
  // Legacy storage key
  private static readonly LEGACY_STORAGE_KEY = 'password-gen-credentials';

  /**
   * Initializes the database by loading data from localStorage
   * 
   * Loads:
   * - Users array from pwgen_users
   * - Sessions array from pwgen_sessions
   * - Security events from pwgen_security_events
   * - Legacy credentials (for backwards compatibility)
   * 
   * @throws {Error} If initialization fails
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      console.log('[Database] Starting initialization...');
      console.log('[Database] Using localStorage for multi-user storage...');
      
      // Load users
      const usersData = localStorage.getItem(Database.STORAGE_KEY_USERS);
      if (usersData) {
        this.users = JSON.parse(usersData);
        console.log(`[Database] Loaded ${this.users.length} users`);
      } else {
        this.users = [];
        console.log('[Database] No existing users found');
      }
      
      // Load sessions
      const sessionsData = localStorage.getItem(Database.STORAGE_KEY_SESSIONS);
      if (sessionsData) {
        this.sessions = JSON.parse(sessionsData);
        console.log(`[Database] Loaded ${this.sessions.length} sessions`);
      } else {
        this.sessions = [];
        console.log('[Database] No existing sessions found');
      }
      
      // Load security events
      const eventsData = localStorage.getItem(Database.STORAGE_KEY_SECURITY_EVENTS);
      if (eventsData) {
        this.securityEvents = JSON.parse(eventsData);
        console.log(`[Database] Loaded ${this.securityEvents.length} security events`);
      } else {
        this.securityEvents = [];
        console.log('[Database] No existing security events found');
      }
      
      // Load legacy credentials for backwards compatibility
      const legacyData = localStorage.getItem(Database.LEGACY_STORAGE_KEY);
      if (legacyData) {
        this.credentials = JSON.parse(legacyData);
        this.nextId = Math.max(...this.credentials.map(c => c.id), 0) + 1;
        console.log(`[Database] Loaded ${this.credentials.length} legacy credentials`);
      }
      
      this.initialized = true;
      console.log('[Database] Initialization complete!');
    } catch (error) {
      console.error('[Database] Failed to initialize database:', error);
      throw new Error('Database initialization failed');
    }
  }

  /**
   * Persists users to localStorage
   * @private
   */
  private persistUsers(): void {
    try {
      localStorage.setItem(Database.STORAGE_KEY_USERS, JSON.stringify(this.users));
    } catch (error) {
      console.error('[Database] Failed to persist users:', error);
      throw new Error('Failed to save users to storage');
    }
  }

  /**
   * Persists sessions to localStorage
   * @private
   */
  private persistSessions(): void {
    try {
      localStorage.setItem(Database.STORAGE_KEY_SESSIONS, JSON.stringify(this.sessions));
    } catch (error) {
      console.error('[Database] Failed to persist sessions:', error);
      throw new Error('Failed to save sessions to storage');
    }
  }

  /**
   * Persists security events to localStorage
   * @private
   */
  private persistSecurityEvents(): void {
    try {
      localStorage.setItem(Database.STORAGE_KEY_SECURITY_EVENTS, JSON.stringify(this.securityEvents));
    } catch (error) {
      console.error('[Database] Failed to persist security events:', error);
      throw new Error('Failed to save security events to storage');
    }
  }

  /**
   * Persists a user's encrypted vault to localStorage
   * @param userId - User ID
   * @param encryptedData - Encrypted vault data (JSON string)
   * @private
   */
  private persistVault(userId: string, encryptedData: string): void {
    try {
      const key = `${Database.STORAGE_KEY_VAULT_PREFIX}${userId}`;
      localStorage.setItem(key, encryptedData);
    } catch (error) {
      console.error('[Database] Failed to persist vault:', error);
      throw new Error('Failed to save vault to storage');
    }
  }

  /**
   * Loads a user's encrypted vault from localStorage
   * @param userId - User ID
   * @returns Encrypted vault data or null if not found
   */
  async getVault(userId: string): Promise<string | null> {
    if (!this.initialized) {
      throw new Error('Database not initialized');
    }

    try {
      const key = `${Database.STORAGE_KEY_VAULT_PREFIX}${userId}`;
      return localStorage.getItem(key);
    } catch (error) {
      console.error('[Database] Failed to load vault:', error);
      return null;
    }
  }

  /**
   * Saves a user's encrypted vault to localStorage
   * @param userId - User ID
   * @param encryptedData - Encrypted vault data (JSON string)
   */
  async saveVault(userId: string, encryptedData: string): Promise<void> {
    if (!this.initialized) {
      throw new Error('Database not initialized');
    }

    this.persistVault(userId, encryptedData);
  }

  /**
   * Deletes a user's encrypted vault from localStorage
   * @param userId - User ID
   */
  async deleteVault(userId: string): Promise<void> {
    if (!this.initialized) {
      throw new Error('Database not initialized');
    }

    try {
      const key = `${Database.STORAGE_KEY_VAULT_PREFIX}${userId}`;
      localStorage.removeItem(key);
    } catch (error) {
      console.error('[Database] Failed to delete vault:', error);
      throw new Error('Failed to delete vault from storage');
    }
  }

  // ==========================================================================
  // Legacy Methods (for backwards compatibility - will be removed)
  // ==========================================================================

  /**
   * @deprecated Use user-specific vault storage instead
   */
  private persist(): void {
    try {
      localStorage.setItem(Database.LEGACY_STORAGE_KEY, JSON.stringify(this.credentials));
    } catch (error) {
      console.error('Failed to persist to localStorage:', error);
    }
  }

  /**
   * @deprecated Use user-specific vault storage instead
   */
  async saveCredential(credential: Omit<GeneratedCredential, 'id'>): Promise<GeneratedCredential> {
    if (!this.initialized) {
      throw new Error('Database not initialized');
    }

    const newCredential: GeneratedCredential = {
      ...credential,
      id: this.nextId++,
    };

    this.credentials.push(newCredential);
    this.persist();

    return newCredential;
  }

  /**
   * @deprecated Use user-specific vault storage instead
   */
  async getAllCredentials(limit = 50): Promise<GeneratedCredential[]> {
    if (!this.initialized) {
      throw new Error('Database not initialized');
    }

    return this.credentials
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  /**
   * @deprecated Use user-specific vault storage instead
   */
  async getCredentialsByType(type: 'password' | 'passphrase', limit = 50): Promise<GeneratedCredential[]> {
    if (!this.initialized) {
      throw new Error('Database not initialized');
    }

    return this.credentials
      .filter(c => c.type === type)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  /**
   * @deprecated Use user-specific vault storage instead
   */
  async getCredentialById(id: number): Promise<GeneratedCredential | null> {
    if (!this.initialized) {
      throw new Error('Database not initialized');
    }

    return this.credentials.find(c => c.id === id) || null;
  }

  /**
   * Exports database contents
   * @deprecated Legacy export method
   */
  async exportDatabase(): Promise<Uint8Array> {
    if (!this.initialized) {
      throw new Error('Database not initialized');
    }

    const json = JSON.stringify(this.credentials);
    return new TextEncoder().encode(json);
  }

  /**
   * Closes the database connection and persists data
   */
  async close(): Promise<void> {
    this.persist();
    this.persistUsers();
    this.persistSessions();
    this.persistSecurityEvents();
    this.initialized = false;
  }
}