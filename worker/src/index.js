// Sync server for the Spanish trainer, deployed as a Cloudflare Worker.
// Stores one copy of progress per Profile (name + 4-digit PIN) in Workers KV.
// It does not merge: the app merges and saves with the version it started from (optimistic
// concurrency), and a stale save gets 409 with the current copy.
//
//   POST /load  { name, pin }                     -> 200 { progress | null, version }
//   POST /save  { name, pin, version, progress }  -> 200 { version } | 409 { progress, version }
//   Errors: 400 invalid, 401 wrong PIN, 404/405, 413 too large, 423 locked { retryAfterSeconds }

const MAX_BODY_BYTES = 512 * 1024;
const MAX_FAILS = 5;
const LOCK_MS = 60 * 60 * 1000;
const FAILS_TTL_SECONDS = 2 * 60 * 60; // KV minimum is 60
const NAME_RE = /^[\p{L}\p{N}_-]{2,32}$/u;
const PIN_RE = /^\d{4}$/;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
};

const json = (status, body) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...CORS } });

export default {
  async fetch(request, env) {
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
    const pin = body.pin;
    if (!NAME_RE.test(name)) return json(400, { error: 'bad-name' });
    if (typeof pin !== 'string' || !PIN_RE.test(pin)) return json(400, { error: 'bad-pin' });
    if (path === '/save' && (!body.progress || typeof body.progress !== 'object' || !Number.isInteger(body.version))) {
      return json(400, { error: 'bad-save' });
    }

    const now = env.now ? env.now() : Date.now();
    const kv = env.PROGRESS;
    const failsKey = 'fails:' + name;
    const profileKey = 'profile:' + name;

    const fails = (await kv.get(failsKey, 'json')) || { count: 0, lockedUntil: 0 };
    if (fails.lockedUntil > now) {
      return json(423, { error: 'locked', retryAfterSeconds: Math.ceil((fails.lockedUntil - now) / 1000) });
    }

    const profile = await kv.get(profileKey, 'json');
    if (profile) {
      if ((await hashPin(pin, profile.salt)) !== profile.pinHash) {
        const count = (fails.lockedUntil ? 0 : fails.count) + 1;
        const next = count >= MAX_FAILS ? { count: 0, lockedUntil: now + LOCK_MS } : { count, lockedUntil: 0 };
        await kv.put(failsKey, JSON.stringify(next), { expirationTtl: FAILS_TTL_SECONDS });
        return json(401, { error: 'wrong-pin' });
      }
      if (fails.count || fails.lockedUntil) {
        await kv.put(failsKey, JSON.stringify({ count: 0, lockedUntil: 0 }), { expirationTtl: 60 });
      }
    }

    if (path === '/load') {
      return json(200, profile ? { progress: profile.progress, version: profile.version } : { progress: null, version: 0 });
    }

    const current = profile ? profile.version : 0;
    if (body.version !== current) {
      return json(409, { progress: profile ? profile.progress : null, version: current });
    }
    const salt = profile ? profile.salt : randomSalt();
    const pinHash = profile ? profile.pinHash : await hashPin(pin, salt);
    const next = { salt, pinHash, version: current + 1, progress: body.progress, updatedAt: now };
    await kv.put(profileKey, JSON.stringify(next));
    return json(200, { version: next.version });
  },
};

// SHA-256 of salt + PIN. With only 10 000 possible PINs a slow hash would not stop an offline
// attack on leaked data anyway; the lockout protects the live endpoint, and this keeps the
// PIN itself out of storage within the Workers free-plan CPU limit.
async function hashPin(pin, salt) {
  const data = new TextEncoder().encode(salt + ':' + pin);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('');
}

function randomSalt() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return [...bytes].map(b => b.toString(16).padStart(2, '0')).join('');
}
