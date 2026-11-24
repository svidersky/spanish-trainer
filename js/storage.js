// Learner progress: kept in the browser (localStorage), backed up by exporting to a file.
(function (root) {
  'use strict';

  const KEY = 'spanish-trainer:v1';

  function empty() {
    return {
      version: 1,
      completedLessons: [],
      cards: {},
      settings: { sessionMinutes: 15, practiceCards: 20 },
      settingsUpdatedAt: null,
      lastExport: null,
    };
  }

  function normalize(s) {
    const e = empty();
    if (!s || typeof s !== 'object') return e;
    return {
      version: 1,
      completedLessons: Array.isArray(s.completedLessons) ? s.completedLessons.filter(Number.isFinite) : [],
      cards: s.cards && typeof s.cards === 'object' ? s.cards : {},
      settings: Object.assign(e.settings, s.settings && typeof s.settings === 'object' ? s.settings : {}),
      settingsUpdatedAt: Number.isFinite(s.settingsUpdatedAt) ? s.settingsUpdatedAt : null,
      lastExport: Number.isFinite(s.lastExport) ? s.lastExport : null,
    };
  }

  function load() {
    try {
      const raw = root.localStorage.getItem(KEY);
      return raw ? normalize(JSON.parse(raw)) : empty();
    } catch (err) {
      return empty();
    }
  }

  // The state object is never swapped for another one: screens may hold on to it (a review
  // Session does), so replace() rewrites it in place.
  const state = load();
  const listeners = new Set();

  function write() {
    try {
      root.localStorage.setItem(KEY, JSON.stringify(state));
      return true;
    } catch (err) {
      console.warn('Could not save progress', err);
      return false;
    }
  }

  const Store = {
    get() { return state; },
    // Saves a change made on this device and tells listeners (e.g. Sync) about it.
    save() {
      const ok = write();
      listeners.forEach(fn => fn());
      return ok;
    },
    // Replaces all progress. { silent: true } is for data that came from Sync itself.
    replace(data, { silent = false } = {}) {
      const next = normalize(data);
      Object.keys(state).forEach(k => delete state[k]);
      Object.assign(state, next);
      if (silent) return write();
      return Store.save();
    },
    // Changes a setting and notes when, so Sync can tell which device changed settings last.
    // Call save() afterwards, as for any other change.
    setSetting(name, value) {
      state.settings[name] = value;
      state.settingsUpdatedAt = Date.now();
    },
    onSave(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    looksLikeProgress(data) {
      return !!data && typeof data === 'object' && typeof data.cards === 'object' && Array.isArray(data.completedLessons);
    },
    toJson() { return JSON.stringify(state, null, 2); },
  };

  root.Store = Store;
})(window);
