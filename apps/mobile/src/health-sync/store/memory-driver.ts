/** VTID-05184 — in-memory TableDriver (tests; values are JSON round-tripped like SQLite would). */
import type { ListOptions, Row, Table, TableDriver } from './types';

export function createMemoryDriver(): TableDriver & { dump(): Record<string, Record<string, number>> } {
  const tables = new Map<Table, Map<string, Map<string, { v: string; ord: number }>>>();
  const scopeMap = (table: Table, scope: string, create: boolean) => {
    let t = tables.get(table);
    if (!t) {
      if (!create) return undefined;
      t = new Map();
      tables.set(table, t);
    }
    let s = t.get(scope);
    if (!s && create) {
      s = new Map();
      t.set(scope, s);
    }
    return s;
  };
  return {
    async get<T>(table: Table, scope: string, key: string) {
      const row = scopeMap(table, scope, false)?.get(key);
      return row ? (JSON.parse(row.v) as T) : undefined;
    },
    async put<T>(table: Table, scope: string, key: string, value: T, ord = 0) {
      scopeMap(table, scope, true)!.set(key, { v: JSON.stringify(value), ord });
    },
    async del(table: Table, scope: string, key: string) {
      scopeMap(table, scope, false)?.delete(key);
    },
    async list<T>(table: Table, scope: string, opts: ListOptions = {}) {
      const s = scopeMap(table, scope, false);
      if (!s) return [];
      let rows: Row<T>[] = [...s.entries()]
        .filter(([, r]) => (opts.ordMin === undefined || r.ord >= opts.ordMin) && (opts.ordMax === undefined || r.ord < opts.ordMax))
        .map(([key, r]) => ({ key, value: JSON.parse(r.v) as T, ord: r.ord }));
      rows.sort((a, b) => (opts.desc ? b.ord - a.ord : a.ord - b.ord) || a.key.localeCompare(b.key));
      if (opts.limit !== undefined) rows = rows.slice(0, opts.limit);
      return rows;
    },
    async count(table: Table, scope: string) {
      return scopeMap(table, scope, false)?.size ?? 0;
    },
    async deleteScope(table: Table, scope: string) {
      tables.get(table)?.delete(scope);
    },
    async scopes(table: Table) {
      return [...(tables.get(table)?.keys() ?? [])].filter((s) => (tables.get(table)?.get(s)?.size ?? 0) > 0);
    },
    dump() {
      const out: Record<string, Record<string, number>> = {};
      for (const [t, scopes] of tables) {
        out[t] = {};
        for (const [s, rows] of scopes) out[t][s] = rows.size;
      }
      return out;
    },
  };
}
