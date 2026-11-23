// Прогресс ученика: хранится в браузере (localStorage), страхуется экспортом в файл.
(function (root) {
  'use strict';

  const KEY = 'spanish-trainer:v1';

  function empty() {
    return {
      version: 1,
      completedLessons: [],
      cards: {},
      settings: { sessionMinutes: 15 },
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

  let state = load();

  const Store = {
    get() { return state; },
    save() {
      try {
        root.localStorage.setItem(KEY, JSON.stringify(state));
        return true;
      } catch (err) {
        console.warn('Не удалось сохранить прогресс', err);
        return false;
      }
    },
    replace(data) {
      state = normalize(data);
      return Store.save();
    },
    looksLikeProgress(data) {
      return !!data && typeof data === 'object' && typeof data.cards === 'object' && Array.isArray(data.completedLessons);
    },
    toJson() { return JSON.stringify(state, null, 2); },
  };

  root.Store = Store;
})(window);
