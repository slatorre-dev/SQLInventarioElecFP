require('dotenv').config();
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host:     process.env.DB_HOST || 'mysql',
  port:     Number(process.env.DB_PORT) || 3306,
  user:     process.env.DB_USER || 'inventarioelec',
  password: process.env.DB_PASS || 'QuesoFrito_1',
  database: process.env.DB_NAME || 'inventario-departamento',
  waitForConnections: true,
  connectionLimit: 10,
  charset: 'utf8mb4',
});

// Wrapper compatible con la API de Cloudflare D1 (async)
function makeBound(sql, args) {
  return {
    _sql: sql,
    _args: args,
    async run() {
      const [result] = await pool.execute(sql, args);
      return { meta: { changes: result.affectedRows, last_row_id: result.insertId } };
    },
    async first() {
      const [rows] = await pool.execute(sql, args);
      return rows[0] ?? null;
    },
    async all() {
      const [rows] = await pool.execute(sql, args);
      return { results: rows };
    },
  };
}

const DB = {
  prepare(sql) {
    return {
      bind(...args) { return makeBound(sql, args); },
      run(...args)  { return makeBound(sql, args).run(); },
      first(...args){ return makeBound(sql, args).first(); },
      all(...args)  { return makeBound(sql, args).all(); },
    };
  },

  async batch(boundStatements) {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      for (const bs of boundStatements) {
        await conn.execute(bs._sql, bs._args);
      }
      await conn.commit();
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }
    return [];
  },

  // Para verificar conectividad en arranque
  async ping() {
    const conn = await pool.getConnection();
    await conn.ping();
    conn.release();
  },
};

module.exports = DB;
