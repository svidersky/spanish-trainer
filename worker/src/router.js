// Public HTTP API of the Sync server. Validates requests and hands each one to the Durable
// Object of its Profile (env.PROFILES.getByName(name)), which does the PIN check, lockout and
// versioned save. Plain module without Cloudflare imports, so Node tests can run it.
//
//   POST /load  { name, pin }                     -> 200 { progress | null, version }
//   POST /save  { name, pin, version, progress }  -> 200 { version } | 409 { progress, version }
//   Errors: 400 invalid, 401 wrong PIN, 404/405, 413 too large, 423 locked { retryAfterSeconds }

const MAX_BODY_BYTES = 512 * 1024;
const NAME_RE = /^[\p{L}\p{N}_-]{2,32}$/u;
const PIN_RE = /^\d{4}$/;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
};

const respond = (status, jsonText) =>
  new Response(jsonText, { status, headers: { 'Content-Type': 'application/json', ...CORS } });
const json = (status, body) => respond(status, JSON.stringify(body));

export async function route(request, env) {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });

  const path = new URL(request.url).pathname;
  if (path !== '/load' && path !== '/save') return json(404, { error: 'not-found' });
  if (request.method !== 'POST') return json(405, { error: 'method-not-allowed' });

  const text = await request.text();
  if (new TextEncoder().encode(text).length > MAX_BODY_BYTES) return json(413, { error: 'too-large' });

  let body;
  try { body = JSON.parse(text); } catch { return json(400, { error: 'bad-json' }); }
  if (!body || typeof body !== 'object') return json(400, { error: 'bad-json' });

  const name = typeof body.name === 'string' ? body.name.trim().toLowerCase() : '';
  if (!NAME_RE.test(name)) return json(400, { error: 'bad-name' });
  if (typeof body.pin !== 'string' || !PIN_RE.test(body.pin)) return json(400, { error: 'bad-pin' });

  const op = path.slice(1);
  if (op === 'save' && (!body.progress || typeof body.progress !== 'object' || !Number.isInteger(body.version))) {
    return json(400, { error: 'bad-save' });
  }

  const forward = { op, pin: body.pin, version: body.version, progress: body.progress };
  const res = await env.PROFILES.getByName(name).fetch(new Request('https://profile/' + op, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(forward),
  }));
  return respond(res.status, await res.text());
}

export default { fetch: route };
