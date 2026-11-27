// Trainer screens in jsdom: home, settings, Lesson, Session, progress, speech.
// Regexes match learner-facing UI text, which is Russian.
const test = require('node:test');
const assert = require('node:assert/strict');
const { boot, lessonOneProgress, START, DAY } = require('./helpers/dom');

function setup(t, opts) {
  const app = boot(opts);
  t.after(() => app.close());
  return app;
}

async function reviewing(t, opts = {}) {
  const app = setup(t, { hash: '#/review', progress: lessonOneProgress(), ...opts });
  await app.waitFor(() => app.$('.card'));
  return app;
}

const clone = x => JSON.parse(JSON.stringify(x));

// ---------- home ----------

test('home: 10 lessons, empty deck, no session button', t => {
  const app = setup(t);
  assert.equal(app.$$('.lessons li').length, 10);
  assert.match(app.text('.panel'), /Колода пока пуста/);
  assert.equal(app.$('a[href="#/review"]'), null);
  assert.deepEqual(app.errors, []);
});

test('home: stats and session button once a lesson is completed', t => {
  const app = setup(t, { progress: lessonOneProgress() });
  const [due, learned, total] = app.$$('.stat b').map(b => b.textContent);
  assert.deepEqual([due, learned, total], ['16', '0', '16']);
  assert.match(app.text('a[href="#/review"]'), /15 мин/);
  assert.ok(app.$('.lessons li.done'));
});

test('home: cards of removed phrases are ignored and break nothing', t => {
  const app = setup(t, {
    progress: { completedLessons: [1], cards: { 'zz-99|recog': { ef: 2.5, reps: 0, interval: 0, lapses: 0, due: START } } },
  });
  assert.equal(app.$$('.stat b')[2].textContent, '0');
  assert.deepEqual(app.errors, []);
});

test('settings: session length is clamped to 1–120 minutes', t => {
  const app = setup(t, { hash: '#/settings' });
  const set = value => {
    const input = app.$('input[type=number]');
    input.value = value;
    input.dispatchEvent(new app.window.Event('change'));
    return app.progress().settings.sessionMinutes;
  };
  assert.equal(set('0'), 1);
  assert.equal(set('500'), 120);
  assert.equal(set('25'), 25);
  assert.equal(set('abc'), 15);
});

test('settings: Practice size is clamped to 1–200 Cards and is a synced setting', t => {
  const app = setup(t, { hash: '#/settings' });
  const field = () => app.$('input[aria-label="Число карточек в тренировке"]');
  assert.equal(field().value, '20', 'default is 20 Cards');
  const set = value => {
    field().value = value;
    field().dispatchEvent(new app.window.Event('change'));
    return app.progress().settings.practiceCards;
  };
  app.advance(1000);
  assert.equal(set('0'), 1);
  assert.equal(set('999'), 200);
  assert.equal(set('abc'), 20);
  assert.equal(set('7'), 7);
  assert.equal(app.progress().settingsUpdatedAt, app.now(), 'Sync must see that settings changed');
  assert.equal(app.progress().settings.sessionMinutes, 15, 'the Session length is untouched');
});

// ---------- settings page ----------

const gear = app => app.$('header a[href="#/settings"]');

test('settings: a gear link in the header opens the settings page from every screen', async t => {
  for (const hash of ['#/', '#/settings', '#/lesson/1', '#/review', '#/practice']) {
    const app = setup(t, { hash, progress: lessonOneProgress({ lastExport: START - DAY }) });
    const link = gear(app);
    assert.ok(link, hash);
    assert.equal(link.getAttribute('aria-label'), 'Настройки', hash);
    assert.equal(link.title, 'Настройки', hash);
  }
  const app = setup(t, { progress: lessonOneProgress() });
  gear(app).click();
  await app.waitFor(() => app.$('main input[type=number]'));
  assert.equal(app.window.location.hash, '#/settings');
});

test('settings: the page holds the backup, the settings and the voice; a link leads home', t => {
  const app = setup(t, { hash: '#/settings', progress: lessonOneProgress({ lastExport: START - DAY }) });
  assert.equal(app.text('main h1'), 'Прогресс и настройки');
  assert.equal(app.document.title, 'Прогресс и настройки');
  assert.ok(app.byText('main button', 'Сохранить прогресс в файл'));
  assert.ok(app.byText('main button', 'Загрузить из файла'));
  assert.ok(app.$('main input[type=file]'));
  assert.ok(app.$('main input[aria-label="Длительность сессии в минутах"]'));
  assert.ok(app.$('main input[aria-label="Число карточек в тренировке"]'));
  assert.match(app.text('main'), /Последнее сохранение: /);
  assert.match(app.text('main'), /Голос: Test Voice/);
  assert.ok(app.$('main a[href="#/"]'), 'a way back home');
  assert.equal(app.$('main .lessons'), null, 'no Lesson list here');
  assert.deepEqual(app.errors, []);
});

test('settings: none of it is left on the home screen', t => {
  const app = setup(t, { progress: lessonOneProgress({ lastExport: START - DAY }) });
  assert.ok(app.$('.lessons'));
  assert.equal(app.$('main input'), null, 'no settings fields, no file input');
  assert.equal(app.$('main button'), null, 'no export or import buttons');
  assert.doesNotMatch(app.text('main'), /Прогресс и настройки|Последнее сохранение|Голос:/);
});

test('settings: a changed setting keeps the page open and reaches the home screen', async t => {
  const app = setup(t, { hash: '#/settings', progress: lessonOneProgress() });
  const input = app.$('input[aria-label="Длительность сессии в минутах"]');
  input.value = '25';
  input.dispatchEvent(new app.window.Event('change'));
  assert.equal(app.window.location.hash, '#/settings');
  assert.equal(app.$('input[aria-label="Длительность сессии в минутах"]').value, '25');
  await app.go('#/');
  assert.match(app.text('a[href="#/review"]'), /25 мин/);
});

// ---------- export reminder on the home screen ----------

const reminderLink = app => app.$('main .warn a[href="#/settings"]');

test('reminder: never exported — the home screen warns, links to the settings page, the gear is marked', t => {
  const app = setup(t, { progress: lessonOneProgress() });
  assert.match(app.text('main .warn'), /ни разу не сохранялся/);
  assert.ok(reminderLink(app), 'the reminder leads to the settings page');
  assert.match(reminderLink(app).textContent, /Сохранить копию/);
  assert.ok(gear(app).classList.contains('attention'));
  assert.equal(gear(app).getAttribute('aria-label'), 'Настройки: прогресс не сохранён в файл');
});

test('reminder: a week after the last export the home screen says how long ago', t => {
  const app = setup(t, { progress: lessonOneProgress({ lastExport: START - 8 * DAY }) });
  assert.match(app.text('main .warn'), /8 дней назад/);
  assert.ok(reminderLink(app));
  assert.ok(gear(app).classList.contains('attention'));
});

test('reminder: none for an empty Deck or a recent export', t => {
  for (const [where, progress] of [
    ['empty deck', undefined],
    ['exported yesterday', lessonOneProgress({ lastExport: START - DAY })],
    ['exported 6 days ago', lessonOneProgress({ lastExport: START - 6 * DAY })],
  ]) {
    const app = setup(t, { progress });
    assert.equal(reminderLink(app), null, where);
    assert.doesNotMatch(app.text('main'), /сохранялся|сохранение в файл/, where);
    assert.equal(gear(app).classList.contains('attention'), false, where);
    assert.equal(gear(app).getAttribute('aria-label'), 'Настройки', where);
  }
});

test('reminder: the gear mark is on every screen and goes away after an export', async t => {
  const app = setup(t, { hash: '#/lesson/1', progress: lessonOneProgress() });
  assert.ok(gear(app).classList.contains('attention'), 'on a Lesson page too');
  await app.go('#/settings');
  app.byText('button', 'Сохранить прогресс в файл').click();
  assert.equal(gear(app).classList.contains('attention'), false, 'cleared right after the export');
  await app.go('#/');
  assert.equal(reminderLink(app), null);
  assert.equal(gear(app).classList.contains('attention'), false);
});

// ---------- Lesson ----------

test('lesson: Spanish text and stressed Transcription in parentheses', t => {
  const app = setup(t, { hash: '#/lesson/1' });
  const first = app.$('.phrase');
  assert.equal(first.querySelector('.es').textContent, '¡Hola! ¿Qué tal?');
  assert.equal(first.querySelector('.tr').textContent, '(о́ла! кэ таль?)');
  assert.equal(first.querySelector('.ru').textContent, 'Привет! Как дела?');
  assert.ok(!app.text('.dialog').includes("'"), 'stress apostrophes must become stress marks');
  assert.equal(app.$$('.phrase').length, 8);
  assert.ok(app.$$('.notes li').length > 0);
});

test('no screen renders "null", "undefined" or "[object …]"', async t => {
  for (const hash of ['#/', '#/settings', '#/lesson/1', '#/review', '#/practice']) {
    const app = setup(t, { hash, progress: lessonOneProgress() });
    assert.doesNotMatch(app.text('main'), /\bnull\b|\bundefined\b|\[object /, hash);
  }
  for (const hash of ['#/', '#/settings']) {
    const empty = setup(t, { hash });
    assert.doesNotMatch(empty.text('main'), /\bnull\b|\bundefined\b|\[object /, 'empty deck, ' + hash);
    const saved = setup(t, { hash, progress: lessonOneProgress({ lastExport: START - DAY }) });
    assert.doesNotMatch(saved.text('main'), /\bnull\b|\bundefined\b|\[object /, 'recent export, ' + hash);
  }
  const noVoice = setup(t, { hash: '#/lesson/1', voices: [] });
  assert.doesNotMatch(noVoice.text('main'), /\bnull\b|\bundefined\b|\[object /);
});

test('lesson: ▶ and 🐢 play the Recording at normal and slow speed', t => {
  const app = setup(t, { hash: '#/lesson/1' });
  const first = app.$('.phrase');
  first.querySelector('button[title="Слушать"]').click();
  assert.match(app.played.at(-1).src, /\/audio\/l01-01\.mp3$/);
  assert.equal(app.played.at(-1).rate, 1);
  first.querySelector('button[title="Медленно"]').click();
  assert.ok(app.played.at(-1).rate < 1);
  assert.equal(app.spoken.length, 0, 'the browser voice is not used when a Recording exists');
});

test('lesson: each speaker plays their own Recording', t => {
  const app = setup(t, { hash: '#/lesson/1' });
  const [first, second] = app.$$('.phrase');
  first.querySelector('button[title="Слушать"]').click();
  second.querySelector('button[title="Слушать"]').click();
  assert.match(app.played[0].src, /l01-01\.mp3$/);
  assert.match(app.played[1].src, /l01-02\.mp3$/);
  assert.equal(app.window.AUDIO['l01-01'].speaker, 'm');
  assert.equal(app.window.AUDIO['l01-02'].speaker, 'f');
});

test('speech: without Recordings ▶ and 🐢 use the browser voice', t => {
  const app = setup(t, { hash: '#/lesson/1', recordings: false });
  const first = app.$('.phrase');
  first.querySelector('button[title="Слушать"]').click();
  assert.equal(app.spoken.at(-1).text, '¡Hola! ¿Qué tal?');
  const normal = app.spoken.at(-1).rate;
  first.querySelector('button[title="Медленно"]').click();
  assert.ok(app.spoken.at(-1).rate < normal);
  assert.equal(app.spoken.at(-1).voice.lang, 'es-ES');
  assert.equal(app.played.length, 0);
});

test('speech: a stale Recording (text changed) is not played', t => {
  const app = setup(t, { hash: '#/lesson/1' });
  app.window.AUDIO['l01-01'].text = 'old text';
  app.$('.phrase button[title="Слушать"]').click();
  assert.equal(app.played.length, 0);
  assert.equal(app.spoken.at(-1).text, '¡Hola! ¿Qué tal?');
});

test('speech: if a Recording cannot play, the browser voice takes over', async t => {
  const app = setup(t, { hash: '#/lesson/1', audioFails: true });
  app.$('.phrase button[title="Слушать"]').click();
  await app.waitFor(() => app.spoken.length === 1);
  assert.equal(app.spoken[0].text, '¡Hola! ¿Qué tal?');
});

test('lesson: "listen and repeat" plays phrases in order and can be stopped', async t => {
  const app = setup(t, { hash: '#/lesson/1' });
  const play = app.byText('.player button', 'Слушать и повторять');
  play.click();
  assert.match(app.played.at(-1).src, /l01-01\.mp3$/);
  assert.ok(app.$('.phrase.playing'));
  await app.waitFor(() => /Повторите вслух/.test(app.text('.status')));
  play.click(); // now it is the stop button
  assert.equal(app.$('.phrase.playing'), null);
  assert.match(play.textContent, /Слушать и повторять/);
});

// Records the order of Recordings played and of the app's waits (setTimeout with a delay),
// with what the player shows during each wait, and runs every wait at once so a 5-second
// pause does not slow the test down. Every Recording takes `speakMs` on performance.now().
function playbackLog(app, { speakMs = 2000 } = {}) {
  const w = app.window;
  const log = [];
  let clock = 0;
  w.performance.now = () => clock;
  const realTimeout = w.setTimeout.bind(w);
  w.setTimeout = (fn, ms, ...args) => {
    if (ms > 0) log.push({ wait: ms, status: app.text('.status'), highlighted: app.$$('.phrase.playing').length });
    return realTimeout(fn, 0, ...args);
  };
  const realPlay = w.HTMLMediaElement.prototype.play;
  w.HTMLMediaElement.prototype.play = function () {
    log.push({ play: this.src.match(/([^/]+)\.mp3$/)[1] });
    clock += speakMs;
    return realPlay.call(this);
  };
  return log;
}

test('lesson: "listen and repeat" pauses 1.3× the phrase length to repeat aloud, then ends', async t => {
  const app = setup(t, { hash: '#/lesson/1' });
  const ids = app.window.LESSONS[0].phrases.map(p => p.id);
  const log = playbackLog(app, { speakMs: 2000 });
  const play = app.byText('.player button', 'Слушать и повторять');
  play.click();
  await app.waitFor(() => /Слушать и повторять/.test(play.textContent));
  await new Promise(r => setTimeout(r, 50));

  assert.deepEqual(log.filter(e => e.play).map(e => e.play), [...ids], 'each phrase once, no second round');
  const waits = log.filter(e => e.wait);
  assert.equal(waits.length, ids.length, 'one pause after each phrase, none after the dialogue');
  for (const w of waits) {
    assert.equal(Math.round(w.wait), 2600);
    assert.match(w.status, /Повторите вслух/);
  }
  assert.equal(app.$('.phrase.playing'), null);
  assert.equal(app.text('.status'), '');
  assert.match(app.byText('.player button', 'по кругу').textContent, /Слушать по кругу/);
});

test('lesson: "listen and repeat" pauses at least 1.8 s after a short phrase', async t => {
  const app = setup(t, { hash: '#/lesson/1' });
  const log = playbackLog(app, { speakMs: 500 });
  app.byText('.player button', 'Слушать и повторять').click();
  await app.waitFor(() => log.some(e => e.wait));
  assert.equal(log.find(e => e.wait).wait, 1800);
});

const LOOP_LABEL = 'Слушать по кругу';

test('lesson: "loop" plays the whole dialogue with short gaps, pauses 5 s, then starts again', async t => {
  const app = setup(t, { hash: '#/lesson/1' });
  const ids = app.window.LESSONS[0].phrases.map(p => p.id);
  const log = playbackLog(app);
  app.byText('.player button', LOOP_LABEL).click();
  await app.waitFor(() => log.filter(e => e.play).length > ids.length);

  const plays = log.map((e, i) => (e.play ? i : -1)).filter(i => i >= 0);
  assert.deepEqual(plays.slice(0, ids.length + 1).map(i => log[i].play), [...ids, ids[0]],
    'every phrase in order, then the dialogue starts over');
  for (let k = 0; k < ids.length - 1; k++) {
    const waits = log.slice(plays[k] + 1, plays[k + 1]).map(e => e.wait);
    assert.equal(waits.length, 1, `one gap after phrase ${k + 1}`);
    assert.ok(waits[0] > 0 && waits[0] < 1800, `phrase ${k + 1}: a short gap, no pause to repeat aloud (got ${waits[0]} ms)`);
  }
  const pause = log.slice(plays[ids.length - 1] + 1, plays[ids.length]);
  assert.deepEqual(pause.map(e => e.wait), [5000], '5 seconds between the end of the dialogue and the next round');
  assert.equal(pause[0].highlighted, 0, 'no phrase is highlighted during the pause');
  assert.match(pause[0].status, /Пауза/);
});

test('lesson: stopping the loop during the 5 s pause stops it for good', async t => {
  const app = setup(t, { hash: '#/lesson/1' });
  const w = app.window;
  const ids = w.LESSONS[0].phrases.map(p => p.id);
  const log = playbackLog(app);
  const loop = app.byText('.player button', LOOP_LABEL);
  // Hold the 5 s pause until the test has pressed stop.
  let release;
  const fastTimeout = w.setTimeout;
  w.setTimeout = (fn, ms, ...args) => {
    if (ms === 5000) { log.push({ wait: ms }); release = () => fn(...args); return 0; }
    return fastTimeout(fn, ms, ...args);
  };
  loop.click();
  await app.waitFor(() => release);
  loop.click();
  release();
  await new Promise(r => setTimeout(r, 50));
  assert.equal(log.filter(e => e.play).length, ids.length, 'no second round');
  assert.equal(app.text('.status'), '');
  assert.match(loop.textContent, new RegExp(LOOP_LABEL));
});

test('lesson: "loop" turns into a stop button and stopping ends the loop', async t => {
  const app = setup(t, { hash: '#/lesson/1' });
  const log = playbackLog(app);
  const loop = app.byText('.player button', LOOP_LABEL);
  loop.click();
  assert.ok(app.$('.phrase.playing'), 'the current phrase is highlighted');
  await app.waitFor(() => log.filter(e => e.play).length >= 2);
  assert.match(loop.textContent, /Остановить/);
  loop.click();
  const played = log.filter(e => e.play).length;
  await new Promise(r => setTimeout(r, 100));
  assert.equal(log.filter(e => e.play).length, played, 'nothing plays after stop');
  assert.equal(app.$('.phrase.playing'), null);
  assert.match(loop.textContent, new RegExp(LOOP_LABEL));
  assert.equal(app.text('.status'), '');
});

test('lesson: starting "listen and repeat" stops the loop, and the other way round', async t => {
  const app = setup(t, { hash: '#/lesson/1' });
  const loop = app.byText('.player button', LOOP_LABEL);
  const repeat = app.byText('.player button', 'Слушать и повторять');

  loop.click();
  repeat.click();
  assert.match(loop.textContent, new RegExp(LOOP_LABEL), 'loop is no longer running');
  assert.match(repeat.textContent, /Остановить/);
  await app.waitFor(() => /Повторите вслух/.test(app.text('.status')));

  loop.click();
  assert.match(repeat.textContent, /Слушать и повторять/, 'listen and repeat is no longer running');
  assert.match(loop.textContent, /Остановить/);
  assert.equal(app.$$('.phrase.playing').length, 1, 'one phrase highlighted at a time');
});

test('lesson: leaving the lesson stops the loop', async t => {
  const app = setup(t, { hash: '#/lesson/1' });
  const log = playbackLog(app);
  app.byText('.player button', LOOP_LABEL).click();
  await app.waitFor(() => log.filter(e => e.play).length >= 2);
  await app.go('#/');
  const played = log.filter(e => e.play).length;
  await new Promise(r => setTimeout(r, 100));
  assert.equal(log.filter(e => e.play).length, played);
});

test('lesson: marking it completed adds two cards per phrase', t => {
  const app = setup(t, { hash: '#/lesson/1' });
  app.byText('button', 'Отметить урок пройденным').click();
  const p = app.progress();
  assert.deepEqual(p.completedLessons, [1]);
  const keys = Object.keys(p.cards);
  assert.equal(keys.length, 16);
  assert.ok(keys.includes('l01-01|recog'));
  assert.ok(keys.includes('l01-01|produce'));
  assert.ok(Object.values(p.cards).every(c => c.due === START));
  assert.match(app.text('.done-msg'), /Урок пройден/);
});

test('lesson: completing again keeps existing card progress', async t => {
  const progress = lessonOneProgress();
  progress.cards['l01-01|recog'] = { ef: 2.6, reps: 3, interval: 15, lapses: 0, due: START + 15 * DAY, last: START };
  progress.completedLessons = [];
  const app = setup(t, { hash: '#/lesson/1', progress });
  app.byText('button', 'Отметить урок пройденным').click();
  assert.equal(app.progress().cards['l01-01|recog'].interval, 15);
});

test('lesson: an unknown lesson number redirects home', async t => {
  const app = setup(t, { hash: '#/lesson/99' });
  await app.waitFor(() => app.$('.lessons'));
});

// ---------- Session ----------

test('session: nothing due', t => {
  const progress = lessonOneProgress();
  for (const c of Object.values(progress.cards)) c.due = START + 2 * DAY;
  const app = setup(t, { hash: '#/review', progress });
  assert.match(app.text('main'), /Сейчас повторять нечего/);
});

test('session: Recognition first; answer and Transcription hidden until revealed', async t => {
  const app = await reviewing(t);
  assert.match(app.text('.card .dir'), /Узнавание/);
  assert.equal(app.text('.card .prompt'), '¡Hola! ¿Qué tal?');
  assert.equal(app.$('.card .tr'), null);
  assert.equal(app.$('.card .grades'), null);
  assert.match(app.played.at(-1).src, /l01-01\.mp3$/, 'the phrase is played when shown');
  app.key(' ');
  assert.ok(app.$('.card .tr'));
  assert.ok(app.$('.card .grades'));
  assert.match(app.text('.card .answer-block'), /Привет! Как дела\?/);
});

test('session: "Не знаю" on Recognition shows the answer and grades "again" at once', async t => {
  const app = await reviewing(t);
  app.byText('.card button', 'Не знаю').click();
  assert.ok(app.$('.card .answer-block'), 'the answer is shown');
  assert.ok(app.$('.card .tr'), 'with its Transcription');
  assert.equal(app.$('.card .grades'), null, 'no grade buttons: the grade is already given');
  const c = app.progress().cards['l01-01|recog'];
  assert.equal(c.lapses, 1);
  assert.equal(c.reps, 0);
  assert.match(app.text('.session-bar'), /повторено 1/);
  app.byText('.card button', 'Дальше').click();
  assert.equal(app.text('.card .prompt'), 'Muy bien, gracias. ¿Y tú?');
  // 14 untouched cards + the current one + the requeued one
  assert.match(app.text('.session-bar'), /осталось 16/, 'the card went back into the queue');
});

test('session: "Не знаю" on Production shows the answer without a diff', async t => {
  const app = await reviewing(t);
  for (let i = 0; i < 8; i++) {
    app.key(' ');
    app.grade('Легко');
  }
  app.byText('.card button', 'Не знаю').click();
  assert.ok(app.$('.card input.answer').disabled);
  assert.equal(app.$('.diff'), null);
  assert.match(app.text('.card .answer-block'), /¡Hola! ¿Qué tal\?/);
  assert.equal(app.progress().cards['l01-01|produce'].lapses, 1);
  assert.ok(app.byText('.card button', 'Дальше'));
});

test('session: after "Не знаю", Enter moves on only after the bounce guard', async t => {
  const app = await reviewing(t);
  app.byText('.card button', 'Не знаю').click();
  app.key('Enter');
  assert.match(app.text('.card .prompt'), /¡Hola!/, 'an immediate Enter is ignored');
  app.advance(400);
  app.key('Enter');
  assert.equal(app.text('.card .prompt'), 'Muy bien, gracias. ¿Y tú?');
});

test('session: keyboard shortcuts are mentioned only inside .kbd-hint (hidden on touch screens)', async t => {
  const app = await reviewing(t);
  const outside = el => {
    const copy = el.cloneNode(true);
    copy.querySelectorAll('.kbd-hint').forEach(k => k.remove());
    return copy.textContent;
  };
  assert.doesNotMatch(outside(app.$('.card')), /Пробел|Enter|Клавиш/);
  app.key(' ');
  assert.doesNotMatch(outside(app.$('.card')), /Пробел|Enter|Клавиш|\d · /);
  assert.match(app.text('.card .grades'), /1 · /, 'desktop still sees the key numbers');
});

test('session: a grade right after revealing is ignored (double-press guard)', async t => {
  const app = await reviewing(t);
  app.key(' ');
  app.key('3'); // no pause
  assert.ok(app.$('.card .grades'), 'the card must stay on screen');
  assert.equal(app.progress().cards['l01-01|recog'].reps, 0);
});

test('session: "good" saves the SM-2 state', async t => {
  const app = await reviewing(t);
  app.key(' ');
  app.grade('Легко');
  const c = app.progress().cards['l01-01|recog'];
  assert.equal(c.reps, 1);
  assert.equal(c.interval, 3);
  assert.ok(c.due > app.now());
  assert.match(app.text('.session-bar'), /повторено 1/);
});

test('session: four buttons — three Grades with interval previews, then "Всё, запомнил"', async t => {
  const app = await reviewing(t);
  app.key(' ');
  const labels = app.$$('.grades button').map(b => b.firstChild.textContent.trim());
  assert.deepEqual(labels, ['Забыл', 'Трудно', 'Легко', 'Всё, запомнил']);
  const previews = app.$$('.grades button small').map(s => s.textContent.replace(/^\d · /, ''));
  assert.deepEqual(previews.slice(0, 3), ['1 день', '1 день', '3 дня']);
});

test('session: "Легко" has the keyboard focus once the answer is shown', async t => {
  const app = await reviewing(t);
  app.key(' ');
  await app.waitFor(() => app.document.activeElement && app.document.activeElement.closest('.grades'));
  assert.match(app.document.activeElement.textContent, /^Легко/);
});

test('session: grades can be given with keys 1–3; "Легко" (3) is the medium Grade', async t => {
  const app = await reviewing(t);
  app.key(' ');
  app.advance(400);
  app.key('3');
  const c = app.progress().cards['l01-01|recog'];
  assert.equal(c.reps, 1);
  assert.equal(c.interval, 3);
  assert.equal(c.ef, 2.5);
  app.key(' ');
  app.advance(400);
  app.key('2');
  assert.equal(app.progress().cards['l01-02|recog'].interval, 1, '"Трудно" (2)');
});

test('session: "again" sends the card to the end of the same session', async t => {
  const app = await reviewing(t);
  app.key(' ');
  app.grade('Забыл');
  assert.equal(app.progress().cards['l01-01|recog'].lapses, 1);
  for (let i = 0; i < 15; i++) {
    app.answer('x');
    app.grade('Легко');
  }
  assert.match(app.text('.card .dir'), /Узнавание/);
  assert.equal(app.text('.card .prompt'), '¡Hola! ¿Qué tal?');
});

test('session: Production highlights differences; Transcription only after checking', async t => {
  const app = await reviewing(t);
  for (let i = 0; i < 8; i++) {
    app.key(' ');
    app.grade('Легко');
  }
  assert.match(app.text('.card .dir'), /Воспроизведение/);
  assert.equal(app.text('.card .prompt'), 'Привет! Как дела?');
  assert.equal(app.$('.card .tr'), null);
  assert.equal(app.$('.card .es'), null, 'the Spanish answer is hidden until checked');

  app.answer('hola, que tal');
  assert.ok(app.$('.verdict.almost'));
  assert.ok(app.$('.diff .missing'));
  assert.ok(app.$('.card .tr'));
  assert.ok(app.$('.card input.answer').disabled);
  assert.ok(app.$('.card .grades'), 'the learner gives the grade');
});

test('session: an exact answer shows the exact verdict; Enter checks', async t => {
  const app = await reviewing(t);
  for (let i = 0; i < 8; i++) {
    app.key(' ');
    app.grade('Легко');
  }
  const input = app.$('.card input.answer');
  input.value = '¡Hola! ¿Qué tal?';
  input.focus();
  app.key('Enter');
  assert.ok(app.$('.verdict.exact'));
  assert.equal(app.$('.diff'), null);
});

test('session: ñ, á etc. buttons insert the character at the cursor', async t => {
  const app = await reviewing(t);
  for (let i = 0; i < 8; i++) {
    app.key(' ');
    app.grade('Легко');
  }
  const input = app.$('.card input.answer');
  input.value = 'espaol';
  input.setSelectionRange(4, 4);
  app.byText('.accents button', 'ñ').click();
  assert.equal(input.value, 'español');
});

test('session: when time runs out the current card is finished, then the summary', async t => {
  const app = await reviewing(t);
  app.advance(15 * 60 * 1000 + 1000);
  await app.waitFor(() => app.$('.timer.over'), 2500);
  assert.ok(app.$('.card'), 'the card is not cut off');
  app.key(' ');
  app.grade('Легко');
  assert.match(app.text('main'), /Сессия окончена/);
  assert.match(app.text('main'), /Повторено карточек: 1/);
  assert.match(app.text('main'), /Ещё к повторению: 15/);
});

test('session: when cards run out the summary says everything is reviewed', async t => {
  const app = await reviewing(t);
  for (let i = 0; i < 16; i++) {
    app.answer('x');
    app.grade('Легко');
  }
  assert.match(app.text('main'), /Повторено карточек: 16/);
  assert.match(app.text('main'), /На сегодня всё повторено/);
});

// ---------- Practice ----------

// Lesson 1 progress where every Card was answered once and is not due for two more days.
function notDueProgress(overrides) {
  const progress = lessonOneProgress(overrides);
  for (const c of Object.values(progress.cards)) {
    Object.assign(c, { reps: 1, interval: 3, due: START + 2 * DAY, last: START - DAY });
  }
  return progress;
}

// The key ('l01-03|recog') of the Card on screen.
function shownKey(app) {
  const phrases = app.window.LESSONS[0].phrases;
  const prompt = app.text('.card .prompt');
  const recog = /Узнавание/.test(app.text('.card .dir'));
  const p = phrases.find(x => (recog ? x.es : x.ru) === prompt);
  assert.ok(p, 'unknown prompt: ' + prompt);
  return p.id + '|' + (recog ? 'recog' : 'produce');
}

async function practicing(t, progress) {
  const app = setup(t, { hash: '#/practice', progress });
  await app.waitFor(() => app.$('.card') || /Тренировать нечего/.test(app.text('main')));
  return app;
}

const withPracticeCards = n => ({ settings: { sessionMinutes: 15, practiceCards: n } });

test('home: Practice button shows how many Cards it will take, even when nothing is due', t => {
  const app = setup(t, { progress: notDueProgress() });
  assert.match(app.text('.panel'), /На сегодня всё повторено/);
  assert.equal(app.$('a[href="#/review"]'), null);
  assert.match(app.text('a[href="#/practice"]'), /Потренировать невыученные · 16/);

  const limited = setup(t, { progress: notDueProgress(withPracticeCards(5)) });
  assert.match(limited.text('a[href="#/practice"]'), /· 5$/);
});

test('home: no Practice button for an empty Deck or when every Card is Learned', t => {
  assert.equal(setup(t).$('a[href="#/practice"]'), null);
  const progress = notDueProgress();
  for (const c of Object.values(progress.cards)) c.interval = 21;
  assert.equal(setup(t, { progress }).$('a[href="#/practice"]'), null);
});

test('practice: nothing to practise when every Card is Learned', async t => {
  const progress = notDueProgress();
  for (const c of Object.values(progress.cards)) c.interval = 30;
  const app = await practicing(t, progress);
  assert.match(app.text('main'), /Тренировать нечего/);
});

test('practice: not-yet-Learned Cards only, hardest first, whether due or not', async t => {
  const progress = notDueProgress();
  const set = (key, fields) => Object.assign(progress.cards[key], fields);
  set('l01-07|recog', { ef: 1.3, lapses: 9, interval: 30 }); // Learned: never in Practice
  set('l01-05|produce', { ef: 1.3, lapses: 3 });             // lowest ease, most lapses
  set('l01-03|recog', { ef: 1.3, lapses: 1 });
  set('l01-06|recog', { ef: 2.0 });
  set('l01-08|produce', { due: START - DAY });                // due now: practised too
  set('l01-02|produce', { due: START + DAY });                // same ease: the sooner due first
  const app = await practicing(t, progress);
  assert.equal(app.$('.timer'), null, 'Practice is not time-boxed');

  const seen = [];
  while (app.$('.card')) {
    seen.push(shownKey(app));
    app.answer('x');
    app.grade('Легко');
  }
  assert.deepEqual(seen.slice(0, 6),
    ['l01-05|produce', 'l01-03|recog', 'l01-06|recog', 'l01-08|produce', 'l01-02|produce', 'l01-01|recog']);
  assert.equal(seen.length, 15);
  assert.ok(!seen.includes('l01-07|recog'));
  assert.match(app.text('main'), /Тренировка окончена/);
  assert.match(app.text('main'), /Пройдено карточек: 15/);
});

test('practice: takes at most the set number of Cards', async t => {
  const app = await practicing(t, notDueProgress(withPracticeCards(3)));
  assert.match(app.text('.session-bar'), /осталось 3/);
  for (let i = 0; i < 3; i++) {
    app.answer('x');
    app.grade('Легко');
  }
  assert.match(app.text('main'), /Тренировка окончена/);
  assert.match(app.text('main'), /Пройдено карточек: 3/);
  assert.ok(app.$('main a[href="#/"]'));
});

test('practice: "Трудно" and "Легко" leave the schedule untouched', async t => {
  const app = await practicing(t, notDueProgress());
  const before = clone(app.window.Store.get().cards);
  for (const label of ['Трудно', 'Легко']) {
    app.answer('x');
    app.grade(label);
  }
  assert.deepEqual(clone(app.window.Store.get().cards), before);
  assert.deepEqual(app.progress().cards, before);
});

test('practice: grade buttons say that only "again" changes the schedule', async t => {
  const app = await practicing(t, notDueProgress());
  app.answer('x');
  const previews = app.$$('.grades button small').map(s => s.textContent.replace(/^\d · /, ''));
  assert.deepEqual(previews.slice(0, 3), ['1 день', 'срок не меняется', 'срок не меняется']);
});

test('practice: "again" counts as in a Session and the Card comes back beyond the limit', async t => {
  const app = await practicing(t, notDueProgress(withPracticeCards(2)));
  const first = shownKey(app);
  app.answer('x');
  app.grade('Забыл');
  const forgotten = app.progress().cards[first];
  assert.equal(forgotten.lapses, 1);
  assert.equal(forgotten.interval, 1);
  assert.equal(forgotten.last, app.now());

  app.answer('x');
  app.grade('Легко');
  assert.equal(shownKey(app), first, 'the forgotten Card comes back after the limit is reached');
  app.answer('x');
  app.grade('Легко');
  assert.deepEqual(app.progress().cards[first], forgotten, 'the repeat does not grow the interval');
  assert.match(app.text('main'), /Тренировка окончена/);
  assert.match(app.text('main'), /Пройдено карточек: 3/);
});

test('practice: "Не знаю" counts as "again"', async t => {
  const app = await practicing(t, notDueProgress());
  const key = shownKey(app);
  app.byText('.card button', 'Не знаю').click();
  assert.equal(app.progress().cards[key].lapses, 1);
  assert.equal(app.progress().cards[key].interval, 1);
});

// ---------- Archive («Запомненные») ----------

// Marks the given Cards as moved to the Archive.
function withArchived(progress, keys, fields = {}) {
  for (const k of keys) Object.assign(progress.cards[k], { archived: true, ...fields });
  return progress;
}

// Presses "Всё, запомнил" on the shown Card and waits out the bounce guard of the choice that follows.
function pressArchive(app) {
  app.grade('Всё, запомнил');
  app.advance(400);
}

const choice = (app, label) => app.byText('.archive-choice button', label);

test('archive: "Всё, запомнил" asks "this Card / both Cards / cancel" and saves nothing yet', async t => {
  const app = await reviewing(t);
  app.key(' ');
  pressArchive(app);
  assert.equal(app.$('.card .grades'), null, 'the choice replaces the Grade buttons');
  assert.ok(choice(app, 'Только эту карточку'));
  assert.ok(choice(app, 'Обе карточки фразы'));
  assert.ok(choice(app, 'Отмена'));
  assert.ok(!app.progress().cards['l01-01|recog'].archived);
  assert.equal(app.text('.card .prompt'), '¡Hola! ¿Qué tal?', 'still the same Card');
});

test('archive: "Только эту карточку" archives this Card only, keeps its SM-2 state and moves on', async t => {
  const progress = lessonOneProgress();
  Object.assign(progress.cards['l01-01|recog'], { ef: 2.2, reps: 2, interval: 6, lapses: 1, last: START - 9 * DAY });
  const before = clone(progress.cards['l01-01|recog']);
  const app = await reviewing(t, { progress });
  app.key(' ');
  pressArchive(app);
  choice(app, 'Только эту карточку').click();
  const cards = app.progress().cards;
  assert.deepEqual(cards['l01-01|recog'], { ...before, archived: true, last: app.now() });
  assert.ok(!cards['l01-01|produce'].archived, 'the other Card of the Phrase stays in the Deck');
  assert.equal(app.text('.card .prompt'), 'Muy bien, gracias. ¿Y tú?');
  assert.match(app.text('.session-bar'), /осталось 15 · повторено 1/);
});

test('archive: "Обе карточки фразы" archives both Cards and drops the other one from this Session', async t => {
  const app = await reviewing(t);
  app.key(' ');
  pressArchive(app);
  choice(app, 'Обе карточки фразы').click();
  const cards = app.progress().cards;
  assert.ok(cards['l01-01|recog'].archived);
  assert.ok(cards['l01-01|produce'].archived);
  assert.equal(cards['l01-01|produce'].last, app.now());
  assert.match(app.text('.session-bar'), /осталось 14 · повторено 1/);
  const seen = [];
  while (app.$('.card')) {
    seen.push(shownKey(app));
    app.answer('x');
    app.grade('Легко');
  }
  assert.equal(seen.length, 14);
  assert.ok(!seen.includes('l01-01|produce'));
  assert.match(app.text('main'), /Повторено карточек: 15/);
});

test('archive: with the other Card already archived only "this Card" and "cancel" are offered', async t => {
  const progress = withArchived(lessonOneProgress(), ['l01-01|produce']);
  const app = await reviewing(t, { progress });
  app.key(' ');
  pressArchive(app);
  assert.ok(choice(app, 'Только эту карточку'));
  assert.ok(choice(app, 'Отмена'));
  assert.ok(!app.$$('.archive-choice button').some(b => /Обе/.test(b.textContent)));
});

test('archive: "Отмена" and Esc bring the Grade buttons back without saving anything', async t => {
  const app = await reviewing(t);
  app.key(' ');
  pressArchive(app);
  choice(app, 'Отмена').click();
  assert.ok(app.$('.card .grades'));
  assert.equal(app.$('.archive-choice'), null);
  pressArchive(app);
  app.key('Escape');
  assert.ok(app.$('.card .grades'));
  assert.ok(!app.progress().cards['l01-01|recog'].archived);
  assert.equal(app.progress().cards['l01-01|recog'].reps, 0);
  app.grade('Легко');
  assert.equal(app.progress().cards['l01-01|recog'].interval, 3, 'the Grade buttons work again');
});

test('archive: keys — 4 opens the choice, then 1 is this Card, 2 both, after the bounce guard', async t => {
  const app = await reviewing(t);
  app.key(' ');
  app.advance(400);
  app.key('4');
  assert.ok(app.$('.archive-choice'));
  app.key('1');
  assert.ok(!app.progress().cards['l01-01|recog'].archived, 'an immediate key press is ignored');
  app.advance(400);
  app.key('1');
  assert.ok(app.progress().cards['l01-01|recog'].archived);
  assert.ok(!app.progress().cards['l01-01|produce'].archived);

  app.key(' ');
  app.advance(400);
  app.key('4');
  app.advance(400);
  app.key('2');
  assert.ok(app.progress().cards['l01-02|recog'].archived);
  assert.ok(app.progress().cards['l01-02|produce'].archived);
});

test('archive: "this Card" has the focus in the choice, so Enter picks it', async t => {
  const app = await reviewing(t);
  app.key(' ');
  pressArchive(app);
  await app.waitFor(() => app.document.activeElement && app.document.activeElement.closest('.archive-choice'));
  assert.match(app.document.activeElement.textContent, /Только эту карточку/);
  app.key('Enter');
  assert.ok(app.progress().cards['l01-01|recog'].archived);
});

test('archive: works in a Practice too and is not treated as an early answer', async t => {
  const app = await practicing(t, notDueProgress());
  const key = shownKey(app);
  const before = clone(app.progress().cards[key]);
  app.answer('x');
  pressArchive(app);
  choice(app, 'Только эту карточку').click();
  assert.deepEqual(app.progress().cards[key], { ...before, archived: true, last: app.now() });
});

test('archive: archived Cards never come up in a Session or a Practice', async t => {
  const archived = ['l01-01|recog', 'l01-03|produce'];
  const session = await reviewing(t, { progress: withArchived(lessonOneProgress(), archived) });
  const seen = [];
  while (session.$('.card')) {
    seen.push(shownKey(session));
    session.answer('x');
    session.grade('Легко');
  }
  assert.equal(seen.length, 14);
  assert.ok(archived.every(k => !seen.includes(k)));

  const practice = await practicing(t, withArchived(notDueProgress(), archived, { ef: 1.3, lapses: 5 }));
  const practised = [];
  while (practice.$('.card')) {
    practised.push(shownKey(practice));
    practice.answer('x');
    practice.grade('Легко');
  }
  assert.equal(practised.length, 14);
  assert.ok(archived.every(k => !practised.includes(k)));
});

test('home: archived Cards get their own counter and are left out of due, learned and Practice', t => {
  const progress = withArchived(lessonOneProgress(), ['l01-02|recog', 'l01-03|produce']);
  withArchived(progress, ['l01-01|recog'], { interval: 30 });
  Object.assign(progress.cards['l01-04|recog'], { interval: 30, due: START + 30 * DAY });
  const app = setup(t, { progress });
  const stat = label => app.byText('.stat', label).querySelector('b').textContent;
  assert.equal(stat('к повторению'), '12');
  assert.equal(stat('выучено'), '1');
  assert.equal(stat('карточек в колоде'), '13');
  assert.equal(stat('запомнено'), '3');
  assert.match(app.text('a[href="#/practice"]'), /· 12$/);
});

test('home: a Deck with every Card archived is not called empty and still needs a backup', t => {
  const progress = lessonOneProgress();
  withArchived(progress, Object.keys(progress.cards));
  const app = setup(t, { progress });
  assert.doesNotMatch(app.text('.panel'), /Колода пока пуста/);
  assert.match(app.text('a[href="#/archive"]'), /· 16$/);
  assert.ok(app.$('.gear.attention'), 'the progress still needs a file copy');
});

test('home: a button checks the Archive, sized like a Practice; none while the Archive is empty', t => {
  const keys = ['l01-01|recog', 'l01-02|recog', 'l01-03|produce'];
  const app = setup(t, { progress: withArchived(lessonOneProgress(), keys) });
  assert.match(app.text('a[href="#/archive"]'), /Проверить запомненные · 3$/);
  const limited = setup(t, { progress: withArchived(lessonOneProgress(withPracticeCards(2)), keys) });
  assert.match(limited.text('a[href="#/archive"]'), /· 2$/);
  assert.equal(setup(t, { progress: lessonOneProgress() }).$('a[href="#/archive"]'), null);
});

async function checkingArchive(t, progress, random) {
  const app = setup(t, { progress });
  if (random) app.window.Math.random = random;
  await app.go('#/archive');
  await app.waitFor(() => app.$('.card') || /Запомненных карточек нет/.test(app.text('main')));
  return app;
}

test('archive run: nothing to check while the Archive is empty', async t => {
  const app = await checkingArchive(t, notDueProgress());
  assert.match(app.text('main'), /Запомненных карточек нет/);
});

test('archive run: only archived Cards, as many as a Practice takes, picked at random', async t => {
  const all = Object.keys(notDueProgress().cards);
  const run = async random => {
    const app = await checkingArchive(t, withArchived(notDueProgress(withPracticeCards(3)), all), random);
    assert.equal(app.$('.timer'), null, 'not time-boxed');
    const seen = [];
    while (app.$('.card')) {
      seen.push(shownKey(app));
      app.answer('x');
      app.grade('Легко');
    }
    assert.match(app.text('main'), /Проверка окончена. Пройдено карточек: 3/);
    return seen;
  };
  const low = await run(() => 0);
  const high = await run(() => 0.999);
  assert.equal(low.length, 3);
  assert.equal(high.length, 3);
  assert.notDeepEqual(low.slice().sort(), high.slice().sort(), 'the pick depends on chance');

  const some = withArchived(notDueProgress(), ['l01-02|recog', 'l01-05|produce']);
  const app = await checkingArchive(t, some);
  const seen = [];
  while (app.$('.card')) {
    seen.push(shownKey(app));
    app.answer('x');
    app.grade('Легко');
  }
  assert.deepEqual(seen.sort(), ['l01-02|recog', 'l01-05|produce']);
});

test('archive run: the four usual buttons; "Легко" returns the Card to the Deck from its frozen state', async t => {
  const progress = withArchived(notDueProgress(), ['l01-03|recog'], { reps: 2, interval: 10, ef: 2.5, due: START - 40 * DAY });
  const app = await checkingArchive(t, progress);
  app.answer('x');
  const labels = app.$$('.grades button').map(b => b.firstChild.textContent.trim());
  assert.deepEqual(labels, ['Забыл', 'Трудно', 'Легко', 'Всё, запомнил']);
  assert.match(app.text('.grades'), /25 дней/, 'the preview counts from the frozen interval');
  app.grade('Легко');
  const c = app.progress().cards['l01-03|recog'];
  assert.ok(!c.archived, 'back in the Deck');
  assert.equal(c.interval, 25);
  assert.equal(c.reps, 3);
  assert.equal(c.due, app.window.SRS.startOfDay(app.now()) + 25 * DAY);
  assert.match(app.text('main'), /Проверка окончена/);
});

test('archive run: "Забыл" returns the Card with a lapse and shows it again at the end of the run', async t => {
  const progress = withArchived(notDueProgress(), ['l01-03|recog', 'l01-04|recog'], { reps: 2, interval: 10 });
  const app = await checkingArchive(t, progress);
  const first = shownKey(app);
  app.answer('x');
  app.grade('Забыл');
  const forgotten = app.progress().cards[first];
  assert.ok(!forgotten.archived);
  assert.equal(forgotten.lapses, 1);
  assert.equal(forgotten.interval, 1);
  app.answer('x');
  app.grade('Легко');
  assert.equal(shownKey(app), first, 'the forgotten Card comes back');
  app.answer('x');
  app.grade('Легко');
  assert.equal(app.progress().cards[first].interval, 3, 'the repeat counts, as in a Session');
  assert.match(app.text('main'), /Пройдено карточек: 3/);
});

test('archive run: "Не знаю" returns the Card to the Deck like "Забыл"', async t => {
  const progress = withArchived(notDueProgress(), ['l01-03|produce'], { reps: 2, interval: 10 });
  const app = await checkingArchive(t, progress);
  app.byText('.card button', 'Не знаю').click();
  const c = app.progress().cards['l01-03|produce'];
  assert.ok(!c.archived);
  assert.equal(c.lapses, 1);
});

test('archive run: "Всё, запомнил" keeps the Card in the Archive with its SM-2 state', async t => {
  const progress = withArchived(notDueProgress(), ['l01-03|recog'], { reps: 2, interval: 10 });
  const before = clone(progress.cards['l01-03|recog']);
  const app = await checkingArchive(t, progress);
  app.answer('x');
  pressArchive(app);
  choice(app, 'Только эту карточку').click();
  assert.deepEqual(app.progress().cards['l01-03|recog'], { ...before, last: app.now() });
  assert.match(app.text('main'), /Проверка окончена/);
});

// ---------- progress: export and import ----------

test('export: records the save date and removes the reminder', t => {
  const app = setup(t, { hash: '#/settings', progress: lessonOneProgress() });
  assert.match(app.text('.warn'), /ни разу не сохранялся/);
  app.byText('button', 'Сохранить прогресс в файл').click();
  assert.equal(app.progress().lastExport, app.now());
  assert.ok(!/ни разу не сохранялся/.test(app.text('main')));
});

test('export: reminder a week after the last save', t => {
  const app = setup(t, { hash: '#/settings', progress: lessonOneProgress({ lastExport: START - 8 * DAY }) });
  assert.match(app.text('.warn'), /8 дней назад/);
});

test('import: a foreign file is rejected, a progress file replaces current progress', async t => {
  const app = setup(t, { hash: '#/settings' });
  const input = app.$('input[type=file]');

  await app.upload(input, '{"foo": 1}');
  await app.waitFor(() => app.alerts.length === 1);
  assert.match(app.alerts[0], /не похоже/);
  assert.equal(app.progress(), null);

  await app.upload(input, JSON.stringify(lessonOneProgress()));
  await app.waitFor(() => app.progress());
  assert.equal(Object.keys(app.progress().cards).length, 16);
  assert.equal(app.window.location.hash, '#/settings', 'the settings page stays open');
  await app.go('#/');
  assert.ok(app.$('.lessons li.done'), 'the home screen shows the imported progress');
});

test('import: declining the confirmation changes nothing', async t => {
  const app = setup(t, { hash: '#/settings' });
  app.setConfirm(false);
  await app.upload(app.$('input[type=file]'), JSON.stringify(lessonOneProgress()));
  await new Promise(r => setTimeout(r, 100));
  assert.equal(app.progress(), null);
});

test('storage: corrupted data does not prevent startup', t => {
  const app = setup(t, { rawProgress: '{not json' });
  const st = clone(app.window.Store.get());
  assert.deepEqual(st.cards, {});
  assert.equal(st.settings.sessionMinutes, 15);
  assert.equal(app.$$('.lessons li').length, 10);
});

test('storage: missing fields get defaults, junk is dropped', t => {
  const app = setup(t, { progress: { completedLessons: [1, 'x', null], cards: {}, settings: {} } });
  const st = clone(app.window.Store.get());
  assert.deepEqual(st.completedLessons, [1]);
  assert.equal(st.settings.sessionMinutes, 15);
  assert.equal(st.settings.practiceCards, 20);
  assert.equal(st.lastExport, null);
});

// ---------- speech ----------

test('voice: among several es-ES voices a Natural/Online one is chosen', t => {
  const app = setup(t, {
    voices: [
      { name: 'English', lang: 'en-US' },
      { name: 'Mexicano', lang: 'es-MX' },
      { name: 'Helena', lang: 'es-ES' },
      { name: 'Microsoft Elvira Online (Natural)', lang: 'es-ES' },
    ],
    hash: '#/settings',
  });
  assert.equal(app.window.Speech.voice().name, 'Microsoft Elvira Online (Natural)');
  assert.match(app.text('main'), /Голос: Microsoft Elvira/);
});

test('voice: without es-ES another Spanish voice is used and a hint is shown', t => {
  const app = setup(t, { hash: '#/settings', voices: [{ name: 'Mexicano', lang: 'es-MX' }] });
  assert.equal(app.window.Speech.isSpanishSpain(), false);
  assert.match(app.text('main'), /Голос для Испании не найден/);
});

const UA = {
  iphone: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
  ipad: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15',
  android: 'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36',
  windows: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0',
  mac: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15',
};

for (const [name, userAgent, touch, expected, notExpected] of [
  ['iPhone', UA.iphone, 5, /На iPhone\/iPad/, /Windows|Android/],
  ['iPad (reports as Mac, has touch)', UA.ipad, 5, /На iPhone\/iPad/, /На Mac/],
  ['Android', UA.android, 5, /На Android/, /Windows|iPhone/],
  ['Windows', UA.windows, 0, /В Windows/, /Android|iPhone/],
  ['Mac', UA.mac, 0, /На Mac/, /Windows|Android/],
]) {
  test(`voice: missing-voice hint is specific to ${name}`, t => {
    const app = setup(t, { hash: '#/settings', voices: [], userAgent, maxTouchPoints: touch });
    const hint = app.text('main');
    assert.match(hint, /Испанский голос не найден/);
    assert.match(hint, expected);
    assert.doesNotMatch(hint, notExpected);
  });
}

test('voice: without speech synthesis the trainer works and warns', async t => {
  const app = setup(t, { speech: false, hash: '#/lesson/1' });
  app.$('.phrase button[title="Слушать"]').click();
  await app.go('#/settings');
  assert.match(app.text('main'), /не умеет озвучивать/);
  assert.deepEqual(app.errors, []);
});
