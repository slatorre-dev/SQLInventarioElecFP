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

  return Response.json({ ok: false, error: 'Acción desconocida' });
}
