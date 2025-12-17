import type { PasswordConfig, PassphraseConfig } from './models';

/**
 * Component for password generation form
 */
export interface IPasswordFormComponent {
  /**
   * Get current password configuration from form state
   * @returns Current PasswordConfig
   */
  getConfig(): PasswordConfig;
  
  /**
   * Set password configuration (update form state)
   * @param config - PasswordConfig to apply
   */
  setConfig(config: PasswordConfig): void;
  
  /**
   * Reset form to default values
   */
  reset(): void;
  
  /**
   * Trigger password generation
   * @returns Generated password string
   */
  generate(): string;
  
  /**
   * Copy displayed password to clipboard
   * @returns Promise resolving when copy completes
   */
  copyPassword(): Promise<void>;
  
  /**
   * Get validation errors for current configuration
   * @returns Array of error messages (empty if valid)
   */
  getValidationErrors(): string[];
}

/**
 * Component for passphrase generation form
 */
export interface IPassphraseFormComponent {
  /**
   * Get current passphrase configuration from form state
   * @returns Current PassphraseConfig
   */
  getConfig(): PassphraseConfig;
  
  /**
   * Set passphrase configuration (update form state)
   * @param config - PassphraseConfig to apply
   */
  setConfig(config: PassphraseConfig): void;
  
  /**
   * Reset form to default values
   */
  reset(): void;
  
  /**
   * Trigger passphrase generation
   * @returns Generated passphrase string
   */
  generate(): string;
  
  /**
   * Copy displayed passphrase to clipboard
   * @returns Promise resolving when copy completes
   */
  copyPassphrase(): Promise<void>;
  
  /**
   * Get validation errors for current configuration
   * @returns Array of error messages (empty if valid)
   */
  getValidationErrors(): string[];
}

/**
 * Component for displaying generation history
 */
export interface IHistoryListComponent {
  /**
   * Load and display history
   * @param limit - Maximum number of items to display
   * @returns Promise resolving when history is loaded
   */
  loadHistory(limit?: number): Promise<void>;
  
  /**
   * Filter history by credential type
   * @param type - Type to filter by ('all', 'password', or 'passphrase')
   * @returns Promise resolving when filter is applied
   */
  filterByType(type: 'all' | 'password' | 'passphrase'): Promise<void>;
  
  /**
   * Copy a history item to clipboard
   * @param id - ID of history item to copy
   * @returns Promise resolving when copy completes
   */
  copyHistoryItem(id: number): Promise<void>;
  
  /**
   * Refresh history display
   * @returns Promise resolving when refresh completes
   */
  refresh(): Promise<void>;
}

/**
 * Application-level component coordinating all UI
 */
export interface IAppComponent {
  /**
   * Initialize the application
   * @returns Promise resolving when initialization completes
   */
  initialize(): Promise<void>;
  
  /**
   * Switch between Password and Passphrase tabs
   * @param tab - Tab to switch to
   */
  switchTab(tab: 'password' | 'passphrase'): void;
  
  /**
   * Get currently active tab
   * @returns Active tab name
   */
  getActiveTab(): 'password' | 'passphrase';
  
  /**
   * Handle application-level errors
   * @param error - Error to handle
   */
  handleError(error: Error): void;
}
