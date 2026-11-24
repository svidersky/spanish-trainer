// Sync of progress between devices through the Sync server, driven from the home screen.
// The app's fetch() goes straight to the real Worker code with an in-memory KV.
const test = require('node:test');
const assert = require('node:assert/strict');
const { boot, lessonOneProgress, START, DAY } = require('./helpers/dom');

let worker;
let fakeKv;
test.before(async () => {
  worker = (await import('../worker/src/index.js')).default;
  ({ fakeKv } = await import('./helpers/kv.mjs'));
});

const NAME = 'leonid';
const PIN = '4831';

function cloud() {
  const env = { PROGRESS: fakeKv(), now: () => Date.now() };
  const calls = [];
  let offline = false;
  return {
    env,
    calls,
    setOffline(v) { offline = v; },
    async fetch(url, init = {}) {
      if (offline) throw new TypeError('Failed to fetch');
      calls.push({ url: String(url), body: init.body ? JSON.parse(init.body) : null });
      return worker.fetch(new Request(url, init), env);
    },
    async stored(name = NAME, pin = PIN) {
      const res = await worker.fetch(new Request('https://sync.test/load', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, pin }),
      }), env);
      return res.json();
    },
  };
}

function device(t, c, opts = {}) {
  const app = boot({ ...opts, sync: { fetch: c.fetch.bind(c), syncConfig: opts.syncConfig } });
  t.after(() => app.close());
  return app;
}

async function connect(app, name = NAME, pin = PIN) {
  app.$('.sync input[name="sync-name"]').value = name;
  app.$('.sync input[name="sync-pin"]').value = pin;
  app.byText('.sync button', 'Подключить').click();
}

const synced = app => app.waitFor(() => /синхронизировано/i.test(app.text('.sync-status')), 3000);

test('sync: the home screen offers name + PIN when not connected', t => {
  const app = device(t, cloud());
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
  for (let i = 0; i < 150 && !cards; i++) {
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
