const DB = require('../db');

const PUBLIC_PATHS = ['/auth', '/backup'];

module.exports = async function authMiddleware(req, res, next) {
  if (PUBLIC_PATHS.some(p => req.path.startsWith(p))) return next();

  const u = req.query.u || '';
  const p = req.query.p || '';
  const t = req.query.t || '';

  try {
    if (u && p) {
      const user = await DB.prepare(
        'SELECT usuario, nombre, rol, email FROM usuarios WHERE usuario=? AND password=?'
      ).bind(u.trim(), p).first();
      if (!user) return res.status(401).json({ ok: false, error: 'No autorizado' });
      req.user = user;
      return next();
    }

    if (u && t) {
      const user = await DB.prepare(
        'SELECT usuario, nombre, rol, email FROM usuarios WHERE usuario=? AND session_token=?'
      ).bind(u.trim(), t).first();
      if (!user) return res.status(401).json({ ok: false, error: 'No autorizado' });
      req.user = user;
      return next();
    }
  } catch (err) {
    console.error('authMiddleware error:', err.message);
    return res.status(500).json({ ok: false, error: 'Error de autenticacion' });
  }

  return res.status(401).json({ ok: false, error: 'No autorizado' });
};
