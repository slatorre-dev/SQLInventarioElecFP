// Importa el backup SQL al fichero inventario.db
// Uso: node scripts/import-db.js ../database/backup_20260529.sql
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const sqlFile = process.argv[2] || path.join(__dirname, '..', '..', 'database', 'backup_20260529.sql');
const dbPath  = process.env.DB_PATH || path.join(__dirname, '..', '..', 'database', 'inventario.db');

if (!fs.existsSync(sqlFile)) {
  console.error('No se encuentra el archivo SQL:', sqlFile);
  process.exit(1);
}

console.log('Importando', sqlFile, '→', dbPath);
const sql = fs.readFileSync(sqlFile, 'utf-8');
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.exec(sql);
db.close();
console.log('¡Importación completada!', dbPath);
