// Boots the trainer in jsdom: the same scripts index.html loads, plus stubs for what
// jsdom lacks (speech synthesis, alert/confirm, scrolling, blob URLs).
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM, VirtualConsole } = require('jsdom');

const ROOT = path.join(__dirname, '..', '..');
const KEY = 'spanish-trainer:v1';
const SYNC_KEY = 'spanish-trainer:sync';
const SYNC_SCRIPTS = ['js/merge.js', 'js/sync.js'];
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
// The same scripts, in the same order, as index.html loads.
const SCRIPTS = Array.from(read('index.html').matchAll(/<script src="([^"]+)"><\/script>/g), m => m[1]);
const START = new Date(2026, 10, 23, 18, 30).getTime();
const DAY = 24 * 60 * 60 * 1000;
const sleep = ms => new Promise(r => setTimeout(r, ms));

// Mutation testing (StrykerJS, stryker.config.mjs): mutated code looks up Stryker's state
// (which mutant is active, which code ran) on its own global object and in process.env.
// The window has neither, so give it Node's state object. A no-op outside Stryker.
function shareMutationState(w) {
  const name = process.env.STRYKER_NAMESPACE || '__stryker__';
  const active = process.env.__STRYKER_ACTIVE_MUTANT__;
  if (!globalThis[name] && !active) return;
  const state = (globalThis[name] ??= {});
  if (state.activeMutant === undefined && active) state.activeMutant = active;
  w[name] = state;
}

function boot({
  hash = '#/',
  progress,
  rawProgress,
  voices = [{ name: 'Test Voice', lang: 'es-ES' }],
  speech = true,
  userAgent,
  maxTouchPoints = 0,
  recordings = true,
  audioFails = false,
  // { fetch, syncConfig, url, debounceMs } — loads the Sync scripts and routes the app's fetch()
  // to a test server. url: null sets no override, so the app uses its own default address (DEFAULT_URL in js/sync.js).
  sync,
} = {}) {
  const errors = [];
  const virtualConsole = new VirtualConsole();
  // jsdom cannot navigate to the blob URL used by export; that is not an app error.
  virtualConsole.on('jsdomError', e => {
    if (e.type === 'not-implemented' && /navigation/i.test(e.message)) return;
    errors.push(`${e.type}: ${e.message}`);
  });
  virtualConsole.on('error', (...args) => errors.push(args.join(' ')));

  const html = read('index.html').replace(/<script\b[^>]*><\/script>/g, '');
  const dom = new JSDOM(html, {
    url: 'http://localhost/' + hash,
    runScripts: 'outside-only',
    pretendToBeVisual: true,
    virtualConsole,
  });
  const w = dom.window;

  if (userAgent) Object.defineProperty(w.navigator, 'userAgent', { get: () => userAgent, configurable: true });
  Object.defineProperty(w.navigator, 'maxTouchPoints', { get: () => maxTouchPoints, configurable: true });

  // Controllable clock: the app reads time only through Date.now().
  let now = START;
  w.Date.now = () => now;

  if (rawProgress !== undefined) w.localStorage.setItem(KEY, rawProgress);
  else if (progress) w.localStorage.setItem(KEY, JSON.stringify(progress));

  const spoken = [];
  if (speech) {
    w.speechSynthesis = {
      getVoices: () => voices,
      speak(u) {
        spoken.push({ text: u.text, rate: u.rate, voice: u.voice });
        w.setTimeout(() => u.onend && u.onend(), 0);
      },
      cancel() {},
      addEventListener() {},
    };
    w.SpeechSynthesisUtterance = function (text) { this.text = text; };
  }

  // jsdom does not play media: record what would play, then end (or fail) asynchronously.
  const played = [];
  w.HTMLMediaElement.prototype.play = function () {
    if (audioFails) return Promise.reject(new w.DOMException('blocked', 'NotAllowedError'));
    played.push({ src: this.src, rate: this.playbackRate });
    w.setTimeout(() => this.onended && this.onended(), 0);
    return Promise.resolve();
  };
  w.HTMLMediaElement.prototype.pause = function () {};

  const alerts = [];
  const confirms = [];
  let confirmAnswer = true;
  w.alert = m => alerts.push(String(m));
  w.confirm = m => { confirms.push(String(m)); return confirmAnswer; };
  w.scrollTo = () => {};
  w.Element.prototype.scrollIntoView = function () {};
  w.URL.createObjectURL = () => 'blob:test';
  w.URL.revokeObjectURL = () => {};

  if (sync) {
    w.fetch = sync.fetch;
    if (sync.url !== null) w.SYNC_URL = sync.url || 'https://sync.test';
    w.SYNC_DEBOUNCE_MS = Number.isFinite(sync.debounceMs) ? sync.debounceMs : 0;
    if (sync.syncConfig) w.localStorage.setItem(SYNC_KEY, JSON.stringify(sync.syncConfig));
  }

  shareMutationState(w);
  for (const f of SCRIPTS) {
    if (f === 'data/audio.js' && !recordings) continue;
    if (SYNC_SCRIPTS.includes(f) && !sync) continue;
    w.eval(read(f));
  }

  const $ = s => w.document.querySelector(s);
  const $$ = s => Array.from(w.document.querySelectorAll(s));

  const app = {
    window: w,
    document: w.document,
    spoken,
    played,
    alerts,
    confirms,
    errors,
    $,
    $$,
    text: s => ($(s) ? $(s).textContent : ''),
    byText(selector, text) {
      const el = $$(selector).find(e => e.textContent.includes(text));
      if (!el) throw new Error(`No ${selector} with text "${text}"`);
      return el;
    },
    now: () => now,
    advance(ms) { now += ms; },
    setConfirm(v) { confirmAnswer = v; },
    progress: () => JSON.parse(w.localStorage.getItem(KEY) || 'null'),
    syncConfig: () => JSON.parse(w.localStorage.getItem(SYNC_KEY) || 'null'),
    // Press a key; returns the event, so a test can see whether the app kept it from the browser.
    key(k) {
      const e = new w.KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true });
      w.document.dispatchEvent(e);
      return e;
    },
    async go(h) {
      w.location.hash = h;
      await sleep(20);
    },
    async waitFor(fn, timeout = 1500) {
      const until = Date.now() + timeout;
      for (;;) {
        const v = fn();
        if (v) return v;
        if (Date.now() > until) throw new Error('Timed out waiting for: ' + fn.toString());
        await sleep(10);
      }
    },
    // Grade the current Card. The 400 ms step gets past the app's double-press guard.
    grade(label) {
      now += 400;
      app.byText('.grades button', label).click();
    },
    // Answer the current Card in either direction (up to showing the grade buttons).
    answer(typed = '') {
      const input = $('.card input.answer');
      if (input) {
        input.value = typed;
        app.byText('.card button', 'Проверить').click();
      } else {
        app.key(' ');
      }
    },
    async upload(input, content) {
      const file = new w.File([content], 'progress.json', { type: 'application/json' });
      Object.defineProperty(input, 'files', { value: [file], configurable: true });
      input.dispatchEvent(new w.Event('change'));
    },
    close() { w.close(); },
  };
  return app;
}

// Progress in which Lesson 1 is Completed and all its Cards are due.
function lessonOneProgress(overrides = {}) {
  const ctx = { window: {} };
  require('node:vm').runInNewContext(read('data/lessons.js'), ctx);
  const cards = {};
  for (const p of ctx.window.LESSONS[0].phrases) {
    for (const dir of ['recog', 'produce']) {
      cards[p.id + '|' + dir] = { ef: 2.5, reps: 0, interval: 0, lapses: 0, due: START, last: null };
    }
  }
  return { version: 1, completedLessons: [1], cards, settings: { sessionMinutes: 15 }, lastExport: null, ...overrides };
}

module.exports = { boot, lessonOneProgress, read, shareMutationState, START, DAY, KEY, SYNC_KEY };
