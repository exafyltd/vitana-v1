/**
 * VTID-05184 — SQLite/SQLCipher TableDriver (N5a, plan change 8 "Store").
 *
 * One encrypted database in the cache directory (excluded from iCloud backup
 * and Android Auto Backup). The 32-byte key lives in expo-secure-store with
 * AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY so background passes after first unlock
 * can open it. The queue is a cache by design: when the OS clears it or it
 * cannot be opened, the file is deleted and recreated and readers restart
 * from what the store still knows (plan change 8, "Two anchors").
 *
 * Native modules are required lazily (only after the flag check), never at
 * import time. Exercised on a device in G1; CI runs the same conformance
 * suite against the in-memory driver.
 */
import type { ListOptions, Row, Table, TableDriver } from './types';
import { TABLES } from './types';

export const DB_NAME = 'vitana-health-sync.db';
export const DB_KEY_ITEM = 'vitana.healthSync.dbKey.v1';

/** The subset of expo-sqlite's SQLiteDatabase this driver uses. */
export interface SqlDb {
  execAsync(source: string): Promise<void>;
  runAsync(source: string, params: (string | number | null)[]): Promise<unknown>;
  getFirstAsync<T>(source: string, params: (string | number | null)[]): Promise<T | null>;
  getAllAsync<T>(source: string, params: (string | number | null)[]): Promise<T[]>;
  closeAsync?(): Promise<void>;
}

export function schemaSql(): string {
  return TABLES.map(
    (t) =>
      `CREATE TABLE IF NOT EXISTS ${t} (scope TEXT NOT NULL, k TEXT NOT NULL, v TEXT NOT NULL, ord REAL NOT NULL DEFAULT 0, PRIMARY KEY (scope, k));` +
      `CREATE INDEX IF NOT EXISTS ${t}_ord ON ${t} (scope, ord);`,
  ).join('\n');
}

const toHex = (bytes: Uint8Array) => Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');

export function createSqliteDriver(db: SqlDb): TableDriver {
  return {
    async get<T>(table: Table, scope: string, key: string) {
      const row = await db.getFirstAsync<{ v: string }>(`SELECT v FROM ${table} WHERE scope = ? AND k = ?`, [scope, key]);
      return row ? (JSON.parse(row.v) as T) : undefined;
    },
    async put<T>(table: Table, scope: string, key: string, value: T, ord = 0) {
      await db.runAsync(`INSERT OR REPLACE INTO ${table} (scope, k, v, ord) VALUES (?, ?, ?, ?)`, [scope, key, JSON.stringify(value), ord]);
    },
    async del(table: Table, scope: string, key: string) {
      await db.runAsync(`DELETE FROM ${table} WHERE scope = ? AND k = ?`, [scope, key]);
    },
    async list<T>(table: Table, scope: string, opts: ListOptions = {}) {
      const where = ['scope = ?'];
      const params: (string | number)[] = [scope];
      if (opts.ordMin !== undefined) {
        where.push('ord >= ?');
        params.push(opts.ordMin);
      }
      if (opts.ordMax !== undefined) {
        where.push('ord < ?');
        params.push(opts.ordMax);
      }
      const order = opts.desc ? 'ord DESC, k DESC' : 'ord ASC, k ASC';
      const limit = opts.limit !== undefined ? ` LIMIT ${Math.max(0, Math.floor(opts.limit))}` : '';
      const rows = await db.getAllAsync<{ k: string; v: string; ord: number }>(`SELECT k, v, ord FROM ${table} WHERE ${where.join(' AND ')} ORDER BY ${order}${limit}`, params);
      return rows.map((r): Row<T> => ({ key: r.k, value: JSON.parse(r.v) as T, ord: r.ord }));
    },
    async count(table: Table, scope: string) {
      const row = await db.getFirstAsync<{ n: number }>(`SELECT COUNT(*) AS n FROM ${table} WHERE scope = ?`, [scope]);
      return row?.n ?? 0;
    },
    async deleteScope(table: Table, scope: string) {
      await db.runAsync(`DELETE FROM ${table} WHERE scope = ?`, [scope]);
    },
    async scopes(table: Table) {
      const rows = await db.getAllAsync<{ scope: string }>(`SELECT DISTINCT scope FROM ${table}`, []);
      return rows.map((r) => r.scope);
    },
  };
}

/** Opens (or recreates) the encrypted cache database. Device only. */
export async function openEncryptedDriver(): Promise<TableDriver> {
  /* eslint-disable @typescript-eslint/no-require-imports */
  const SecureStore = require('expo-secure-store') as typeof import('expo-secure-store');
  const Crypto = require('expo-crypto') as typeof import('expo-crypto');
  const SQLite = require('expo-sqlite') as typeof import('expo-sqlite');
  const { Paths } = require('expo-file-system') as typeof import('expo-file-system');
  /* eslint-enable @typescript-eslint/no-require-imports */
  const opts = { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY };
  let key = await SecureStore.getItemAsync(DB_KEY_ITEM, opts);
  if (!key) {
    key = toHex(Crypto.getRandomBytes(32));
    await SecureStore.setItemAsync(DB_KEY_ITEM, key, opts);
  }
  const dir = Paths.cache.uri;
  const open = async () => {
    const db = await SQLite.openDatabaseAsync(DB_NAME, {}, dir);
    await db.execAsync(`PRAGMA key = "x'${key}'";`);
    await db.execAsync(schemaSql());
    return db;
  };
  let db;
  try {
    db = await open();
  } catch {
    // Unreadable (corrupt, or the key was lost): the queue is a cache — start over.
    await SQLite.deleteDatabaseAsync(DB_NAME, dir).catch(() => undefined);
    db = await open();
  }
  return createSqliteDriver(db as unknown as SqlDb);
}
