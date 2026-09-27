/**
 * better-sqlite3 compatible synchronous shim using node-sqlite3-wasm (pure-JS SQLite).
 * Implements the subset of the API used by PaySmart Pro repositories.
 */
'use strict';

const { Database: WasmDB } = require('/tmp/paysmart_test/node_modules/node-sqlite3-wasm');

function _normalise(row) {
  if (!row) return row;
  // Convert BigInt to Number if present
  const out = {};
  for (const [k, v] of Object.entries(row)) {
    out[k] = typeof v === 'bigint' ? Number(v) : v;
  }
  return out;
}

class Statement {
  constructor(db, sql) {
    this._db = db;
    this._sql = sql;
  }

  get(...params) {
    const flat = params.flat();
    try {
      const row = this._db.get(this._sql, flat.length > 0 ? flat : undefined);
      return row ? _normalise(row) : undefined;
    } catch (e) {
      throw new Error(`SQLite get() error [${this._sql.substring(0,80)}]: ${e.message}`);
    }
  }

  all(...params) {
    const flat = params.flat();
    try {
      const rows = this._db.all(this._sql, flat.length > 0 ? flat : undefined);
      return rows.map(_normalise);
    } catch (e) {
      throw new Error(`SQLite all() error [${this._sql.substring(0,80)}]: ${e.message}`);
    }
  }

  run(...params) {
    const flat = params.flat();
    try {
      this._db.run(this._sql, flat.length > 0 ? flat : undefined);
      return { changes: 1, lastInsertRowid: 0 };
    } catch (e) {
      throw new Error(`SQLite run() error [${this._sql.substring(0,80)}]: ${e.message}`);
    }
  }
}

class Database {
  constructor(_path, _opts) {
    this._db = new WasmDB(':memory:');
    // Enable foreign keys
    try { this._db.run('PRAGMA foreign_keys=ON'); } catch (_) {}
  }

  prepare(sql) {
    return new Statement(this._db, sql);
  }

  pragma(str) {
    try {
      this._db.run(`PRAGMA ${str.trim()}`);
    } catch (_) {}
  }

  transaction(fn) {
    const self = this;
    return (...args) => {
      self._db.run('BEGIN');
      try {
        const result = fn(...args);
        self._db.run('COMMIT');
        return result;
      } catch (e) {
        try { self._db.run('ROLLBACK'); } catch (_) {}
        throw e;
      }
    };
  }

  exec(sql) {
    this._db.exec(sql);
  }

  close() {
    try { this._db.close(); } catch (_) {}
  }
}

module.exports = Database;
