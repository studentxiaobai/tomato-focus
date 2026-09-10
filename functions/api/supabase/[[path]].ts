const DEFAULT_SUPABASE_URL = 'https://depglbsiurhxxnuricht.supabase.co';

interface Context {
  request: Request;
  env: { SUPABASE_URL?: string };
  params: { path?: string | string[] };
}

export async function onRequest(context: Context): Promise<Response> {
  const requestUrl = new URL(context.request.url);
  const path = Array.isArray(context.params.path)
    ? context.params.path.join('/')
    : context.params.path ?? '';
  const upstreamBase = (context.env.SUPABASE_URL || DEFAULT_SUPABASE_URL).replace(/\/$/, '');
  const upstreamUrl = new URL(`${upstreamBase}/${path}${requestUrl.search}`);

  const headers = new Headers(context.request.headers);
  headers.delete('host');
  headers.delete('origin');
  headers.delete('referer');
  headers.delete('cookie');
  headers.delete('content-length');
  headers.delete('accept-encoding');
  headers.delete('cf-connecting-ip');
  headers.delete('cf-ipcountry');
  headers.delete('cf-ray');
  headers.delete('x-forwarded-for');
  headers.delete('x-forwarded-host');
  headers.delete('x-forwarded-proto');

  const method = context.request.method.toUpperCase();
  const upstream = await fetch(upstreamUrl, {
    method,
    headers,
    body: method === 'GET' || method === 'HEAD' ? undefined : context.request.body,
    redirect: 'manual',
  });

  const responseHeaders = new Headers(upstream.headers);
  responseHeaders.delete('content-encoding');
  responseHeaders.delete('content-length');
  responseHeaders.delete('transfer-encoding');
  responseHeaders.delete('connection');
  responseHeaders.delete('set-cookie');

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  });
}