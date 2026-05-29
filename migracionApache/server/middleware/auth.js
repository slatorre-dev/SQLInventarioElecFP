const DB = require('../db');

const PUBLIC_PATHS = ['/api/auth', '/api/backup'];

module.exports = function authMiddleware(req, res, next) {
  if (PUBLIC_PATHS.some(p => req.path.startsWith(p.replace('/api', '')))) return next();

  const u = req.query.u || '';
  const p = req.query.p || '';
  const t = req.query.t || '';

  if (u && p) {
    const user = DB.raw.prepare(
      'SELECT usuario, nombre, rol, email FROM usuarios WHERE usuario=? AND password=?'
    ).get(u.trim(), p);
    if (!user) return res.status(401).json({ ok: false, error: 'No autorizado' });
    req.user = user;
    return next();
  }

  if (u && t) {
    const user = DB.raw.prepare(
      'SELECT usuario, nombre, rol, email FROM usuarios WHERE usuario=? AND session_token=?'
    ).get(u.trim(), t);
    if (!user) return res.status(401).json({ ok: false, error: 'No autorizado' });
    req.user = user;
    return next();
  }

  return res.status(401).json({ ok: false, error: 'No autorizado' });
};
