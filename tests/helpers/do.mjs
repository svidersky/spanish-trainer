// In-memory stand-in for the PROFILES Durable Object namespace.
// Each name gets its own object with its own storage, like getByName() in Workers
// (https://developers.cloudflare.com/durable-objects/api/namespace/). Storage calls yield to the
// event loop, so concurrent requests really interleave unless the object serializes them;
// blockConcurrencyWhile() is a per-object queue, as documented for ctx.blockConcurrencyWhile.
import { ProfileLogic } from '../../worker/src/profile.js';

const tick = () => new Promise(resolve => setTimeout(resolve, 0));

function fakeCtx() {
  const map = new Map();
  let queue = Promise.resolve();
  return {
    storage: {
      async get(key) {
        await tick();
        return map.has(key) ? structuredClone(map.get(key)) : undefined;
      },
      async put(key, value) {
        await tick();
        map.set(key, structuredClone(value));
      },
      map,
    },
    blockConcurrencyWhile(fn) {
      const run = queue.then(fn);
      queue = run.catch(() => {});
      return run;
    },
  };
}

export function fakeProfiles(now = () => Date.now()) {
  const objects = new Map();
  const instance = name => {
    if (!objects.has(name)) {
      const ctx = fakeCtx();
      objects.set(name, { ctx, logic: new ProfileLogic(ctx, now) });
    }
    return objects.get(name);
  };
  return {
    getByName(name) {
      return { fetch: request => instance(name).logic.fetch(request) };
    },
    // Every value stored by every Profile object, for inspection in tests.
    storedValues: () => [...objects.values()].flatMap(o => [...o.ctx.storage.map.values()]),
  };
}
