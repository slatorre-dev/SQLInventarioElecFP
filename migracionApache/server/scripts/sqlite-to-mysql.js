// Convierte un dump SQLite (D1) a SQL compatible con MySQL 8
// Uso: node sqlite-to-mysql.js <entrada.sql> <salida.sql>
const fs = require('fs');

const input  = process.argv[2] || 'backup.sql';
const output = process.argv[3] || 'backup_mysql.sql';

const src = fs.readFileSync(input, 'utf-8');
const lines = src.split('\n');
const out = [];

out.push('SET NAMES utf8mb4;');
out.push('SET foreign_key_checks = 0;');
out.push('SET sql_mode = \'\';');
out.push('USE `inventario-departamento`;');
out.push('');

// Tipos de datos SQL que siguen a un nombre de columna
const TYPE_RE = /\b(TEXT|INTEGER|INT|VARCHAR|REAL|BLOB|BIGINT|TINYINT|SMALLINT|FLOAT|DOUBLE|CHAR)\b/i;

let inCreateTable = false;
let inCreateIndex = false;

for (let line of lines) {
  const t = line.trim();

  // Saltar PRAGMA
  if (t.startsWith('PRAGMA')) continue;
  // Saltar tabla interna sqlite_sequence
  if (t.includes('sqlite_sequence')) continue;

  // Detectar inicio y fin de CREATE TABLE
  if (/^CREATE TABLE/i.test(t)) inCreateTable = true;
  if (inCreateTable && t.endsWith(');')) {
    // Añadir opciones de tabla: ROW_FORMAT=DYNAMIC soporta filas grandes y emojis
    line = line.replace(/\);\s*$/, ') ENGINE=InnoDB ROW_FORMAT=DYNAMIC DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;');
    inCreateTable = false;
  }

  // En bloques CREATE TABLE: envolver nombres de columna con backticks
  if (inCreateTable && /^\s+[a-zA-Z_][a-zA-Z0-9_]*\s/.test(line) && TYPE_RE.test(line)) {
    line = line.replace(
      /^(\s+)([a-zA-Z_][a-zA-Z0-9_]*)(\s)/,
      (_, ws, col, sp) => ws + '`' + col + '`' + sp
    );
  }

  // INSERT OR REPLACE → REPLACE INTO
  line = line.replace(/INSERT\s+OR\s+REPLACE\s+INTO/gi, 'REPLACE INTO');
  // INSERT OR IGNORE → INSERT IGNORE INTO
  line = line.replace(/INSERT\s+OR\s+IGNORE\s+INTO/gi, 'INSERT IGNORE INTO');
  // AUTOINCREMENT → AUTO_INCREMENT
  line = line.replace(/\bAUTOINCREMENT\b/g, 'AUTO_INCREMENT');

  // Identificadores entre comillas dobles → backticks (INSERT statements)
  line = line.replace(/"([^"]+)"/g, (_, name) => '`' + name + '`');

  // datetime('now') → NOW()
  line = line.replace(/datetime\('now'\)/gi, 'NOW()');

  // TEXT DEFAULT 'xxx' → VARCHAR(500) DEFAULT 'xxx'  (MySQL no acepta TEXT DEFAULT literal)
  line = line.replace(/\bTEXT\s+DEFAULT\s+'([^']*)'/gi, "VARCHAR(500) DEFAULT '$1'");
  // TEXT DEFAULT NULL → TEXT (sin default)
  line = line.replace(/\bTEXT\s+DEFAULT\s+NULL\b/gi, 'TEXT');
  // TEXT PRIMARY KEY → VARCHAR(500) PRIMARY KEY
  line = line.replace(/\bTEXT\s+PRIMARY\s+KEY\b/gi, 'VARCHAR(500) PRIMARY KEY');

  // Palabras reservadas MySQL usadas como columnas en CREATE TABLE de una sola línea
  // (CREATE TABLE tabla (key TYPE, ...)) → backticks en columnas conocidas
  if (/CREATE\s+TABLE/i.test(line)) {
    const reserved = ['key', 'mod', 'desc', 'order', 'index', 'group', 'select', 'where', 'from', 'name', 'status', 'type', 'value', 'schema', 'option', 'rank'];
    for (const word of reserved) {
      // Envolver la palabra si aparece como nombre de columna (seguida de tipo SQL o PRIMARY)
      const re = new RegExp('\\b(' + word + ')(\\s+(?:TEXT|INTEGER|INT|VARCHAR|BIGINT|TINYINT|FLOAT|DOUBLE|CHAR|PRIMARY))', 'gi');
      line = line.replace(re, (_, col, rest) => '`' + col + '`' + rest);
    }
  }

  // PRIMARY KEY (col1, col2) dentro de CREATE TABLE → añadir (191) a columnas sin longitud
  if (inCreateTable && /PRIMARY\s+KEY\s*\(/i.test(line)) {
    line = line.replace(/PRIMARY\s+KEY\s*\(([^)]+)\)/i, (_, cols) => {
      const fixed = cols.split(',').map(col => {
        col = col.trim();
        return /\(\d+\)/.test(col) ? col : col + '(191)';
      }).join(', ');
      return 'PRIMARY KEY (' + fixed + ')';
    });
  }

  // Detectar CREATE INDEX multilínea
  if (/^CREATE\s+(UNIQUE\s+)?INDEX\b/i.test(t)) inCreateIndex = true;

  // En CREATE INDEX (simple o continuación multilínea): añadir (191) a columnas sin longitud
  if (inCreateIndex && /\([^)]+\)\s*;?\s*$/.test(line)) {
    line = line.replace(/\(([^)]+)\)\s*;?\s*$/, (_, cols) => {
      const fixed = cols.split(',').map(col => {
        col = col.trim();
        return /\(\d+\)/.test(col) ? col : col + '(191)';
      }).join(', ');
      return '(' + fixed + ');';
    });
    inCreateIndex = false;
  }

  out.push(line);
}

out.push('');
out.push('SET foreign_key_checks = 1;');

fs.writeFileSync(output, out.join('\n'), 'utf-8');
console.log(`✓ Convertido: ${input} → ${output}`);

// Mostrar las primeras líneas del CREATE TABLE inventario para verificar
const preview = out.slice(4, 35).join('\n');
console.log('\n--- Preview CREATE TABLE inventario ---');
console.log(preview);
