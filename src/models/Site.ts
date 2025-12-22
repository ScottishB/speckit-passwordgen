/**
 * Site Model
 * 
 * Represents a stored password entry for a website or service.
 * Used in the encrypted vault for each user.
 */

/**
 * Site password entry interface
 * 
 * @property id - Unique entry identifier (UUID v4)
 * @property userId - Foreign key to User.id
 * @property siteName - Display name for the site/service
 * @property url - URL or IP address of the site
 * @property username - Username/email for the site
 * @property password - Generated password (stored encrypted in vault)
 * @property notes - Optional notes (max 500 characters)
 * @property createdAt - Entry creation timestamp
 * @property lastModified - Last modification timestamp
 * @property isAssigned - Whether password has been assigned to the site
 */
export interface Site {
  id: string;
  userId: string;
  siteName: string;
  url: string;
  username: string;
  password: string;
  notes: string;
  createdAt: number;
  lastModified: number;
  isAssigned: boolean;
}

/**
 * Type for creating a new site entry (omits auto-generated fields)
 */
export type CreateSiteInput = Omit<Site, 'id' | 'createdAt' | 'lastModified'> & {
  id?: string;
  createdAt?: number;
  lastModified?: number;
};
