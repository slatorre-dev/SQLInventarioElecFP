function randomToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return [...bytes].map(b => b.toString(16).padStart(2, '0')).join('');
}

function appBaseUrl(request, bodyOrParams) {
  const raw = bodyOrParams?.appUrl || '';
  if (raw && /^https?:\/\//i.test(raw)) {
    const url = new URL(raw);
    url.hash = '';
    url.search = '';
    return url.toString();
  }
  const url = new URL(request.url);
  return `${url.origin}/`;
}

async function sendResetEmail(env, to, resetUrl, userName) {
  if (!env.RESEND_API_KEY) {
    throw new Error('Correo no configurado: falta RESEND_API_KEY');
  }
  const from = env.MAIL_FROM || 'Inventario Taller FP <onboarding@resend.dev>';
  const subject = 'Recuperación de contraseña - Inventario Taller FP';
  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.5;color:#111827">
      <h2>Recuperación de contraseña</h2>
      <p>Hola${userName ? ' ' + userName : ''},</p>
      <p>Se ha solicitado cambiar la contraseña de tu cuenta en Inventario Taller FP.</p>
      <p><a href="${resetUrl}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:10px 16px;border-radius:8px">Cambiar contraseña</a></p>
      <p>Si no has solicitado este cambio, puedes ignorar este correo.</p>
      <p style="font-size:12px;color:#6b7280">El enlace caduca en 1 hora.</p>
    </div>`;
  const text = `Recuperación de contraseña\n\nAbre este enlace para cambiar tu contraseña:\n${resetUrl}\n\nEl enlace caduca en 1 hora.`;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from, to, subject, html, text }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.message || data?.error || 'No se pudo enviar el correo');
  }
}

async function ensureResetTable(db) {
  await db.prepare("CREATE TABLE IF NOT EXISTS reset_tokens (token TEXT PRIMARY KEY, usuario TEXT DEFAULT '', expires INTEGER DEFAULT 0)").run();
}

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const action = url.searchParams.get('action') || '';
  const u = url.searchParams.get('u') || '';
  const p = url.searchParams.get('p') || '';

  if (action === 'login') {
    if (!u || !p) return Response.json({ ok: false, error: 'Credenciales incorrectas' });
    const user = await env.DB.prepare(
      'SELECT usuario, nombre, rol, email FROM usuarios WHERE usuario=? AND password=?'
    ).bind(u.trim(), p).first();
    if (!user) return Response.json({ ok: false, error: 'Credenciales incorrectas' });
    return Response.json({ ok: true, user });
  }

  if (action === 'requestReset') {
    try {
      await ensureResetTable(env.DB);
      const usuario = url.searchParams.get('usuario') || '';
      const user = usuario ? await env.DB.prepare(
        'SELECT usuario, nombre, email FROM usuarios WHERE usuario=?'
      ).bind(usuario.trim()).first() : null;

      // Respuesta generica para no revelar si el usuario existe.
      if (!user || !user.email) return Response.json({ ok: true });

      const token = randomToken();
      const expires = Date.now() + 60 * 60 * 1000;
      await env.DB.prepare('INSERT OR REPLACE INTO reset_tokens (token,usuario,expires) VALUES (?,?,?)')
        .bind(token, user.usuario, expires).run();

      const resetUrl = appBaseUrl(request, { appUrl: url.searchParams.get('appUrl') }) + '#reset/' + encodeURIComponent(token);
      await sendResetEmail(env, user.email, resetUrl, user.nombre);
      return Response.json({ ok: true });
    } catch (error) {
      console.error('requestReset error', error?.message || error);
      return Response.json({ ok: false, error: error?.message || String(error) });
    }
  }

  return Response.json({ ok: false, error: 'Acción desconocida' });
}

export async function onRequestPost({ request, env }) {
  let body = {};
  try {
    body = await request.json();
  } catch (error) {
    return Response.json({ ok: false, error: 'JSON inválido' });
  }

  if (body.action === 'resetPassword') {
    try {
      await ensureResetTable(env.DB);
      if (!body.token) return Response.json({ ok: false, error: 'Token requerido' });
      if (!body.newPassword || body.newPassword.length < 4) {
        return Response.json({ ok: false, error: 'Contraseña demasiado corta' });
      }

      const row = await env.DB.prepare('SELECT * FROM reset_tokens WHERE token=?')
        .bind(body.token).first();
      if (!row || Number(row.expires) < Date.now()) {
        return Response.json({ ok: false, error: 'El enlace ha caducado o no es válido' });
      }

      await env.DB.prepare('UPDATE usuarios SET password=? WHERE usuario=?')
        .bind(body.newPassword, row.usuario).run();
      await env.DB.prepare('DELETE FROM reset_tokens WHERE token=?').bind(body.token).run();
      return Response.json({ ok: true });
    } catch (error) {
      console.error('resetPassword error', error?.message || error);
      return Response.json({ ok: false, error: error?.message || String(error) });
    }
  }

  return Response.json({ ok: false, error: 'Acción desconocida' });
}
