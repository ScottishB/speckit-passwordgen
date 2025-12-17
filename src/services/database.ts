import initSqlJs, { type Database as SqlJsDatabase } from 'sql.js';
import type { GeneratedCredential } from '../models/GeneratedCredential';

export class Database {
  private db: SqlJsDatabase | null = null;
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Initialize SQL.js
      const SQL = await initSqlJs({
        locateFile: (_file: string) => `/sql-wasm.wasm`,
      });

      // Try to load existing database from localStorage
      const savedDb = localStorage.getItem('password-gen-db');
      if (savedDb) {
        const buffer = Uint8Array.from(atob(savedDb), c => c.charCodeAt(0));
        this.db = new SQL.Database(buffer);
      } else {
        this.db = new SQL.Database();
      }

      // Create schema if it doesn't exist
      this.db.run(`
        CREATE TABLE IF NOT EXISTS generated_credentials (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          type TEXT NOT NULL CHECK(type IN ('password', 'passphrase')),
          value TEXT NOT NULL,
          timestamp INTEGER NOT NULL,
          config TEXT NOT NULL
        )
      `);

      this.db.run(`CREATE INDEX IF NOT EXISTS idx_timestamp ON generated_credentials(timestamp DESC)`);
      this.db.run(`CREATE INDEX IF NOT EXISTS idx_type ON generated_credentials(type)`);

      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize database:', error);
      throw new Error('Database initialization failed');
    }
  }

  async saveCredential(credential: Omit<GeneratedCredential, 'id'>): Promise<GeneratedCredential> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      this.db.run(
        `INSERT INTO generated_credentials (type, value, timestamp, config) VALUES (?, ?, ?, ?)`,
        [credential.type, credential.value, credential.timestamp, credential.config]
      );

      const result = this.db.exec(`SELECT last_insert_rowid() as id`);
      const id = result[0]?.values[0]?.[0] as number;

      // Persist to localStorage
      await this.exportDatabase();

      return {
        ...credential,
        id,
      };
    } catch (error) {
      console.error('Failed to save credential:', error);
      throw new Error('Failed to save to database');
    }
  }

  async getAllCredentials(limit = 50): Promise<GeneratedCredential[]> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      const result = this.db.exec(
        `SELECT id, type, value, timestamp, config FROM generated_credentials ORDER BY timestamp DESC LIMIT ?`,
        [limit]
      );

      if (result.length === 0) return [];

      const credentials: GeneratedCredential[] = [];
      for (const row of result[0]!.values) {
        credentials.push({
          id: row[0] as number,
          type: row[1] as 'password' | 'passphrase',
          value: row[2] as string,
          timestamp: row[3] as number,
          config: row[4] as string,
        });
      }

      return credentials;
    } catch (error) {
      console.error('Failed to get credentials:', error);
      return [];
    }
  }

  async getCredentialsByType(type: 'password' | 'passphrase', limit = 50): Promise<GeneratedCredential[]> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      const result = this.db.exec(
        `SELECT id, type, value, timestamp, config FROM generated_credentials WHERE type = ? ORDER BY timestamp DESC LIMIT ?`,
        [type, limit]
      );

      if (result.length === 0) return [];

      const credentials: GeneratedCredential[] = [];
      for (const row of result[0]!.values) {
        credentials.push({
          id: row[0] as number,
          type: row[1] as 'password' | 'passphrase',
          value: row[2] as string,
          timestamp: row[3] as number,
          config: row[4] as string,
        });
      }

      return credentials;
    } catch (error) {
      console.error('Failed to get credentials by type:', error);
      return [];
    }
  }

  async getCredentialById(id: number): Promise<GeneratedCredential | null> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      const result = this.db.exec(
        `SELECT id, type, value, timestamp, config FROM generated_credentials WHERE id = ?`,
        [id]
      );

      if (result.length === 0 || result[0]!.values.length === 0) return null;

      const row = result[0]!.values[0]!;
      return {
        id: row[0] as number,
        type: row[1] as 'password' | 'passphrase',
        value: row[2] as string,
        timestamp: row[3] as number,
        config: row[4] as string,
      };
    } catch (error) {
      console.error('Failed to get credential by id:', error);
      return null;
    }
  }

  async exportDatabase(): Promise<Uint8Array> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      const data = this.db.export();
      // Save to localStorage
      const base64 = btoa(String.fromCharCode(...data));
      localStorage.setItem('password-gen-db', base64);
      return data;
    } catch (error) {
      console.error('Failed to export database:', error);
      throw new Error('Failed to export database');
    }
  }

  async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.initialized = false;
    }
  }
}
