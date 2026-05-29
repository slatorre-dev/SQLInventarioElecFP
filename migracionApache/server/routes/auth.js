const express = require('express');
const router = express.Router();
const DB = require('../db');

function randomToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return [...bytes].map(b => b.toString(16).padStart(2, '0')).join('');
}

async function getGmailAccessToken() {
  const { GOOGLE_OAUTH_CLIENT_ID: client_id, GOOGLE_OAUTH_CLIENT_SECRET: client_secret, GOOGLE_OAUTH_REFRESH_TOKEN: refresh_token } = process.env;
  if (!client_id || !client_secret || !refresh_token) throw new Error('Correo no configurado');
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id, client_secret, refresh_token, grant_type: 'refresh_token' }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.access_token) throw new Error(data?.error_description || 'No se pudo obtener access token');
  return data.access_token;
}

async function sendResetEmail(to, resetUrl, userName) {
  const accessToken = await getGmailAccessToken();
  const from = process.env.MAIL_FROM || 'inventarioelec@iesjuanbosco.es';
  const subject = 'Recuperación de contraseña - Inventario Taller FP';
  const htmlBody = `<div style="font-family:Arial,sans-serif;line-height:1.5;color:#111827">
    <h2>Recuperación de contraseña</h2>
    <p>Hola${userName ? ' ' + userName : ''},</p>
    <p>Se ha solicitado cambiar la contraseña de tu cuenta en Inventario Taller FP.</p>
    <p><a href="${resetUrl}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:10px 16px;border-radius:8px">Cambiar contraseña</a></p>
    <p>Si no has solicitado este cambio, puedes ignorar este correo.</p>
    <p style="font-size:12px;color:#6b7280">El enlace caduca en 1 hora.</p>
  </div>`;
  const subjectEncoded = '=?UTF-8?B?' + btoa(unescape(encodeURIComponent(subject))) + '?=';
  const mime = [
    `From: Inventario Taller FP <${from}>`, `To: ${to}`, `Subject: ${subjectEncoded}`,
    'MIME-Version: 1.0', 'Content-Type: text/html; charset=utf-8', 'Content-Transfer-Encoding: base64',
    '', btoa(unescape(encodeURIComponent(htmlBody))),
  ].join('\r\n');
  const encoded = btoa(unescape(encodeURIComponent(mime))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const r = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ raw: encoded }),
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d?.error?.message || 'No se pudo enviar el correo');
}

async function ensureResetTable() {
  await DB.prepare("CREATE TABLE IF NOT EXISTS reset_tokens (token TEXT PRIMARY KEY, usuario TEXT DEFAULT '', expires INTEGER DEFAULT 0)").run();
}

router.get('/', async (req, res) => {
  const { action, u, p } = req.query;

  if (action === 'login') {
    if (!u || !p) return res.json({ ok: false, error: 'Credenciales incorrectas' });
    const user = await DB.prepare(
      'SELECT usuario, nombre, rol, email FROM usuarios WHERE usuario=? AND password=?'
    ).bind(u.trim(), p).first();
    if (!user) return res.json({ ok: false, error: 'Credenciales incorrectas' });
    return res.json({ ok: true, user });
  }

  if (action === 'requestReset') {
    try {
      await ensureResetTable();
      const usuario = req.query.usuario || '';
      const user = usuario ? await DB.prepare(
        'SELECT usuario, nombre, email FROM usuarios WHERE usuario=?'
      ).bind(usuario.trim()).first() : null;
      if (!user || !user.email) return res.json({ ok: true });
      const token = randomToken();
      const expires = Date.now() + 60 * 60 * 1000;
      await DB.prepare('INSERT OR REPLACE INTO reset_tokens (token,usuario,expires) VALUES (?,?,?)').bind(token, user.usuario, expires).run();
      const appUrl = req.query.appUrl || '';
      const baseUrl = appUrl && /^https?:\/\//i.test(appUrl)
        ? new URL(appUrl).origin + '/'
        : `${req.protocol}://${req.get('host')}/`;
      const resetUrl = baseUrl + '#reset/' + encodeURIComponent(token);
      await sendResetEmail(user.email, resetUrl, user.nombre);
      return res.json({ ok: true });
    } catch (error) {
      return res.json({ ok: false, error: error?.message || String(error) });
    }
  }

  res.json({ ok: false, error: 'Acción desconocida' });
});

router.post('/', async (req, res) => {
  const body = req.body || {};
  if (body.action === 'resetPassword') {
    try {
      await ensureResetTable();
      if (!body.token) return res.json({ ok: false, error: 'Token requerido' });
      if (!body.newPassword || body.newPassword.length < 4) return res.json({ ok: false, error: 'Contraseña demasiado corta' });
      const row = await DB.prepare('SELECT * FROM reset_tokens WHERE token=?').bind(body.token).first();
      if (!row || Number(row.expires) < Date.now()) return res.json({ ok: false, error: 'El enlace ha caducado o no es válido' });
      await DB.prepare('UPDATE usuarios SET password=? WHERE usuario=?').bind(body.newPassword, row.usuario).run();
      await DB.prepare('DELETE FROM reset_tokens WHERE token=?').bind(body.token).run();
      return res.json({ ok: true });
    } catch (error) {
      return res.json({ ok: false, error: error?.message || String(error) });
    }
  }
  res.json({ ok: false, error: 'Acción desconocida' });
});

module.exports = router;
