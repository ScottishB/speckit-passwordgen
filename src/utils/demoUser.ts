/**
 * Demo User Initialization
 * 
 * Creates a demo/test user for development and demonstration purposes.
 * This user is created automatically if it doesn't already exist.
 */

import type { AuthService } from '../services/AuthService';
import type { Database } from '../services/database';

/**
 * Demo user credentials
 * Password meets all requirements: 12+ chars, uppercase, lowercase, number, special char, not common
 */
export const DEMO_USER = {
  username: 'test',
  password: 'TestDemo123!',
} as const;

/**
 * Initializes the demo user if it doesn't already exist
 * 
 * @param authService - The authentication service instance
 * @param database - The database instance
 * @returns Promise that resolves when initialization is complete
 */
export async function initializeDemoUser(
  authService: AuthService,
  database: Database
): Promise<void> {
  try {
    // Small delay to ensure argon2-browser WASM is loaded
    // Argon2 requires WASM initialization which may not be ready immediately
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Check if demo user already exists
    const existingUser = await database.getUserByUsername(DEMO_USER.username);
    
    if (existingUser) {
      console.log('[DemoUser] Demo user already exists');
      return;
    }

    // Create the demo user
    console.log('[DemoUser] Creating demo user...');
    await authService.register(DEMO_USER.username, DEMO_USER.password);
    console.log('[DemoUser] Demo user created successfully');
    
    // Log out if the registration auto-logged in
    const currentSession = authService.getCurrentSession();
    if (currentSession) {
      await authService.logout(currentSession.id);
      console.log('[DemoUser] Logged out after demo user creation');
    }
  } catch (error) {
    // If user already exists or creation fails, log but don't throw
    console.warn('[DemoUser] Failed to create demo user:', error);
  }
}
