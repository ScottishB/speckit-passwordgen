import type { GeneratedCredential } from '../models/GeneratedCredential';

// Temporary in-memory storage until sql.js loading is fixed
export class Database {
  private credentials: GeneratedCredential[] = [];
  private nextId = 1;
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      console.log('[Database] Starting initialization...');
      console.log('[Database] Using in-memory storage with localStorage...');
      
      // Load from localStorage if available
      const saved = localStorage.getItem('password-gen-credentials');
      if (saved) {
        this.credentials = JSON.parse(saved);
        this.nextId = Math.max(...this.credentials.map(c => c.id), 0) + 1;
        console.log(`[Database] Loaded ${this.credentials.length} credentials from localStorage`);
      }
      
      this.initialized = true;
      console.log('[Database] Initialization complete!');
    } catch (error) {
      console.error('[Database] Failed to initialize database:', error);
      throw new Error('Database initialization failed');
    }
  }

  private persist(): void {
    try {
      localStorage.setItem('password-gen-credentials', JSON.stringify(this.credentials));
    } catch (error) {
      console.error('Failed to persist to localStorage:', error);
    }
  }

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

  async getAllCredentials(limit = 50): Promise<GeneratedCredential[]> {
    if (!this.initialized) {
      throw new Error('Database not initialized');
    }

    return this.credentials
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  async getCredentialsByType(type: 'password' | 'passphrase', limit = 50): Promise<GeneratedCredential[]> {
    if (!this.initialized) {
      throw new Error('Database not initialized');
    }

    return this.credentials
      .filter(c => c.type === type)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  async getCredentialById(id: number): Promise<GeneratedCredential | null> {
    if (!this.initialized) {
      throw new Error('Database not initialized');
    }

    return this.credentials.find(c => c.id === id) || null;
  }

  async exportDatabase(): Promise<Uint8Array> {
    if (!this.initialized) {
      throw new Error('Database not initialized');
    }

    const json = JSON.stringify(this.credentials);
    return new TextEncoder().encode(json);
  }

  async close(): Promise<void> {
    this.persist();
    this.initialized = false;
  }
}
