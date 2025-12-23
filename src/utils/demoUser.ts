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
 */
export const DEMO_USER = {
  username: 'test',
  password: 'test123',
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
      await authService.logout(currentSession.sessionId);
      console.log('[DemoUser] Logged out after demo user creation');
    }
  } catch (error) {
    // If user already exists or creation fails, log but don't throw
    console.warn('[DemoUser] Failed to create demo user:', error);
  }
}
