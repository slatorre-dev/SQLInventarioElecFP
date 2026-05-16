function html(body) {
  return new Response(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>OAuth Drive</title>
  <style>body{font-family:system-ui,-apple-system,Segoe UI,sans-serif;max-width:860px;margin:42px auto;padding:0 20px;line-height:1.5;color:#111827}code,textarea{font-family:ui-monospace,SFMono-Regular,Consolas,monospace}textarea{width:100%;min-height:120px;padding:12px;border:1px solid #d1d5db;border-radius:8px}pre{white-space:pre-wrap;background:#f3f4f6;padding:12px;border-radius:8px}.ok{color:#047857}.err{color:#b91c1c}</style>
  </head><body>${body}</body></html>`, {
    headers: { 'content-type': 'text/html;charset=utf-8' },
  });
}

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');
  const redirectUri = `${url.origin}/api/oauth/callback`;

  if (error) {
    return html(`<h1 class="err">Google OAuth cancelado</h1><pre>${error}</pre>`);
  }
  if (!code) {
    return html('<h1 class="err">Falta el código OAuth</h1>');
  }
  if (!env.GOOGLE_OAUTH_CLIENT_ID || !env.GOOGLE_OAUTH_CLIENT_SECRET) {
    return html(`<h1 class="err">Faltan GOOGLE_OAUTH_CLIENT_ID o GOOGLE_OAUTH_CLIENT_SECRET en Cloudflare</h1>
      <p>Variables disponibles en runtime:</p>
      <pre>${JSON.stringify(Object.keys(env).sort(), null, 2)}</pre>`);
  }

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_OAUTH_CLIENT_ID,
      client_secret: env.GOOGLE_OAUTH_CLIENT_SECRET,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });
  const tokenJson = await tokenRes.json();

  if (!tokenRes.ok) {
    return html(`<h1 class="err">Error intercambiando código OAuth</h1><pre>${JSON.stringify(tokenJson, null, 2)}</pre>`);
  }

  if (!tokenJson.refresh_token) {
    return html(`<h1 class="err">Google no devolvió refresh_token</h1>
      <p>Revoca el acceso de la app en tu cuenta de Google y vuelve a abrir <code>/api/oauth/start</code>. El endpoint ya usa <code>prompt=consent</code> y <code>access_type=offline</code>.</p>
      <pre>${JSON.stringify(tokenJson, null, 2)}</pre>`);
  }

  return html(`<h1 class="ok">OAuth de Drive autorizado</h1>
    <p>Copia este valor y guárdalo en Cloudflare Pages como secreto <code>GOOGLE_OAUTH_REFRESH_TOKEN</code>.</p>
    <textarea readonly>${tokenJson.refresh_token}</textarea>
    <p>Después redeploy o espera a que Cloudflare aplique las variables. No subas este token a GitHub.</p>`);
}
