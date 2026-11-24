// In-memory stand-in for a Workers KV namespace: the subset of the API the Sync server uses
// (get with "json", put with options), per https://developers.cloudflare.com/kv/api/.
export function fakeKv() {
  const store = new Map();
  return {
    async get(key, type) {
      if (!store.has(key)) return null;
      const value = store.get(key);
      const kind = typeof type === 'object' && type ? type.type : type;
      return kind === 'json' ? JSON.parse(value) : value;
    },
    async put(key, value, options = {}) {
      if (typeof value !== 'string') throw new TypeError('fake KV stores strings only');
      if (options.expirationTtl !== undefined && options.expirationTtl < 60) {
        throw new RangeError('expirationTtl must be at least 60');
      }
      store.set(key, value);
    },
    raw: () => store,
  };
}
