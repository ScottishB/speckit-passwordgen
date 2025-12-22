/**
 * Site Model
 * 
 * Represents a website or service entry in the user's password vault.
 * Each site stores credentials and metadata for accessing a specific service.
 * Passwords are encrypted before storage using per-user encryption keys.
 * 
 * @module models/Site
 */

/**
 * Represents a site entry with stored credentials
 * 
 * @property id - Unique entry identifier (UUID v4)
 * @property userId - Foreign key to User.id (determines encryption key)
 * @property siteName - Display name for the site (e.g., "My Bank", "Gmail")
 * @property url - URL or IP address of the site (e.g., "https://example.com", "192.168.1.1")
 * @property username - Username, email, or account identifier for this site
 * @property encryptedPassword - Encrypted password for this site (AES-GCM encrypted)
 * @property iv - Initialization vector used for password encryption (base64)
 * @property notes - Additional notes about this site entry (optional, max 500 characters)
 * @property createdAt - Entry creation timestamp (milliseconds since epoch)
 * @property lastModified - Last modification timestamp (milliseconds since epoch)
 * @property tags - Optional tags for categorizing sites (e.g., ["work", "finance"])
 */
export interface Site {
  id: string;
  userId: string;
  siteName: string;
  url: string;
  username: string;
  encryptedPassword: string;
  iv: string;
  notes?: string;
  createdAt: number;
  lastModified: number;
  tags?: string[];
}

/**
 * Input type for creating a new site entry
 * Omits auto-generated fields (id, createdAt, lastModified)
 * 
 * @property password - Plain-text password (will be encrypted before storage)
 */
export type CreateSiteInput = Omit<Site, 'id' | 'createdAt' | 'lastModified' | 'encryptedPassword' | 'iv'> & {
  password: string;
};

/**
 * Input type for updating an existing site entry
 * All fields optional except userId (for authorization check)
 * 
 * @property password - Plain-text password if updating password (will be encrypted)
 */
export type UpdateSiteInput = Partial<Omit<Site, 'id' | 'userId' | 'createdAt' | 'encryptedPassword' | 'iv'>> & {
  password?: string;
};
