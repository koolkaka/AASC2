import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TokenData } from './interfaces/token.interface';
import * as sqlite3 from 'sqlite3';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class TokenService implements OnModuleInit {
  private readonly logger = new Logger(TokenService.name);
  private db: sqlite3.Database;
  private readonly dbPath: string;
  private readonly backupPath: string;

  constructor(private configService: ConfigService) {
    this.dbPath = this.configService.get<string>('DB_PATH', './data/tokens.db');
    this.backupPath = this.configService.get<string>('TOKEN_BACKUP_PATH', './data/tokens.json');
  }

  async onModuleInit() {
    await this.initializeDatabase();
  }

  private async initializeDatabase(): Promise<void> {
    try {
      // Ensure data directory exists
      const dataDir = path.dirname(this.dbPath);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      // Initialize SQLite database
      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          this.logger.error('Error opening database:', err);
        } else {
          this.logger.log('Connected to SQLite database');
        }
      });

      // Create tokens table if it doesn't exist
      const createTableSQL = `
        CREATE TABLE IF NOT EXISTS tokens (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          domain TEXT UNIQUE NOT NULL,
          member_id TEXT NOT NULL,
          access_token TEXT NOT NULL,
          refresh_token TEXT NOT NULL,
          expires_in INTEGER NOT NULL,
          token_type TEXT NOT NULL,
          scope TEXT NOT NULL,
          expires_at INTEGER NOT NULL,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
        )
      `;

      await this.runQuery(createTableSQL);
      this.logger.log('Token table initialized');
    } catch (error) {
      this.logger.error('Failed to initialize database:', error);
    }
  }

  private runQuery(sql: string, params: any[] = []): Promise<any> {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ id: this.lastID, changes: this.changes });
        }
      });
    });
  }

  private getQuery(sql: string, params: any[] = []): Promise<any> {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  async saveToken(tokenData: TokenData): Promise<void> {
    try {
      // Validate required fields
      if (!tokenData.access_token || !tokenData.domain || !tokenData.member_id) {
        throw new Error('Missing required token fields: access_token, domain, member_id');
      }

      // Ensure all fields have default values
      const safeTokenData = {
        ...tokenData,
        token_type: tokenData.token_type || 'Bearer',
        scope: tokenData.scope || 'user',
        expires_in: tokenData.expires_in || 3600,
        refresh_token: tokenData.refresh_token || '',
      };

      const now = Math.floor(Date.now() / 1000);
      const expiresAt = now + safeTokenData.expires_in;

      const sql = `
        INSERT OR REPLACE INTO tokens 
        (domain, member_id, access_token, refresh_token, expires_in, token_type, scope, expires_at, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const params = [
        safeTokenData.domain,
        safeTokenData.member_id,
        safeTokenData.access_token,
        safeTokenData.refresh_token,
        safeTokenData.expires_in,
        safeTokenData.token_type,
        safeTokenData.scope,
        expiresAt,
        now,
        now
      ];

      await this.runQuery(sql, params);
      
      // Backup to JSON file
      await this.backupToJson();
      
      this.logger.log(`Token saved for domain: ${safeTokenData.domain}`);
    } catch (error) {
      this.logger.error('Error saving token:', error);
      throw error;
    }
  }

  async getToken(domain: string): Promise<TokenData | null> {
    try {
      const sql = 'SELECT * FROM tokens WHERE domain = ?';
      const row = await this.getQuery(sql, [domain]);
      
      if (!row) {
        return null;
      }

      const tokenRow = row as any;
      return {
        access_token: tokenRow.access_token,
        refresh_token: tokenRow.refresh_token,
        expires_in: tokenRow.expires_in,
        token_type: tokenRow.token_type,
        scope: tokenRow.scope,
        domain: tokenRow.domain,
        member_id: tokenRow.member_id,
        expires_at: tokenRow.expires_at,
        created_at: tokenRow.created_at,
      };
    } catch (error) {
      this.logger.error('Error getting token:', error);
      return null;
    }
  }

  async isTokenExpired(domain: string): Promise<boolean> {
    const token = await this.getToken(domain);
    if (!token) {
      return true;
    }

    const now = Math.floor(Date.now() / 1000);
    const bufferTime = 300; // 5 minutes buffer
    return (token.expires_at - bufferTime) <= now;
  }

  async deleteToken(domain: string): Promise<void> {
    try {
      const sql = 'DELETE FROM tokens WHERE domain = ?';
      await this.runQuery(sql, [domain]);
      await this.backupToJson();
      this.logger.log(`Token deleted for domain: ${domain}`);
    } catch (error) {
      this.logger.error('Error deleting token:', error);
      throw error;
    }
  }

  async getAllTokens(): Promise<TokenData[]> {
    try {
      return new Promise((resolve, reject) => {
        this.db.all('SELECT * FROM tokens', [], (err, rows: any[]) => {
          if (err) {
            reject(err);
          } else {
            const tokens = rows.map(row => ({
              access_token: row.access_token,
              refresh_token: row.refresh_token,
              expires_in: row.expires_in,
              token_type: row.token_type,
              scope: row.scope,
              domain: row.domain,
              member_id: row.member_id,
              expires_at: row.expires_at,
              created_at: row.created_at,
            }));
            resolve(tokens);
          }
        });
      });
    } catch (error) {
      this.logger.error('Error getting all tokens:', error);
      return [];
    }
  }

  private async backupToJson(): Promise<void> {
    try {
      const tokens = await this.getAllTokens();
      const backupData = {
        timestamp: new Date().toISOString(),
        tokens: tokens
      };

      const backupDir = path.dirname(this.backupPath);
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }

      fs.writeFileSync(this.backupPath, JSON.stringify(backupData, null, 2));
      this.logger.debug('Token backup completed');
    } catch (error) {
      this.logger.error('Error backing up tokens:', error);
    }
  }

  async restoreFromJson(): Promise<void> {
    try {
      if (!fs.existsSync(this.backupPath)) {
        this.logger.warn('Backup file not found, skipping restore');
        return;
      }

      const backupData = JSON.parse(fs.readFileSync(this.backupPath, 'utf8'));
      
      for (const token of backupData.tokens) {
        await this.saveToken(token);
      }

      this.logger.log('Token restore completed');
    } catch (error) {
      this.logger.error('Error restoring tokens:', error);
    }
  }
}
