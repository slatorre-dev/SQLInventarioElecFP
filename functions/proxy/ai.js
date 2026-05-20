/**
 * Pages Function — Proxy para Anthropic API
 * Ruta: /proxy/ai
 * La API key vive en env.ANTHROPIC_KEY (secret de Cloudflare, nunca en el cliente)
 */

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function onRequestPost({ request, env }) {
  if (!env.ANTHROPIC_KEY) {
    return new Response(JSON.stringify({ error: 'ANTHROPIC_KEY no configurada' }), {
      status: 500,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Body inválido' }), {
      status: 400,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  const resp = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': env.ANTHROPIC_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(body),
  });

  // Pasar la respuesta tal cual (incluyendo streaming SSE)
  return new Response(resp.body, {
    status: resp.status,
    headers: {
      ...CORS,
      'Content-Type': resp.headers.get('Content-Type') ?? 'application/json',
    },
  });
}
