// Trainer screens in jsdom: home, Lesson, Session, progress, speech.
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

test('home: session length is clamped to 1–120 minutes', t => {
  const app = setup(t);
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
  for (const hash of ['#/', '#/lesson/1', '#/review']) {
    const app = setup(t, { hash, progress: lessonOneProgress() });
    assert.doesNotMatch(app.text('main'), /\bnull\b|\bundefined\b|\[object /, hash);
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
  app.grade('Нормально');
  const c = app.progress().cards['l01-01|recog'];
  assert.equal(c.reps, 1);
  assert.equal(c.interval, 1);
  assert.ok(c.due > app.now());
  assert.match(app.text('.session-bar'), /повторено 1/);
});

test('session: grades can be given with keys 1–4', async t => {
  const app = await reviewing(t);
  app.key(' ');
  app.advance(400);
  app.key('4');
  const c = app.progress().cards['l01-01|recog'];
  assert.equal(c.reps, 1);
  assert.ok(c.ef > 2.5, '"easy" raises ease');
});

test('session: "again" sends the card to the end of the same session', async t => {
  const app = await reviewing(t);
  app.key(' ');
  app.grade('Забыл');
  assert.equal(app.progress().cards['l01-01|recog'].lapses, 1);
  for (let i = 0; i < 15; i++) {
    app.answer('x');
    app.grade('Нормально');
  }
  assert.match(app.text('.card .dir'), /Узнавание/);
  assert.equal(app.text('.card .prompt'), '¡Hola! ¿Qué tal?');
});

test('session: Production highlights differences; Transcription only after checking', async t => {
  const app = await reviewing(t);
  for (let i = 0; i < 8; i++) {
    app.key(' ');
    app.grade('Нормально');
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
    app.grade('Нормально');
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
    app.grade('Нормально');
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
  app.grade('Нормально');
  assert.match(app.text('main'), /Сессия окончена/);
  assert.match(app.text('main'), /Повторено карточек: 1/);
  assert.match(app.text('main'), /Ещё к повторению: 15/);
});

test('session: when cards run out the summary says everything is reviewed', async t => {
  const app = await reviewing(t);
  for (let i = 0; i < 16; i++) {
    app.answer('x');
    app.grade('Нормально');
  }
  assert.match(app.text('main'), /Повторено карточек: 16/);
  assert.match(app.text('main'), /На сегодня всё повторено/);
});

// ---------- progress: export and import ----------

test('export: records the save date and removes the reminder', t => {
  const app = setup(t, { progress: lessonOneProgress() });
  assert.match(app.text('.warn'), /ни разу не сохранялся/);
  app.byText('button', 'Сохранить прогресс в файл').click();
  assert.equal(app.progress().lastExport, app.now());
  assert.ok(!/ни разу не сохранялся/.test(app.text('main')));
});

test('export: reminder a week after the last save', t => {
  const app = setup(t, { progress: lessonOneProgress({ lastExport: START - 8 * DAY }) });
  assert.match(app.text('.warn'), /8 дней назад/);
});

test('import: a foreign file is rejected, a progress file replaces current progress', async t => {
  const app = setup(t);
  const input = app.$('input[type=file]');

  await app.upload(input, '{"foo": 1}');
  await app.waitFor(() => app.alerts.length === 1);
  assert.match(app.alerts[0], /не похоже/);
  assert.equal(app.progress(), null);

  await app.upload(input, JSON.stringify(lessonOneProgress()));
  await app.waitFor(() => app.$('.lessons li.done'));
  assert.equal(Object.keys(app.progress().cards).length, 16);
});

test('import: declining the confirmation changes nothing', async t => {
  const app = setup(t);
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
  });
  assert.equal(app.window.Speech.voice().name, 'Microsoft Elvira Online (Natural)');
  assert.match(app.text('main'), /Голос: Microsoft Elvira/);
});

test('voice: without es-ES another Spanish voice is used and a hint is shown', t => {
  const app = setup(t, { voices: [{ name: 'Mexicano', lang: 'es-MX' }] });
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
    const app = setup(t, { voices: [], userAgent, maxTouchPoints: touch });
    const hint = app.text('main');
    assert.match(hint, /Испанский голос не найден/);
    assert.match(hint, expected);
    assert.doesNotMatch(hint, notExpected);
  });
}

test('voice: without speech synthesis the trainer works and warns', async t => {
  const app = setup(t, { speech: false, hash: '#/lesson/1' });
  app.$('.phrase button[title="Слушать"]').click();
  await app.go('#/');
  await app.waitFor(() => app.$('.lessons'));
  assert.match(app.text('main'), /не умеет озвучивать/);
  assert.deepEqual(app.errors, []);
});
