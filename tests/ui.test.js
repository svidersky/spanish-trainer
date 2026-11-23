// Экраны тренажёра в jsdom: главная, Урок, Сессия, прогресс, озвучка.
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

// ---------- главная ----------

test('главная: 10 уроков, пустая колода, без кнопки сессии', t => {
  const app = setup(t);
  assert.equal(app.$$('.lessons li').length, 10);
  assert.match(app.text('.panel'), /Колода пока пуста/);
  assert.equal(app.$('a[href="#/review"]'), null);
  assert.deepEqual(app.errors, []);
});

test('главная: статистика и кнопка сессии при пройденном уроке', t => {
  const app = setup(t, { progress: lessonOneProgress() });
  const [due, learned, total] = app.$$('.stat b').map(b => b.textContent);
  assert.deepEqual([due, learned, total], ['16', '0', '16']);
  assert.match(app.text('a[href="#/review"]'), /15 мин/);
  assert.ok(app.$('.lessons li.done'));
});

test('главная: карточки удалённых фраз не учитываются и ничего не ломают', t => {
  const app = setup(t, {
    progress: { completedLessons: [1], cards: { 'zz-99|recog': { ef: 2.5, reps: 0, interval: 0, lapses: 0, due: START } } },
  });
  assert.equal(app.$$('.stat b')[2].textContent, '0');
  assert.deepEqual(app.errors, []);
});

test('главная: длительность сессии ограничена 1–120 минутами', t => {
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

// ---------- Урок ----------

test('урок: испанский текст и транскрипция с ударением в скобках', t => {
  const app = setup(t, { hash: '#/lesson/1' });
  const first = app.$('.phrase');
  assert.equal(first.querySelector('.es').textContent, '¡Hola! ¿Qué tal?');
  assert.equal(first.querySelector('.tr').textContent, '(о́ла! кэ таль?)');
  assert.equal(first.querySelector('.ru').textContent, 'Привет! Как дела?');
  assert.ok(!app.text('.dialog').includes("'"), 'апострофы ударений должны превратиться в знак ударения');
  assert.equal(app.$$('.phrase').length, 8);
  assert.ok(app.$$('.notes li').length > 0);
});

test('урок: ▶ и 🐢 озвучивают фразу обычной и медленной скоростью', t => {
  const app = setup(t, { hash: '#/lesson/1' });
  const first = app.$('.phrase');
  first.querySelector('button[title="Слушать"]').click();
  assert.equal(app.spoken.at(-1).text, '¡Hola! ¿Qué tal?');
  const normal = app.spoken.at(-1).rate;
  first.querySelector('button[title="Медленно"]').click();
  assert.ok(app.spoken.at(-1).rate < normal);
  assert.equal(app.spoken.at(-1).voice.lang, 'es-ES');
});

test('урок: «Слушать и повторять» проигрывает фразы по порядку и останавливается', async t => {
  const app = setup(t, { hash: '#/lesson/1' });
  const play = app.byText('.player button', 'Слушать и повторять');
  play.click();
  assert.equal(app.spoken.at(-1).text, '¡Hola! ¿Qué tal?');
  assert.ok(app.$('.phrase.playing'));
  await app.waitFor(() => /Повторите вслух/.test(app.text('.status')));
  play.click(); // теперь это «Остановить»
  assert.equal(app.$('.phrase.playing'), null);
  assert.match(play.textContent, /Слушать и повторять/);
});

test('урок: «Отметить пройденным» кладёт по две карточки на каждую фразу', t => {
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

test('урок: повторная отметка не сбрасывает прогресс карточек', async t => {
  const progress = lessonOneProgress();
  progress.cards['l01-01|recog'] = { ef: 2.6, reps: 3, interval: 15, lapses: 0, due: START + 15 * DAY, last: START };
  progress.completedLessons = [];
  const app = setup(t, { hash: '#/lesson/1', progress });
  app.byText('button', 'Отметить урок пройденным').click();
  assert.equal(app.progress().cards['l01-01|recog'].interval, 15);
});

test('урок: несуществующий номер ведёт на главную', async t => {
  const app = setup(t, { hash: '#/lesson/99' });
  await app.waitFor(() => app.$('.lessons'));
});

// ---------- Сессия ----------

test('сессия: нечего повторять', t => {
  const progress = lessonOneProgress();
  for (const c of Object.values(progress.cards)) c.due = START + 2 * DAY;
  const app = setup(t, { hash: '#/review', progress });
  assert.match(app.text('main'), /Сейчас повторять нечего/);
});

test('сессия: сначала узнавание, ответ и транскрипция скрыты до показа', async t => {
  const app = await reviewing(t);
  assert.match(app.text('.card .dir'), /Узнавание/);
  assert.equal(app.text('.card .prompt'), '¡Hola! ¿Qué tal?');
  assert.equal(app.$('.card .tr'), null);
  assert.equal(app.$('.card .grades'), null);
  assert.equal(app.spoken.at(-1).text, '¡Hola! ¿Qué tal?', 'фраза озвучивается при показе');
  app.key(' ');
  assert.ok(app.$('.card .tr'));
  assert.ok(app.$('.card .grades'));
  assert.match(app.text('.card .answer-block'), /Привет! Как дела\?/);
});

test('сессия: оценка сразу после показа ответа игнорируется (защита от двойного нажатия)', async t => {
  const app = await reviewing(t);
  app.key(' ');
  app.key('3'); // без паузы
  assert.ok(app.$('.card .grades'), 'карточка должна остаться на экране');
  assert.equal(app.progress().cards['l01-01|recog'].reps, 0);
});

test('сессия: «Нормально» сохраняет состояние SM-2', async t => {
  const app = await reviewing(t);
  app.key(' ');
  app.grade('Нормально');
  const c = app.progress().cards['l01-01|recog'];
  assert.equal(c.reps, 1);
  assert.equal(c.interval, 1);
  assert.ok(c.due > app.now());
  assert.match(app.text('.session-bar'), /повторено 1/);
});

test('сессия: оценки ставятся клавишами 1–4', async t => {
  const app = await reviewing(t);
  app.key(' ');
  app.advance(400);
  app.key('4');
  const c = app.progress().cards['l01-01|recog'];
  assert.equal(c.reps, 1);
  assert.ok(c.ef > 2.5, '«Легко» повышает лёгкость');
});

test('сессия: «Забыл» возвращает карточку в конец той же сессии', async t => {
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

test('сессия: воспроизведение — подсветка отличий, транскрипция только после проверки', async t => {
  const app = await reviewing(t);
  for (let i = 0; i < 8; i++) {
    app.key(' ');
    app.grade('Нормально');
  }
  assert.match(app.text('.card .dir'), /Воспроизведение/);
  assert.equal(app.text('.card .prompt'), 'Привет! Как дела?');
  assert.equal(app.$('.card .tr'), null);
  assert.equal(app.$('.card .es'), null, 'испанский ответ не виден до проверки');

  app.answer('hola, que tal');
  assert.ok(app.$('.verdict.almost'));
  assert.ok(app.$('.diff .missing'));
  assert.ok(app.$('.card .tr'));
  assert.ok(app.$('.card input.answer').disabled);
  assert.ok(app.$('.card .grades'), 'оценку ставит ученик');
});

test('сессия: точный ответ — «Точно!», Enter проверяет', async t => {
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

test('сессия: кнопки ñ, á и др. вставляют символ в позицию курсора', async t => {
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

test('сессия: по истечении времени текущая карточка доигрывается, затем итог', async t => {
  const app = await reviewing(t);
  app.advance(15 * 60 * 1000 + 1000);
  await app.waitFor(() => app.$('.timer.over'), 2500);
  assert.ok(app.$('.card'), 'карточка не обрывается');
  app.key(' ');
  app.grade('Нормально');
  assert.match(app.text('main'), /Сессия окончена/);
  assert.match(app.text('main'), /Повторено карточек: 1/);
  assert.match(app.text('main'), /Ещё к повторению: 15/);
});

test('сессия: когда карточки закончились — итог «всё повторено»', async t => {
  const app = await reviewing(t);
  for (let i = 0; i < 16; i++) {
    app.answer('x');
    app.grade('Нормально');
  }
  assert.match(app.text('main'), /Повторено карточек: 16/);
  assert.match(app.text('main'), /На сегодня всё повторено/);
});

// ---------- прогресс: экспорт и импорт ----------

test('экспорт: запоминает дату сохранения и убирает напоминание', t => {
  const app = setup(t, { progress: lessonOneProgress() });
  assert.match(app.text('.warn'), /ни разу не сохранялся/);
  app.byText('button', 'Сохранить прогресс в файл').click();
  assert.equal(app.progress().lastExport, app.now());
  assert.ok(!/ни разу не сохранялся/.test(app.text('main')));
});

test('экспорт: напоминание через неделю после сохранения', t => {
  const app = setup(t, { progress: lessonOneProgress({ lastExport: START - 8 * DAY }) });
  assert.match(app.text('.warn'), /8 дней назад/);
});

test('импорт: чужой файл отклоняется, файл прогресса заменяет текущий', async t => {
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

test('импорт: отказ в подтверждении ничего не меняет', async t => {
  const app = setup(t);
  app.setConfirm(false);
  await app.upload(app.$('input[type=file]'), JSON.stringify(lessonOneProgress()));
  await new Promise(r => setTimeout(r, 100));
  assert.equal(app.progress(), null);
});

test('хранилище: испорченные данные не мешают запуску', t => {
  const app = setup(t, { rawProgress: '{не json' });
  const st = clone(app.window.Store.get());
  assert.deepEqual(st.cards, {});
  assert.equal(st.settings.sessionMinutes, 15);
  assert.equal(app.$$('.lessons li').length, 10);
});

test('хранилище: недостающие поля дополняются, мусор отбрасывается', t => {
  const app = setup(t, { progress: { completedLessons: [1, 'x', null], cards: {}, settings: {} } });
  const st = clone(app.window.Store.get());
  assert.deepEqual(st.completedLessons, [1]);
  assert.equal(st.settings.sessionMinutes, 15);
  assert.equal(st.lastExport, null);
});

// ---------- озвучка ----------

test('голос: из нескольких es-ES выбирается Natural/Online', t => {
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

test('голос: без es-ES берётся другой испанский и показывается подсказка', t => {
  const app = setup(t, { voices: [{ name: 'Mexicano', lang: 'es-MX' }] });
  assert.equal(app.window.Speech.isSpanishSpain(), false);
  assert.match(app.text('main'), /Голос для Испании не найден/);
});

test('голос: без синтеза речи тренажёр работает и предупреждает', async t => {
  const app = setup(t, { speech: false, hash: '#/lesson/1' });
  app.$('.phrase button[title="Слушать"]').click();
  await app.go('#/');
  await app.waitFor(() => app.$('.lessons'));
  assert.match(app.text('main'), /не умеет озвучивать/);
  assert.deepEqual(app.errors, []);
});
