// Merges this device's progress with the copy from the Sync server.
// Per Card the more recent answer wins; Completed Lessons are united; settings come from
// whichever side changed them last. Works in the browser (window.Merge) and in Node (tests).
(function (root) {
  'use strict';

  const answeredAt = card => (card && Number.isFinite(card.last) ? card.last : -Infinity);
  const timeOrOldest = t => (Number.isFinite(t) ? t : -Infinity);

  function merge(local, remote) {
    if (!remote || typeof remote !== 'object') return local;

    const cards = { ...(remote.cards || {}) };
    for (const [key, card] of Object.entries(local.cards || {})) {
      const other = cards[key];
      if (!other || answeredAt(card) >= answeredAt(other)) cards[key] = card;
    }

    const lessons = new Set([...(local.completedLessons || []), ...(remote.completedLessons || [])]);
    const completedLessons = [...lessons].filter(Number.isFinite).sort((a, b) => a - b);

    const remoteSettingsNewer = timeOrOldest(remote.settingsUpdatedAt) > timeOrOldest(local.settingsUpdatedAt);
    const settingsSide = remoteSettingsNewer ? remote : local;

    const exports = [local.lastExport, remote.lastExport].filter(Number.isFinite);

    return {
      ...local,
      completedLessons,
      cards,
      settings: { ...(settingsSide.settings || {}) },
      settingsUpdatedAt: Number.isFinite(settingsSide.settingsUpdatedAt) ? settingsSide.settingsUpdatedAt : null,
      lastExport: exports.length ? Math.max(...exports) : null,
    };
  }

  const Merge = { merge };
  if (typeof module !== 'undefined' && module.exports) module.exports = Merge;
  else root.Merge = Merge;
})(typeof window !== 'undefined' ? window : globalThis);
