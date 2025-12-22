/**
 * EncryptedVault Model
 * 
 * Represents the encrypted password vault structure for a user.
 * The vault is stored as encrypted JSON in localStorage.
 */

import type { Site } from './Site';

/**
 * Encrypted site entry in the vault
 * 
 * @property id - Unique entry identifier (UUID v4)
 * @property siteName - Display name for the site/service
 * @property url - URL or IP address of the site
 * @property username - Username/email for the site
 * @property encryptedPassword - AES-256-GCM encrypted password (base64)
 * @property iv - Initialization vector used for encryption (base64)
 * @property authTag - Authentication tag for GCM mode (base64)
 * @property notes - Optional encrypted notes (base64, max 500 chars decrypted)
 * @property encryptedNotes - Optional encrypted notes with crypto metadata
 * @property createdAt - Entry creation timestamp
 * @property lastModified - Last modification timestamp
 */
export interface EncryptedSiteEntry {
  id: string;
  siteName: string;
  url: string;
  username: string;
  encryptedPassword: string;
  iv: string;
  authTag: string;
  notes?: string;
  encryptedNotes?: {
    ciphertext: string;
    iv: string;
    authTag: string;
  };
  createdAt: number;
  lastModified: number;
}

/**
 * Vault data structure before encryption
 * 
 * @property version - Vault schema version for future migrations
 * @property sites - Array of password entries
 * @property lastSyncedAt - Last synchronization timestamp (for future sync feature)
 */
export interface VaultData {
  version: number;
  sites: Site[];
  lastSyncedAt: number | null;
}

/**
 * Encrypted vault structure stored in localStorage
 * 
 * @property version - Vault schema version for future migrations
 * @property sites - Array of encrypted password entries
 * @property lastSyncedAt - Last synchronization timestamp (for future sync feature)
 * @property metadata - Additional vault metadata
 */
export interface EncryptedVault {
  version: number;
  sites: EncryptedSiteEntry[];
  lastSyncedAt: number | null;
  metadata?: {
    lastModified: number;
    deviceId?: string;
    syncStatus?: 'synced' | 'pending' | 'conflict';
  };
}

/**
 * Type for creating a new encrypted vault (omits auto-generated fields)
 */
export type CreateEncryptedVaultInput = {
  version?: number;
  sites?: EncryptedSiteEntry[];
  lastSyncedAt?: number | null;
  metadata?: EncryptedVault['metadata'];
};
