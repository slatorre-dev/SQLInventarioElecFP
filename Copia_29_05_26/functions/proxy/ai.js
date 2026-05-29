/**
 * Pages Function — Proxy para GitHub Models (OpenAI-compatible)
 * Ruta: /proxy/ai
 * GITHUB_TOKEN: Personal Access Token de GitHub (secret de Cloudflare)
 * Modelos disponibles: gpt-4o-mini, gpt-4o, meta-llama-3.1-70b-instruct, phi-4, mistral-large...
 */

const GITHUB_MODELS_URL = 'https://models.inference.ai.azure.com/chat/completions';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function onRequestPost({ request, env }) {
  if (!env.GITHUB_TOKEN) {
    return new Response(JSON.stringify({ error: 'GITHUB_TOKEN no configurado en Cloudflare' }), {
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

  const resp = await fetch(GITHUB_MODELS_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${env.GITHUB_TOKEN}`,
    },
    body: JSON.stringify(body),
  });

  return new Response(resp.body, {
    status: resp.status,
    headers: {
      ...CORS,
      'Content-Type': resp.headers.get('Content-Type') ?? 'application/json',
    },
  });
}
