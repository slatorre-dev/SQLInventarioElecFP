const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');

// Descarga del fichero .db directamente (equivalente al export D1)
// En producción, considera autenticar esta ruta o moverla a un script de cron
router.get('/', (req, res) => {
  const dbPath = process.env.DB_PATH || path.join(__dirname, '..', '..', 'database', 'inventario.db');
  if (!fs.existsSync(dbPath)) {
    return res.status(404).json({ ok: false, error: 'Base de datos no encontrada' });
  }
  const filename = `backup_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}.db`;
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Content-Type', 'application/octet-stream');
  res.sendFile(path.resolve(dbPath));
});

module.exports = router;
