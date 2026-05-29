require('dotenv').config();
const Database = require('better-sqlite3');
const path = require('path');

const dbPath = process.env.DB_PATH || path.join(__dirname, '..', 'database', 'inventario.db');
const rawDb = new Database(dbPath);
rawDb.pragma('journal_mode = WAL');
rawDb.pragma('foreign_keys = ON');

// Wrapper compatible con la API de Cloudflare D1 (async)
// Permite reutilizar los handlers originales con cambios mínimos
function makeBound(stmt, args) {
  return {
    _syncRun() { return stmt.run(...args); },
    run() {
      try {
        const r = stmt.run(...args);
        return Promise.resolve({ meta: { changes: r.changes, last_row_id: r.lastInsertRowid } });
      } catch (e) { return Promise.reject(e); }
    },
    first() {
      try { return Promise.resolve(stmt.get(...args) ?? null); }
      catch (e) { return Promise.reject(e); }
    },
    all() {
      try { return Promise.resolve({ results: stmt.all(...args) }); }
      catch (e) { return Promise.reject(e); }
    },
  };
}

const DB = {
  prepare(sql) {
    let stmt;
    try { stmt = rawDb.prepare(sql); } catch (e) {
      const fail = { run: () => Promise.reject(e), first: () => Promise.reject(e), all: () => Promise.reject(e) };
      return { ...fail, bind: () => fail };
    }
    return {
      bind(...args) { return makeBound(stmt, args); },
      run(...args)  { return makeBound(stmt, args).run(); },
      first(...args){ return makeBound(stmt, args).first(); },
      all(...args)  { return makeBound(stmt, args).all(); },
    };
  },

  // Ejecuta un array de bound-statements en una transacción
  async batch(boundStatements) {
    const txn = rawDb.transaction(() => {
      for (const bs of boundStatements) bs._syncRun();
    });
    txn();
    return [];
  },
};

// Exponer el db raw para middleware (síncrono)
DB.raw = rawDb;

module.exports = DB;
