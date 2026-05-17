export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  // GET /api/historial — obtener historial (solo Seba)
  if (request.method === 'GET') {
    const usuario = (url.searchParams.get('usuario') || '').toLowerCase();

    // Solo Seba puede ver el historial completo
    if (usuario !== 'seba') {
      return new Response(JSON.stringify({ error: 'No autorizado' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    try {
      const stmt = env.DB.prepare(`
        SELECT id, timestamp, usuario, accion, que, nombre, detalles
        FROM historial
        ORDER BY timestamp DESC
        LIMIT 500
      `);
      const result = stmt.all();

      return new Response(JSON.stringify(result.results || []), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (err) {
      console.error('Error fetching historial:', err);
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  // POST /api/historial — registrar evento (log)
  if (request.method === 'POST') {
    try {
      const data = await request.json();
      const { usuario, accion, que, nombre, detalles } = data;

      if (!usuario || !accion || !que) {
        return new Response(JSON.stringify({ error: 'Faltan campos requeridos' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const stmt = env.DB.prepare(`
        INSERT INTO historial (usuario, accion, que, nombre, detalles)
        VALUES (?, ?, ?, ?, ?)
      `);
      stmt.bind(usuario, accion, que, nombre || null, detalles || null);
      const result = stmt.run();

      return new Response(JSON.stringify({ success: true, id: result.meta.last_row_id }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (err) {
      console.error('Error logging historial:', err);
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), {
    status: 405,
    headers: { 'Content-Type': 'application/json' }
  });
}
