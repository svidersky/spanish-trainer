// Interface language: Russian (default) or English, chosen in a dropdown in the header.
// In English no Russian text may be left anywhere the learner can see or hear about it.
const test = require('node:test');
const assert = require('node:assert/strict');
const { boot, lessonOneProgress, START, DAY } = require('./helpers/dom');

function setup(t, opts) {
  const app = boot(opts);
  t.after(() => app.close());
  return app;
}

// Progress with English chosen as the interface language.
function en(progress = {}) {
  return { ...progress, settings: { sessionMinutes: 15, ...(progress.settings || {}), lang: 'en' } };
}

// Lesson 1 Completed, with only the Cards of the given direction (all due).
function onlyDir(dir) {
  const p = lessonOneProgress();
  for (const k of Object.keys(p.cards)) if (!k.endsWith('|' + dir)) delete p.cards[k];
  return p;
}

const CYRILLIC = /[Ѐ-ӿ]/;

// Every piece of Russian the learner could see: page title, text, tooltips, labels, placeholders,
// option names (except the dropdown's own «Русский», which must stay readable to a Russian speaker),
// and messages shown by alert() / confirm().
function russianLeft(app) {
  const doc = app.document;
  const found = [];
  if (CYRILLIC.test(doc.title)) found.push('title: ' + doc.title);
  for (const root of doc.querySelectorAll('header, main')) {
    const walker = doc.createTreeWalker(root, app.window.NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      if (n.parentElement.closest('option')) continue;
      if (CYRILLIC.test(n.nodeValue)) found.push('text: ' + n.nodeValue.trim());
    }
    for (const el of [root, ...root.querySelectorAll('*')]) {
      for (const attr of ['title', 'aria-label', 'placeholder']) {
        const v = el.getAttribute(attr);
        if (v && CYRILLIC.test(v)) found.push(`${attr}: ${v}`);
      }
    }
  }
  for (const m of [...app.alerts, ...app.confirms]) if (CYRILLIC.test(m)) found.push('dialog: ' + m);
  return found;
}

const noRussian = (app, where) => assert.deepEqual(russianLeft(app), [], where);

function choose(app, lang) {
  const select = app.$('header select');
  select.value = lang;
  select.dispatchEvent(new app.window.Event('change'));
}

// ---------- the dropdown ----------

test('language: a dropdown in the header offers 🇷🇺 Русский and 🇬🇧 English; Russian by default', t => {
  const app = setup(t);
  const select = app.$('header select');
  assert.ok(select, 'a <select> in the header');
  assert.deepEqual(
    Array.from(select.options).map(o => [o.value, o.textContent]),
    [['ru', '🇷🇺 Русский'], ['en', '🇬🇧 English']],
    'each language is shown with its flag',
  );
  assert.equal(select.value, 'ru');
  assert.ok(select.getAttribute('aria-label'), 'the dropdown has an accessible name');
  assert.equal(app.document.documentElement.lang, 'ru');
  assert.match(app.text('main h1'), /Учим испанский/);
  assert.equal(app.progress(), null, 'nothing is saved just by opening the app');
});

test('language: the dropdown is on every screen', async t => {
  for (const hash of ['#/lesson/1', '#/review', '#/practice', '#/settings']) {
    const app = setup(t, { hash, progress: lessonOneProgress() });
    assert.ok(app.$('header select'), hash);
  }
});

test('language: the settings gear is labelled in English', t => {
  const fresh = setup(t, { progress: en(lessonOneProgress({ lastExport: START - DAY })) });
  assert.equal(fresh.$('header a[href="#/settings"]').getAttribute('aria-label'), 'Settings');
  assert.equal(fresh.$('header a[href="#/settings"]').title, 'Settings');
  const stale = setup(t, { progress: en(lessonOneProgress()) });
  assert.equal(stale.$('header a[href="#/settings"]').getAttribute('aria-label'), 'Settings: progress not saved to a file');
});

test('language: switching on the settings page keeps it open', async t => {
  const app = setup(t, { hash: '#/settings' });
  choose(app, 'en');
  assert.equal(app.window.location.hash, '#/settings');
  assert.equal(app.text('main h1'), 'Progress and settings');
  assert.equal(app.document.title, 'Progress and settings');
});

test('language: choosing English redraws the screen in English and is a synced setting', t => {
  const app = setup(t, { progress: lessonOneProgress() });
  app.advance(1000);
  choose(app, 'en');
  assert.equal(app.progress().settings.lang, 'en');
  assert.equal(app.progress().settingsUpdatedAt, app.now(), 'Sync must see that settings changed');
  assert.equal(app.progress().settings.sessionMinutes, 15, 'other settings are untouched');
  assert.equal(Object.keys(app.progress().cards).length, 16, 'progress is untouched');
  assert.equal(app.document.documentElement.lang, 'en');
  assert.equal(app.document.title, 'Spanish Trainer');
  assert.equal(app.text('header .brand span'), 'Spanish Trainer');
  assert.equal(app.text('main h1'), 'Learn Spanish');
  noRussian(app, 'home after switching');

  choose(app, 'ru');
  assert.equal(app.progress().settings.lang, 'ru');
  assert.equal(app.document.documentElement.lang, 'ru');
  assert.equal(app.text('header .brand span'), 'Испанский тренажёр');
  assert.match(app.text('main h1'), /Учим испанский/);
});

test('language: switching on a Lesson page keeps the Lesson open', async t => {
  const app = setup(t, { hash: '#/lesson/2' });
  choose(app, 'en');
  await new Promise(r => setTimeout(r, 20));
  assert.equal(app.window.location.hash, '#/lesson/2');
  assert.equal(app.text('main .sub'), 'Where are you from?');
  noRussian(app, 'lesson 2');
});

test('language: English is remembered after reopening the app', t => {
  const app = setup(t, { progress: en(lessonOneProgress()) });
  assert.equal(app.$('header select').value, 'en');
  assert.equal(app.document.documentElement.lang, 'en');
  noRussian(app, 'home');
});

test('language: an unknown language in saved progress falls back to Russian', t => {
  const app = setup(t, { progress: { completedLessons: [], cards: {}, settings: { lang: 'fr' } } });
  assert.equal(app.window.Store.get().settings.lang, 'ru');
  assert.equal(app.$('header select').value, 'ru');
  assert.match(app.text('main h1'), /Учим испанский/);
});

test('language: Russian is the default setting for new and old progress', t => {
  const app = setup(t, { progress: lessonOneProgress() });
  assert.equal(app.window.Store.get().settings.lang, 'ru');
});

test('language: both dictionaries have the same entries', t => {
  const app = setup(t);
  const { ru, en: english } = app.window.I18n.strings;
  assert.deepEqual(Object.keys(english).sort(), Object.keys(ru).sort());
  for (const k of Object.keys(ru)) {
    assert.equal(typeof english[k], typeof ru[k], k);
    if (typeof english[k] === 'string') assert.ok(!CYRILLIC.test(english[k]), `${k}: Russian in English`);
  }
});

// ---------- Lesson content in English ----------

test('language: a Lesson in English shows English translations, notes and a Latin Transcription', t => {
  const app = setup(t, { hash: '#/lesson/1', progress: en() });
  assert.equal(app.text('main .sub'), 'Introductions');
  const first = app.$('.phrase');
  assert.equal(first.querySelector('.es').textContent, '¡Hola! ¿Qué tal?', 'Spanish stays Spanish');
  assert.equal(first.querySelector('.tr').textContent, '(OH-lah! keh tahl?)');
  assert.equal(first.querySelector('.tr').getAttribute('lang'), 'en');
  assert.equal(first.querySelector('.ru').textContent, 'Hi! How are you?');
  assert.equal(first.querySelector('.ru').getAttribute('lang'), 'en');
  assert.equal(app.$$('.notes li').length, 4);
  noRussian(app, 'lesson 1');
});

test('language: the Lesson player buttons in English', t => {
  const app = setup(t, { hash: '#/lesson/1', progress: en() });
  const labels = app.$$('.player button').map(b => b.textContent);
  assert.deepEqual(labels, ['▶ Listen and repeat', '🔁 Listen in a loop']);
  noRussian(app, 'lesson player');
});

test('language: Cards in English: ES → EN Recognition, EN → ES Production', async t => {
  const recog = setup(t, { hash: '#/review', progress: en(lessonOneProgress()) });
  await recog.waitFor(() => recog.$('.card'));
  assert.equal(recog.text('.card .dir'), 'Recognition · ES → EN');
  recog.key(' ');
  assert.match(recog.text('.card .answer-block'), /Hi! How are you\?/);
  assert.equal(recog.text('.card .tr'), '(OH-lah! keh tahl?)');

  const produce = setup(t, { hash: '#/review', progress: en(onlyDir('produce')) });
  await produce.waitFor(() => produce.$('.card'));
  assert.equal(produce.text('.card .dir'), 'Production · EN → ES');
  assert.equal(produce.text('.card .prompt'), 'Hi! How are you?');
});

test('language: interval previews use English plurals', async t => {
  const app = setup(t, { hash: '#/review', progress: en(lessonOneProgress()) });
  await app.waitFor(() => app.$('.card'));
  app.key(' ');
  const previews = app.$$('.grades button small').map(s => s.textContent.replace(/^\d · /, ''));
  assert.deepEqual(previews, ['1 day', '1 day', '3 days', '7 days']);
});

test('language: the export reminder uses English plurals', t => {
  const app = setup(t, { progress: en(lessonOneProgress({ lastExport: START - 8 * DAY })) });
  assert.match(app.text('.warn'), /\b8 days ago\b/);
  assert.match(app.text('main .warn a[href="#/settings"]'), /Save a copy/);
  const settings = setup(t, { hash: '#/settings', progress: en(lessonOneProgress({ lastExport: START - 8 * DAY })) });
  assert.match(settings.text('.warn'), /\b8 days ago\b/);
});

// ---------- no Russian left anywhere ----------

test('language: in English no Russian is left on the home screen or the settings page', t => {
  const allReviewed = lessonOneProgress();
  for (const c of Object.values(allReviewed.cards)) c.due = START + DAY;
  for (const [where, progress, opts] of [
    ['empty deck', en()],
    ['cards due, never exported', en(lessonOneProgress())],
    ['exported 8 days ago', en(lessonOneProgress({ lastExport: START - 8 * DAY }))],
    ['exported yesterday', en(lessonOneProgress({ lastExport: START - DAY }))],
    ['everything reviewed', en(allReviewed)],
    ['no Recordings', en(), { recordings: false }],
    ['no Spain voice', en(), { voices: [{ name: 'Mexicano', lang: 'es-MX' }] }],
    ['no speech synthesis', en(), { speech: false }],
  ]) {
    noRussian(setup(t, { progress, ...opts }), where);
    noRussian(setup(t, { hash: '#/settings', progress, ...opts }), 'settings, ' + where);
  }
});

const UA = {
  iphone: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
  android: 'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36',
  windows: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0',
  mac: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15',
  other: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
};

test('language: in English the missing-voice hints are English on every platform', t => {
  const hints = new Set();
  for (const [name, userAgent, touch] of [
    ['iPhone', UA.iphone, 5], ['Android', UA.android, 5], ['Windows', UA.windows, 0],
    ['Mac', UA.mac, 0], ['other', UA.other, 0],
  ]) {
    const app = setup(t, { hash: '#/settings', progress: en(), voices: [], userAgent, maxTouchPoints: touch });
    noRussian(app, name);
    hints.add(app.text('main .warn'));
  }
  assert.equal(hints.size, 5, 'each platform gets its own hint');
  const lesson = setup(t, { hash: '#/lesson/1', progress: en(), voices: [], recordings: false });
  assert.ok(lesson.$('main .warn'), 'the Lesson page warns too');
  noRussian(lesson, 'lesson without any voice');
});

test('language: in English no Russian is left on Lesson pages', async t => {
  const app = setup(t, { hash: '#/lesson/1', progress: en() });
  app.byText('main button', 'Listen and repeat').click();
  await app.waitFor(() => app.text('.player .status'));
  noRussian(app, 'while playing');
  await app.waitFor(() => /Repeat/i.test(app.text('.player .status')));
  noRussian(app, 'pause to repeat');
  app.byText('main button', 'Stop').click();
  app.byText('main button', 'Mark').click();
  assert.deepEqual(app.progress().completedLessons, [1]);
  noRussian(app, 'completed');
  for (const n of [5, 10]) {
    noRussian(setup(t, { hash: '#/lesson/' + n, progress: en() }), 'lesson ' + n);
  }
});

test('language: in English no Russian is left in a Session', async t => {
  const nothing = lessonOneProgress();
  for (const c of Object.values(nothing.cards)) c.due = START + 2 * DAY;
  noRussian(setup(t, { hash: '#/review', progress: en(nothing) }), 'nothing due');

  // Recognition: the card, the revealed answer with grades, "don't know", time up, the summary.
  const app = setup(t, { hash: '#/review', progress: en(lessonOneProgress()) });
  await app.waitFor(() => app.$('.card'));
  noRussian(app, 'Recognition card');
  app.key(' ');
  noRussian(app, 'answer and grades');
  app.advance(400);
  app.key('3');
  app.$('.card .dont-know').click();
  noRussian(app, '"don\'t know"');
  app.advance(400);
  app.key('Enter');
  app.advance(16 * 60 * 1000);
  await app.waitFor(() => app.$('.timer.over'), 2500);
  noRussian(app, 'time up');
  app.key(' ');
  app.advance(400);
  app.key('3');
  await app.waitFor(() => app.$('main h1') && !app.$('.card'));
  noRussian(app, 'summary with Cards left');

  // Production: a wrong answer with its diff, an exact one, an empty one.
  const prod = setup(t, { hash: '#/review', progress: en(onlyDir('produce')) });
  await prod.waitFor(() => prod.$('.card'));
  noRussian(prod, 'Production card');
  const check = typed => {
    prod.$('.card input.answer').value = typed;
    prod.$('.card .controls button.primary').click();
  };
  check('hola que');
  assert.ok(prod.$('.diff'));
  noRussian(prod, 'different');
  prod.advance(400);
  prod.key('3');
  check('Muy bien gracias y tu');
  noRussian(prod, 'almost');
  prod.advance(400);
  prod.key('3');
  check('');
  noRussian(prod, 'empty');

  // Long intervals (months, years) in the grade previews; the summary when all is reviewed.
  const old = lessonOneProgress();
  for (const k of Object.keys(old.cards)) if (k !== 'l01-01|recog') delete old.cards[k];
  Object.assign(old.cards['l01-01|recog'], { reps: 5, interval: 300 });
  const last = setup(t, { hash: '#/review', progress: en(old) });
  await last.waitFor(() => last.$('.card'));
  last.key(' ');
  assert.match(last.text('.grades'), /yr|mo/);
  noRussian(last, 'long intervals');
  last.advance(400);
  last.key('3');
  noRussian(last, 'summary, all reviewed');
});

test('language: in English no Russian is left in a Practice', async t => {
  const learned = lessonOneProgress();
  for (const c of Object.values(learned.cards)) Object.assign(c, { interval: 30, due: START + 30 * DAY });
  noRussian(setup(t, { hash: '#/practice', progress: en(learned) }), 'nothing to practise');

  const one = lessonOneProgress();
  for (const k of Object.keys(one.cards)) if (k !== 'l01-01|recog') delete one.cards[k];
  const app = setup(t, { hash: '#/practice', progress: en(one) });
  await app.waitFor(() => app.$('.card'));
  noRussian(app, 'Practice card');
  app.key(' ');
  noRussian(app, 'grades that leave the schedule');
  app.advance(400);
  app.key('3');
  noRussian(app, 'Practice summary');
});

test('language: in English file import messages are English', async t => {
  const app = setup(t, { hash: '#/settings', progress: en() });
  const input = app.$('input[type=file]');
  await app.upload(input, '{"foo": 1}');
  await app.waitFor(() => app.alerts.length === 1);
  await app.upload(input, JSON.stringify(en(lessonOneProgress())));
  await app.waitFor(() => app.confirms.length === 1);
  noRussian(app, 'import dialogs');
});
