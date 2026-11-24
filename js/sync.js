// Sync of progress between devices through the Sync server (worker/), under a Profile:
// a name and a 4-digit PIN, remembered on the device after the first successful sync.
// Each sync loads the server copy, merges it into this device's progress (js/merge.js),
// and saves the result with the version it was based on; a 409 means another device saved
// in between, so it merges again and retries.
(function (root) {
  'use strict';

  const CONFIG_KEY = 'spanish-trainer:sync';
  // The deployed Worker. Tests and local experiments can override it with window.SYNC_URL.
  const DEFAULT_URL = 'https://spanish-progress.spanish-trainer.workers.dev';
  const NAME_RE = /^[\p{L}\p{N}_-]{2,32}$/u;
  const PIN_RE = /^\d{4}$/;
  const MAX_RETRIES = 5;
  // Browsers refuse keepalive requests over 64 KiB (Fetch standard, HTTP-network-or-cache fetch).
  // Sync requests run one at a time, so this request's body is all that is in flight.
  const KEEPALIVE_MAX_BYTES = 64 * 1024;
  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

  const url = () => String(root.SYNC_URL || DEFAULT_URL).replace(/\/$/, '');
  // With a placeholder address (e.g. a copy of the app without its own Worker yet), Sync stays
  // switched off and the app works as before.
  if (/REPLACE_WITH_SUBDOMAIN/.test(url())) return;
  const debounceMs = () => (Number.isFinite(root.SYNC_DEBOUNCE_MS) ? root.SYNC_DEBOUNCE_MS : 2000);

  // status.state: off | idle | syncing | ok | wrong-pin | locked | offline | invalid | error
  let config = readConfig();
  let status = { state: config ? 'idle' : 'off' };
  const statusListeners = new Set();
  const dataListeners = new Set();
  let running = null;
  let syncAgainAfterRun = false; // a change arrived while a sync was running
  let timer = null;

  function readConfig() {
    try {
      const c = JSON.parse(root.localStorage.getItem(CONFIG_KEY));
      return c && typeof c.name === 'string' && typeof c.pin === 'string' ? c : null;
    } catch {
      return null;
    }
  }

  function writeConfig(c) {
    try {
      if (c) root.localStorage.setItem(CONFIG_KEY, JSON.stringify(c));
      else root.localStorage.removeItem(CONFIG_KEY);
    } catch { /* private mode: the Profile is just not remembered */ }
  }

  function setStatus(next) {
    status = next;
    statusListeners.forEach(fn => fn(status));
  }

  async function post(path, body) {
    const text = JSON.stringify(body);
    const res = await root.fetch(url() + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: text,
      // keepalive lets a save finish after the page is closed, but only small bodies may use it.
      keepalive: new TextEncoder().encode(text).length <= KEEPALIVE_MAX_BYTES,
    });
    let data;
    try { data = await res.json(); } catch { data = null; }
    return { status: res.status, data: data || {} };
  }

  // Turns a non-200 answer into a status; returns false when the sync must stop.
  function failed(res, profile) {
    if (res.status === 401) {
      // A remembered PIN that the server rejects (e.g. typed while offline) is forgotten at once:
      // sending it again with every change would lock the name for its owner.
      if (profile === config) forget();
      setStatus({ state: 'wrong-pin' });
    } else if (res.status === 423) {
      setStatus({ state: 'locked', minutes: Math.max(1, Math.ceil((res.data.retryAfterSeconds || 60) / 60)) });
    } else setStatus({ state: 'error', code: res.status });
    return false;
  }

  function apply(remote) {
    const before = JSON.stringify(Store.get());
    Store.replace(Merge.merge(Store.get(), remote), { silent: true });
    if (JSON.stringify(Store.get()) !== before) dataListeners.forEach(fn => fn());
  }

  async function run(profile) {
    setStatus({ state: 'syncing' });
    try {
      const loaded = await post('/load', profile);
      if (loaded.status !== 200) return failed(loaded, profile);
      let { progress: remote, version } = loaded.data;
      for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        apply(remote);
        const saved = await post('/save', { ...profile, version, progress: Store.get() });
        if (saved.status === 200) {
          setStatus({ state: 'ok', at: Date.now() });
          return true;
        }
        if (saved.status !== 409) return failed(saved, profile);
        ({ progress: remote, version } = saved.data);
        // Another device saved in between. Wait a random moment so two devices saving at the
        // same time do not keep beating each other in lockstep.
        await sleep(50 + Math.random() * 250);
      }
      setStatus({ state: 'error', code: 409 });
      // Still conflicting: try again a little later instead of leaving the change unsent.
      setTimeout(syncNow, 1000 + Math.random() * 2000);
      return false;
    } catch {
      setStatus({ state: 'offline' });
      return false;
    }
  }

  function syncNow() {
    if (!config) return Promise.resolve(false);
    if (running) {
      syncAgainAfterRun = true;
      return running;
    }
    running = run(config).finally(() => {
      running = null;
      if (syncAgainAfterRun) {
        syncAgainAfterRun = false;
        syncNow();
      }
    });
    return running;
  }

  function schedule() {
    if (!config) return;
    clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      syncNow();
    }, debounceMs());
  }

  async function connect(name, pin) {
    const profile = { name: String(name || '').trim().toLowerCase(), pin: String(pin || '').trim() };
    if (!NAME_RE.test(profile.name)) {
      setStatus({ state: 'invalid', field: 'name' });
      return false;
    }
    if (!PIN_RE.test(profile.pin)) {
      setStatus({ state: 'invalid', field: 'pin' });
      return false;
    }
    const ok = await run(profile);
    // Remember the Profile when it worked, or when only the network failed (it retries later).
    if (ok || status.state === 'offline') {
      config = profile;
      writeConfig(config);
      statusListeners.forEach(fn => fn(status)); // now "connected": screens show the Profile
    }
    return ok;
  }

  // Stops syncing on this device and forgets the Profile; the server copy stays.
  function forget() {
    clearTimeout(timer);
    timer = null;
    config = null;
    writeConfig(null);
  }

  function disconnect() {
    forget();
    setStatus({ state: 'off' });
  }

  Store.onSave(schedule);

  // A pending change is sent right away when the page is hidden (tab switch, phone locked).
  root.document.addEventListener('visibilitychange', () => {
    if (root.document.visibilityState === 'hidden' && timer) {
      clearTimeout(timer);
      timer = null;
      syncNow();
    }
  });

  // After being offline, catch up as soon as the connection is back.
  root.addEventListener('online', () => syncNow());

  // Pull the other devices' answers when the app opens.
  if (config) setTimeout(syncNow, 0);

  root.Sync = {
    connect,
    disconnect,
    syncNow,
    profile: () => (config ? { name: config.name } : null),
    status: () => status,
    onStatus(fn) { statusListeners.add(fn); return () => statusListeners.delete(fn); },
    onData(fn) { dataListeners.add(fn); return () => dataListeners.delete(fn); },
  };
})(window);
