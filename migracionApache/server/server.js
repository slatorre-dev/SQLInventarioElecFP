require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Middleware de autenticación para todas las rutas /api
app.use('/api', require('./middleware/auth'));

// Rutas API
app.use('/api/auth',            require('./routes/auth'));
app.use('/api/list',            require('./routes/list'));
app.use('/api/item',            require('./routes/item'));
app.use('/api/prestar',         require('./routes/prestar'));
app.use('/api/historial',       require('./routes/historial'));
app.use('/api/usuarios',        require('./routes/usuarios'));
app.use('/api/config',          require('./routes/config'));
app.use('/api/meta',            require('./routes/meta'));
app.use('/api/intent-learning', require('./routes/intent-learning'));
app.use('/api/profesores',      require('./routes/profesores'));
app.use('/api/perfil',          require('./routes/perfil'));
app.use('/api/backup',          require('./routes/backup'));

// Servir frontend estático (solo en desarrollo; en producción lo sirve Apache)
if (process.env.SERVE_STATIC === 'true') {
  app.use(express.static(path.join(__dirname, '..', 'public')));
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, '127.0.0.1', () => {
  console.log(`Inventario API escuchando en http://127.0.0.1:${PORT}`);
});
