export async function onRequest({ request, env, next }) {
  const url = new URL(request.url);

  // Rutas públicas
  if (url.pathname.startsWith('/api/auth')) return next();

  const u = url.searchParams.get('u') || '';
  const p = url.searchParams.get('p') || '';
  if (!u || !p) return Response.json({ ok: false, error: 'No autorizado' }, { status: 401 });

  const user = await env.DB.prepare(
    'SELECT usuario, nombre, rol, email FROM usuarios WHERE usuario=? AND password=?'
  ).bind(u.trim(), p).first();

  if (!user) return Response.json({ ok: false, error: 'No autorizado' }, { status: 401 });

  request.user = user;
  return next();
}
