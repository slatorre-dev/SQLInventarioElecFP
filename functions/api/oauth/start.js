export async function onRequestGet({ request, env }) {
  if (!env.GOOGLE_OAUTH_CLIENT_ID) {
    return Response.json({ ok: false, error: 'Falta GOOGLE_OAUTH_CLIENT_ID' }, { status: 500 });
  }

  const url = new URL(request.url);
  const redirectUri = `${url.origin}/api/oauth/callback`;
  const state = btoa(JSON.stringify({
    ts: Date.now(),
    origin: url.origin,
    user: request.user?.usuario || '',
  })).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.set('client_id', env.GOOGLE_OAUTH_CLIENT_ID);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', 'https://www.googleapis.com/auth/drive.file');
  authUrl.searchParams.set('access_type', 'offline');
  authUrl.searchParams.set('prompt', 'consent');
  authUrl.searchParams.set('state', state);

  return Response.redirect(authUrl.toString(), 302);
}
