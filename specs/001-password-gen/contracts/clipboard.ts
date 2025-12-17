import type { ClipboardResult } from './models';

/**
 * Service for clipboard operations
 */
export interface IClipboardService {
  /**
   * Copy text to clipboard with fallback handling
   * @param text - Text to copy
   * @returns Promise resolving to result with success status and message
   */
  copyToClipboard(text: string): Promise<ClipboardResult>;
  
  /**
   * Check if clipboard API is available
   * @returns Boolean indicating clipboard API availability
   */
  isAvailable(): boolean;
}
