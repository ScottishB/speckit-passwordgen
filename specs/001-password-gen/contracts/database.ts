import type { GeneratedCredential, HistoryEntry } from './models';

/**
 * Database service for persisting generated credentials
 */
export interface IDatabase {
  /**
   * Initialize the database connection and schema
   * @returns Promise that resolves when initialization is complete
   */
  initialize(): Promise<void>;
  
  /**
   * Save a generated credential to the database
   * @param credential - Credential to save (without id, will be auto-generated)
   * @returns Promise resolving to the saved credential with id
   */
  saveCredential(credential: Omit<GeneratedCredential, 'id'>): Promise<GeneratedCredential>;
  
  /**
   * Retrieve all credentials, ordered by timestamp (most recent first)
   * @param limit - Maximum number of credentials to retrieve (default: 50)
   * @returns Promise resolving to array of credentials
   */
  getAllCredentials(limit?: number): Promise<GeneratedCredential[]>;
  
  /**
   * Retrieve credentials filtered by type
   * @param type - Type of credential to filter by
   * @param limit - Maximum number of credentials to retrieve (default: 50)
   * @returns Promise resolving to array of credentials
   */
  getCredentialsByType(type: 'password' | 'passphrase', limit?: number): Promise<GeneratedCredential[]>;
  
  /**
   * Retrieve a single credential by id
   * @param id - Credential id
   * @returns Promise resolving to credential or null if not found
   */
  getCredentialById(id: number): Promise<GeneratedCredential | null>;
  
  /**
   * Export the database as binary data for backup/persistence
   * @returns Promise resolving to Uint8Array of database binary
   */
  exportDatabase(): Promise<Uint8Array>;
  
  /**
   * Close the database connection
   * @returns Promise that resolves when connection is closed
   */
  close(): Promise<void>;
}

/**
 * Service for history-related operations
 */
export interface IHistoryService {
  /**
   * Get history entries for display
   * @param limit - Maximum number of entries to retrieve
   * @returns Promise resolving to array of history entries
   */
  getHistory(limit?: number): Promise<HistoryEntry[]>;
  
  /**
   * Get history entries filtered by type
   * @param type - Type of credential
   * @param limit - Maximum number of entries to retrieve
   * @returns Promise resolving to array of history entries
   */
  getHistoryByType(type: 'password' | 'passphrase', limit?: number): Promise<HistoryEntry[]>;
  
  /**
   * Convert a GeneratedCredential to a HistoryEntry view model
   * @param credential - Credential to convert
   * @returns HistoryEntry view model
   */
  toHistoryEntry(credential: GeneratedCredential): HistoryEntry;
}
