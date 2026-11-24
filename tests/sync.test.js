// Sync of progress between devices through the Sync server, driven from the settings page.
// The app's fetch() goes straight to the real Worker code with in-memory Durable Objects.
const test = require('node:test');
const assert = require('node:assert/strict');
const { boot, lessonOneProgress, START, DAY } = require('./helpers/dom');

let worker;
let fakeProfiles;
test.before(async () => {
  worker = (await import('../worker/src/router.js')).default;
  ({ fakeProfiles } = await import('./helpers/do.mjs'));
});

const NAME = 'leonid';
const PIN = '4831';
// Browsers refuse a keepalive request whose body (with other keepalive requests in flight)
// is over 64 KiB, and fetch() rejects with a TypeError (https://fetch.spec.whatwg.org/,
// HTTP-network-or-cache fetch: "greater than 64 kibibytes" is a network error).
const KEEPALIVE_LIMIT = 64 * 1024;
const sleep = ms => new Promise(r => setTimeout(r, ms));

function cloud() {
  const env = { PROFILES: fakeProfiles() };
  const calls = [];
  let offline = false;
  const post = (path, body) => worker.fetch(new Request('https://sync.test' + path, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  }), env);
  return {
    env,
    calls,
    // Runs before each /save from an app reaches the server (e.g. another device saving first).
    beforeSave: null,
    setOffline(v) { offline = v; },
    async fetch(url, init = {}) {
      if (offline) throw new TypeError('Failed to fetch');
      if (init.keepalive && new TextEncoder().encode(init.body || '').length > KEEPALIVE_LIMIT) {
        throw new TypeError('Failed to fetch');
      }
      calls.push({ url: String(url), body: init.body ? JSON.parse(init.body) : null, keepalive: !!init.keepalive });
      if (String(url).endsWith('/save') && this.beforeSave) await this.beforeSave();
      return worker.fetch(new Request(url, init), env);
    },
    async stored(name = NAME, pin = PIN) {
      return (await post('/load', { name, pin })).json();
    },
    // Another device saves a change to the server copy, straight to the server.
    async rivalSave(change) {
      const { progress, version } = await this.stored();
      change(progress);
      return post('/save', { name: NAME, pin: PIN, version, progress });
    },
  };
}

function device(t, c, opts = {}) {
  const app = boot({
    ...opts,
    sync: { fetch: c.fetch.bind(c), syncConfig: opts.syncConfig, url: opts.url, debounceMs: opts.debounceMs },
  });
  t.after(() => app.close());
  return app;
}

// Changes a setting on the settings page (which must be open), which saves progress like any other change.
function setMinutes(app, minutes) {
  const input = app.$('input[aria-label="Длительность сессии в минутах"]');
  input.value = String(minutes);
  input.dispatchEvent(new app.window.Event('change'));
}

async function eventually(fn, timeout, message) {
  const until = Date.now() + timeout;
  for (;;) {
    const v = await fn();
    if (v) return v;
    if (Date.now() > until) assert.fail(message);
    await sleep(20);
  }
}

// Progress bigger than a keepalive request may carry: Lesson 1 plus many answered Cards.
function bigProgress() {
  const p = lessonOneProgress();
  for (let i = 0; i < 1500; i++) {
    p.cards[`extra-${i}|recog`] = { ef: 2.5, reps: 3, interval: 10, lapses: 0, due: START + 9 * DAY, last: START - DAY };
  }
  return p;
}

// The Sync panel is on the settings page.
async function openSettings(app) {
  if (app.window.location.hash !== '#/settings') await app.go('#/settings');
}

async function connect(app, name = NAME, pin = PIN) {
  await openSettings(app);
  app.$('.sync input[name="sync-name"]').value = name;
  app.$('.sync input[name="sync-pin"]').value = pin;
  app.byText('.sync button', 'Подключить').click();
}

const synced = app => app.waitFor(() => /синхронизировано/i.test(app.text('.sync-status')), 3000);

test('sync: the settings page offers name + PIN when not connected', t => {
  const app = device(t, cloud(), { hash: '#/settings' });
  assert.ok(app.$('.sync input[name="sync-name"]'));
  const pin = app.$('.sync input[name="sync-pin"]');
  assert.equal(pin.getAttribute('inputmode'), 'numeric');
  assert.equal(pin.getAttribute('maxlength'), '4');
  assert.deepEqual(app.errors, []);
});

test('sync: connecting uploads this device\'s progress', async t => {
  const c = cloud();
  const app = device(t, c, { progress: lessonOneProgress() });
  await connect(app);
  await synced(app);
  const stored = await c.stored();
  assert.deepEqual(stored.progress.completedLessons, [1]);
  assert.equal(Object.keys(stored.progress.cards).length, 16);
  assert.deepEqual(app.syncConfig(), { name: NAME, pin: PIN }, 'remembered on this device');
});

test('sync: a second device gets the progress after connecting', async t => {
  const c = cloud();
  const a = device(t, c, { progress: lessonOneProgress() });
  await connect(a);
  await synced(a);

  const b = device(t, c);
  assert.equal(b.$$('.lessons li.done').length, 0);
  await connect(b);
  await synced(b);
  await b.go('#/');
  await b.waitFor(() => b.$('.lessons li.done'));
  assert.equal(b.$$('.stat b')[2].textContent, '16');
  assert.equal(Object.keys(b.progress().cards).length, 16, 'saved locally too');
});

test('sync: a remembered Profile syncs automatically when the app opens', async t => {
  const c = cloud();
  const a = device(t, c, { progress: lessonOneProgress() });
  await connect(a);
  await synced(a);

  const b = device(t, c, { syncConfig: { name: NAME, pin: PIN } });
  await b.waitFor(() => b.$('.lessons li.done'));
});

test('sync: an open settings page shows the settings that arrive from another device', async t => {
  const c = cloud();
  const a = device(t, c, { progress: lessonOneProgress() });
  await connect(a);
  await synced(a);
  a.advance(1000);
  setMinutes(a, 40);
  await eventually(async () => (await c.stored()).progress.settings.sessionMinutes === 40, 3000, '40 minutes never reached the server');

  const b = device(t, c, { hash: '#/settings', syncConfig: { name: NAME, pin: PIN } });
  await b.waitFor(() => b.$('input[aria-label="Длительность сессии в минутах"]').value === '40', 3000);
  assert.equal(b.window.location.hash, '#/settings');
});

test('sync: a wrong PIN shows a message and leaves local progress alone', async t => {
  const c = cloud();
  const a = device(t, c, { progress: lessonOneProgress() });
  await connect(a);
  await synced(a);

  const b = device(t, c);
  await connect(b, NAME, '0000');
  await b.waitFor(() => /неверный PIN/i.test(b.text('.sync-status')));
  assert.equal(b.progress(), null, 'nothing was downloaded');
  assert.equal(b.syncConfig(), null, 'a wrong PIN is not remembered');
  assert.ok(b.$('.sync input[name="sync-pin"]'), 'the form is still there');
});

test('sync: a locked name shows how long to wait', async t => {
  const c = cloud();
  const a = device(t, c, { progress: lessonOneProgress() });
  await connect(a);
  await synced(a);
  for (let i = 0; i < 5; i++) await c.stored(NAME, '0000');

  const b = device(t, c);
  await connect(b);
  await b.waitFor(() => /попыток/i.test(b.text('.sync-status')));
  assert.match(b.text('.sync-status'), /мин/);
});

test('sync: the name and PIN are checked before anything is sent', async t => {
  const c = cloud();
  const app = device(t, c);
  await connect(app, NAME, '12a4');
  assert.match(app.text('.sync-status'), /4 цифры/);
  await connect(app, 'x', PIN);
  assert.match(app.text('.sync-status'), /имя/i);
  assert.equal(c.calls.length, 0);
});

test('sync: answering a Card pushes progress to the server automatically', async t => {
  const c = cloud();
  const a = device(t, c, { progress: lessonOneProgress() });
  await connect(a);
  await synced(a);

  const b = device(t, c, { hash: '#/review', progress: lessonOneProgress(), syncConfig: { name: NAME, pin: PIN } });
  await b.waitFor(() => b.$('.card'));
  b.key(' ');
  b.grade('Нормально');
  await b.waitFor(() => c.calls.some(x => x.url.endsWith('/save') && x.body.progress.cards['l01-01|recog'].reps === 1), 3000);
});

test('sync: several Cards graded in one Session with sync on are all kept', async t => {
  const c = cloud();
  const app = device(t, c, { hash: '#/review', progress: lessonOneProgress(), syncConfig: { name: NAME, pin: PIN } });
  await app.waitFor(() => app.$('.card'));
  for (let i = 0; i < 3; i++) {
    app.key(' ');
    app.grade('Нормально');
    await new Promise(r => setTimeout(r, 30)); // let a background sync land between answers
  }
  const local = app.progress().cards;
  for (const id of ['l01-01', 'l01-02', 'l01-03']) assert.equal(local[id + '|recog'].reps, 1, id + ' locally');
  await app.waitFor(() => {
    const last = [...c.calls].reverse().find(x => x.url.endsWith('/save'));
    return last && ['l01-01', 'l01-02', 'l01-03'].every(id => last.body.progress.cards[id + '|recog'].reps === 1);
  }, 3000);
});

test('sync: answers from two devices are merged, not overwritten', async t => {
  const c = cloud();
  // Device A starts with the first card; on device B that card is not due, so B starts with the second.
  const onB = lessonOneProgress();
  onB.cards['l01-01|recog'].due = START + 2 * DAY;
  const a = device(t, c, { hash: '#/review', progress: lessonOneProgress(), syncConfig: { name: NAME, pin: PIN } });
  const b = device(t, c, { hash: '#/review', progress: onB, syncConfig: { name: NAME, pin: PIN } });
  await a.waitFor(() => a.text('.card .prompt') === '¡Hola! ¿Qué tal?');
  await b.waitFor(() => b.text('.card .prompt') === 'Muy bien, gracias. ¿Y tú?');

  a.key(' ');
  a.grade('Легко');
  b.key(' ');
  b.grade('Нормально');

  const merged = async () => {
    const s = await c.stored();
    const cards = s.progress && s.progress.cards;
    return cards && cards['l01-01|recog'].reps === 1 && cards['l01-02|recog'].reps === 1 ? cards : null;
  };
  let cards = null;
  // Up to ~8 s: two devices saving at once may need a few randomized retries.
  for (let i = 0; i < 400 && !cards; i++) {
    cards = await merged();
    if (!cards) await new Promise(r => setTimeout(r, 20));
  }
  assert.ok(cards, 'both answers reached the server');
  assert.ok(cards['l01-01|recog'].ef > 2.5, 'A\'s "Легко" kept');
  assert.equal(cards['l01-02|recog'].ef, 2.5, 'B\'s "Нормально" kept (ease unchanged)');
});

test('sync: no connection shows a message and the app keeps working', async t => {
  const c = cloud();
  c.setOffline(true);
  const app = device(t, c, { progress: lessonOneProgress() });
  await connect(app);
  await app.waitFor(() => /нет связи/i.test(app.text('.sync-status')));
  await app.go('#/');
  assert.equal(app.$$('.lessons li').length, 10);
  assert.deepEqual(app.errors, []);
});

test('sync: "Отключить" forgets the name and PIN on this device only', async t => {
  const c = cloud();
  const app = device(t, c, { progress: lessonOneProgress() });
  await connect(app);
  await synced(app);
  app.byText('.sync button', 'Отключить').click();
  assert.equal(app.syncConfig(), null);
  assert.ok(app.$('.sync input[name="sync-name"]'));
  assert.ok((await c.stored()).progress, 'the server copy stays');
  assert.equal(Object.keys(app.progress().cards).length, 16, 'local progress stays');
});

test('sync: a wrong PIN typed offline is forgotten once the server rejects it, so it cannot lock the name', async t => {
  const c = cloud();
  const owner = device(t, c, { progress: lessonOneProgress() });
  await connect(owner);
  await synced(owner);

  c.setOffline(true);
  const app = device(t, c, { progress: lessonOneProgress() });
  await connect(app, NAME, '0000');
  await app.waitFor(() => /нет связи/i.test(app.text('.sync-status')));

  c.setOffline(false);
  app.window.dispatchEvent(new app.window.Event('online'));
  await app.waitFor(() => /неверный PIN/i.test(app.text('.sync-status')));
  assert.equal(app.syncConfig(), null, 'the rejected PIN is no longer remembered');
  assert.equal(app.$('.sync-form').hidden, false, 'the form asks for the name and PIN again');

  // More answers and reconnects must not keep sending the wrong PIN.
  for (let i = 0; i < 6; i++) {
    setMinutes(app, 20 + i);
    app.window.dispatchEvent(new app.window.Event('online'));
    await sleep(30);
  }
  const wrongTries = c.calls.filter(x => x.body && x.body.pin === '0000').length;
  assert.equal(wrongTries, 1, 'the wrong PIN reached the server only once');
  const forOwner = await c.stored();
  assert.notEqual(forOwner.error, 'locked', 'the name is not locked for its owner');
  assert.deepEqual(forOwner.progress.completedLessons, [1]);
});

test('sync: progress larger than a keepalive request allows (64 KiB) still syncs', async t => {
  const c = cloud();
  const progress = bigProgress();
  const size = new TextEncoder().encode(JSON.stringify(progress)).length;
  assert.ok(size > KEEPALIVE_LIMIT && size < 512 * 1024, `test setup: ${size} bytes is over 64 KiB and under 512 KB`);
  const app = device(t, c, { progress });
  await connect(app);
  await synced(app);
  const stored = await c.stored();
  assert.equal(Object.keys(stored.progress.cards).length, Object.keys(progress.cards).length, 'every Card reached the server');
  assert.deepEqual(app.errors, []);
});

test('sync: a pending change is sent at once, as a keepalive request, when the page is hidden', async t => {
  const c = cloud();
  const app = device(t, c, { hash: '#/settings', progress: lessonOneProgress(), syncConfig: { name: NAME, pin: PIN }, debounceMs: 60000 });
  await synced(app); // the sync when the app opens
  const saves = () => c.calls.filter(x => x.url.endsWith('/save'));
  const before = saves().length;

  setMinutes(app, 25);
  await sleep(50);
  assert.equal(saves().length, before, 'the change waits for the debounce');

  Object.defineProperty(app.document, 'visibilityState', { value: 'hidden', configurable: true });
  app.document.dispatchEvent(new app.window.Event('visibilitychange'));
  await app.waitFor(() => saves().length > before);
  const last = saves().at(-1);
  assert.equal(last.body.progress.settings.sessionMinutes, 25);
  assert.equal(last.keepalive, true, 'a small save survives the page being closed');
});

test('sync: changes made offline are sent when the connection comes back', async t => {
  const c = cloud();
  const owner = device(t, c, { progress: lessonOneProgress() });
  await connect(owner);
  await synced(owner);

  c.setOffline(true);
  const app = device(t, c, { hash: '#/settings', progress: lessonOneProgress(), syncConfig: { name: NAME, pin: PIN } });
  await app.waitFor(() => /нет связи/i.test(app.text('.sync-status')));
  setMinutes(app, 30);
  await sleep(50);

  c.setOffline(false);
  app.window.dispatchEvent(new app.window.Event('online'));
  await eventually(async () => (await c.stored()).progress.settings.sessionMinutes === 30, 3000,
    'the offline change reached the server');
});

// Device B has answered the first Card; another device keeps saving just before B does.
async function conflictingDevice(t, rivalSaves) {
  const c = cloud();
  const owner = device(t, c, { progress: lessonOneProgress() });
  await connect(owner);
  await synced(owner);

  let left = rivalSaves;
  c.beforeSave = async () => {
    if (left-- > 0) await c.rivalSave(p => { p.completedLessons = [1, 2]; });
  };
  const onB = lessonOneProgress();
  onB.cards['l01-01|recog'] = { ef: 2.6, reps: 1, interval: 1, lapses: 0, due: START + DAY, last: START };
  device(t, c, { progress: onB, syncConfig: { name: NAME, pin: PIN } });
  return c;
}

const bothKept = async c => {
  const { progress } = await c.stored();
  return progress.completedLessons.includes(2) && progress.cards['l01-01|recog'].reps === 1;
};

test('sync: when another device saves in between (409), the copies are merged and saved again', async t => {
  const c = await conflictingDevice(t, 1);
  await eventually(() => bothKept(c), 3000, 'both the other device\'s change and this answer are on the server');
});

test('sync: a save still conflicting after every quick retry is tried again later, not dropped', async t => {
  const c = await conflictingDevice(t, 5); // as many conflicts as quick retries
  await eventually(() => bothKept(c), 8000, 'this answer reached the server after the quick retries ran out');
});

test('sync: stays off while the Worker address is still the placeholder', async t => {
  const c = cloud();
  const url = 'https://spanish-progress.REPLACE_WITH_SUBDOMAIN.workers.dev';
  const app = device(t, c, { hash: '#/settings', progress: lessonOneProgress(), syncConfig: { name: NAME, pin: PIN }, url });
  await sleep(50);
  assert.equal(app.$('.sync'), null, 'no Sync panel on the settings page');
  assert.ok(app.$('main input[type=file]'), 'the file backup is still there');
  await app.go('#/');
  assert.equal(c.calls.length, 0, 'nothing is sent');
  assert.equal(app.$$('.lessons li').length, 10, 'the app works as before');
  assert.deepEqual(app.errors, []);
});

test('sync: without an override the app syncs with the deployed Worker', async t => {
  const c = cloud();
  const app = device(t, c, { hash: '#/settings', progress: lessonOneProgress(), syncConfig: { name: NAME, pin: PIN }, url: null });
  await synced(app);
  assert.ok(app.$('.sync'), 'the Sync panel is on the settings page');
  assert.equal(c.calls[0].url, 'https://spanish-progress.spanish-trainer.workers.dev/load');
});

// ---------- interface language ----------

const CYRILLIC = /[Ѐ-ӿ]/;

function chooseLanguage(app, lang) {
  const select = app.$('header select');
  select.value = lang;
  select.dispatchEvent(new app.window.Event('change'));
}

async function connectEn(app, name = NAME, pin = PIN) {
  await openSettings(app);
  app.$('.sync input[name="sync-name"]').value = name;
  app.$('.sync input[name="sync-pin"]').value = pin;
  app.$('.sync button.primary').click();
}

function russianIn(app, selector) {
  const el = app.$(selector);
  const bits = [el.textContent];
  for (const e of [el, ...el.querySelectorAll('*')]) {
    for (const a of ['title', 'aria-label', 'placeholder']) if (e.getAttribute(a)) bits.push(e.getAttribute(a));
  }
  return bits.filter(s => CYRILLIC.test(s));
}

test('sync: in English the Sync panel and its messages are English', async t => {
  const c = cloud();
  const settings = { sessionMinutes: 15, lang: 'en' };
  const a = device(t, c, { hash: '#/settings', progress: lessonOneProgress({ settings }) });
  assert.deepEqual(russianIn(a, '.sync'), [], 'the form');
  await connectEn(a, 'x', PIN);
  await a.waitFor(() => a.text('.sync-status'));
  assert.deepEqual(russianIn(a, '.sync'), [], 'name check');
  await connectEn(a, NAME, '12');
  await a.waitFor(() => /PIN/.test(a.text('.sync-status')));
  assert.deepEqual(russianIn(a, '.sync'), [], 'PIN check');
  await connectEn(a);
  await a.waitFor(() => /synced/i.test(a.text('.sync-status')), 3000);
  assert.deepEqual(russianIn(a, '.sync'), [], 'connected');

  const b = device(t, c, { progress: { completedLessons: [], cards: {}, settings } });
  await connectEn(b, NAME, '0000');
  await b.waitFor(() => /PIN/.test(b.text('.sync-status')) && !b.$('.sync-status').textContent.includes('…'), 3000);
  assert.deepEqual(russianIn(b, '.sync'), [], 'wrong PIN');

  c.setOffline(true);
  const off = device(t, c, { progress: { completedLessons: [], cards: {}, settings } });
  await connectEn(off);
  await off.waitFor(() => off.text('.sync-status') && !/…/.test(off.text('.sync-status')));
  assert.deepEqual(russianIn(off, '.sync'), [], 'offline');
});

test('sync: the language chosen on one device reaches the other', async t => {
  const c = cloud();
  const a = device(t, c, { progress: lessonOneProgress() });
  await connect(a);
  await synced(a);
  a.advance(1000);
  chooseLanguage(a, 'en');
  await eventually(async () => (await c.stored()).progress.settings.lang === 'en', 3000, 'English never reached the server');

  const b = device(t, c, { syncConfig: { name: NAME, pin: PIN } });
  await b.waitFor(() => b.$('header select').value === 'en', 3000);
  await b.waitFor(() => b.text('main h1') === 'Learn Spanish');
  assert.equal(b.document.documentElement.lang, 'en');
});

// ---------- the file backup reminder with a Profile ----------
// With a Profile the progress is kept on the Sync server, so the reminder to save a file copy
// (on the home screen, on the settings page and as the gear's mark) is not shown.

const BACKUP_REMINDER = /сохранялся|сохранение в файл/;
const gearMarked = app => app.$('header a[href="#/settings"]').classList.contains('attention');

test('sync: with a remembered Profile there is no file backup reminder, wherever the app opens', async t => {
  for (const [where, progress] of [
    ['never exported', lessonOneProgress()],
    ['exported 8 days ago', lessonOneProgress({ lastExport: START - 8 * DAY })],
  ]) {
    for (const hash of ['#/', '#/settings']) {
      const app = device(t, cloud(), { hash, progress, syncConfig: { name: NAME, pin: PIN } });
      const label = `${where}, ${hash}`;
      assert.doesNotMatch(app.text('main'), BACKUP_REMINDER, `${label}: no reminder as the app opens`);
      assert.equal(gearMarked(app), false, `${label}: the gear is not marked as the app opens`);
      await synced(app);
      assert.doesNotMatch(app.text('main'), BACKUP_REMINDER, `${label}: no reminder after the sync`);
      assert.equal(gearMarked(app), false, `${label}: the gear is not marked after the sync`);
      assert.equal(app.$('header a[href="#/settings"]').getAttribute('aria-label'), 'Настройки', label);
    }
  }
});

test('sync: a Profile remembered while offline also hides the file backup reminder', async t => {
  const c = cloud();
  c.setOffline(true);
  const app = device(t, c, { progress: lessonOneProgress(), syncConfig: { name: NAME, pin: PIN } });
  await sleep(50); // the sync attempt on opening has failed by now
  assert.doesNotMatch(app.text('main'), BACKUP_REMINDER);
  assert.equal(gearMarked(app), false);
});

test('sync: connecting hides the file backup reminder at once, disconnecting brings it back', async t => {
  const app = device(t, cloud(), { hash: '#/settings', progress: lessonOneProgress() });
  assert.match(app.text('main'), /ни разу не сохранялся/, 'without a Profile the settings page warns');
  assert.ok(gearMarked(app), 'without a Profile the gear is marked');

  await connect(app);
  await synced(app);
  assert.doesNotMatch(app.text('main'), BACKUP_REMINDER, 'the settings page stops warning right after connecting');
  assert.equal(gearMarked(app), false, 'the gear mark is cleared right after connecting');
  assert.match(app.text('main'), /дополнительная копия/);

  app.byText('.sync button', 'Отключить').click();
  await app.waitFor(() => /ни разу не сохранялся/.test(app.text('main')));
  assert.ok(gearMarked(app), 'the gear is marked again after disconnecting');
  assert.ok(app.$('.sync input[name="sync-name"]'), 'the Sync form is back');

  await app.go('#/');
  assert.match(app.text('main .warn'), /ни разу не сохранялся/, 'the home screen warns again');
});
