// One Profile's data, kept by its own Durable Object (one object per name).
// Every request runs inside ctx.blockConcurrencyWhile(), so requests to the same Profile are
// handled strictly one after another: the version check and the write can never interleave
// with another save. (Storage awaits alone are not enough: hashing the PIN also awaits.)
// Plain module without Cloudflare imports, so Node tests can run it with a fake ctx.

const MAX_FAILS = 5;
const LOCK_MS = 60 * 60 * 1000;

export class ProfileLogic {
  constructor(ctx, now = () => Date.now()) {
    this.ctx = ctx;
    this.now = now;
  }

  // Request body (validated by the router): { op: 'load' | 'save', pin, version?, progress? }
  async fetch(request) {
    const body = await request.json();
    const result = await this.ctx.blockConcurrencyWhile(() => this.handle(body));
    return new Response(JSON.stringify(result.body), {
      status: result.status,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  async handle({ op, pin, version, progress }) {
    const storage = this.ctx.storage;
    const now = this.now();

    const fails = (await storage.get('fails')) || { count: 0, lockedUntil: 0 };
    if (fails.lockedUntil > now) {
      return { status: 423, body: { error: 'locked', retryAfterSeconds: Math.ceil((fails.lockedUntil - now) / 1000) } };
    }

    const profile = await storage.get('profile');
    if (profile) {
      if ((await hashPin(pin, profile.salt)) !== profile.pinHash) {
        const count = (fails.lockedUntil ? 0 : fails.count) + 1;
        await storage.put('fails', count >= MAX_FAILS ? { count: 0, lockedUntil: now + LOCK_MS } : { count, lockedUntil: 0 });
        return { status: 401, body: { error: 'wrong-pin' } };
      }
      if (fails.count || fails.lockedUntil) await storage.put('fails', { count: 0, lockedUntil: 0 });
    }

    if (op === 'load') {
      return { status: 200, body: profile ? { progress: profile.progress, version: profile.version } : { progress: null, version: 0 } };
    }

    const current = profile ? profile.version : 0;
    if (version !== current) {
      return { status: 409, body: { progress: profile ? profile.progress : null, version: current } };
    }
    const salt = profile ? profile.salt : randomHex(16);
    const pinHash = profile ? profile.pinHash : await hashPin(pin, salt);
    await storage.put('profile', { salt, pinHash, version: current + 1, progress, updatedAt: now });
    return { status: 200, body: { version: current + 1 } };
  }
}

// SHA-256 of salt + PIN. With only 10 000 possible PINs a slow hash would not stop an offline
// attack on leaked data anyway; the lockout protects the live endpoint, and this keeps the PIN
// itself out of storage within the Workers free-plan CPU limit.
async function hashPin(pin, salt) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(salt + ':' + pin));
  return toHex(new Uint8Array(digest));
}

function randomHex(bytes) {
  return toHex(crypto.getRandomValues(new Uint8Array(bytes)));
}

function toHex(bytes) {
  return [...bytes].map(b => b.toString(16).padStart(2, '0')).join('');
}
