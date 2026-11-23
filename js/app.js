// Trainer screens: home, Lesson, review Session.
// UI strings are learner-facing and therefore Russian.
(function () {
  'use strict';

  const $app = document.getElementById('app');
  const LESSONS = window.LESSONS || [];
  const DIRS = ['recog', 'produce'];
  const DIR_LABEL = {
    recog: 'Узнавание · ES → RU',
    produce: 'Воспроизведение · RU → ES',
  };
  const GRADE_LABEL = { again: 'Забыл', hard: 'Трудно', good: 'Нормально', easy: 'Легко' };

  // Phrase id -> { phrase, lesson, order }
  const phraseIndex = new Map();
  LESSONS.forEach(lesson =>
    lesson.phrases.forEach((phrase, order) => phraseIndex.set(phrase.id, { phrase, lesson, order }))
  );

  // ---------- helpers ----------

  function h(tag, attrs, ...children) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v == null || v === false) continue;
      if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
      else if (k === 'class') el.className = v;
      else el.setAttribute(k, v === true ? '' : v);
    }
    for (const c of children.flat()) {
      if (c == null || c === false) continue;
      el.append(c instanceof Node ? c : String(c));
    }
    return el;
  }

  // "о'ла" -> «о́ла»: an apostrophe after a vowel becomes a combining stress mark.
  function stress(text) {
    return text.replace(/([аеёиоуыэюяАЕЁИОУЫЭЮЯ])'/g, '$1́');
  }

  function transcription(p) {
    return h('span', { class: 'tr', lang: 'ru' }, '(' + stress(p.tr) + ')');
  }

  function esLine(p) {
    return h('div', { class: 'line' }, h('span', { class: 'es', lang: 'es' }, p.es), ' ', transcription(p));
  }

  function playButtons(text) {
    return [
      h('button', { class: 'icon', title: 'Слушать', 'aria-label': 'Слушать', onclick: () => Speech.speak(text) }, '▶'),
      h('button', { class: 'icon', title: 'Медленно', 'aria-label': 'Слушать медленно', onclick: () => Speech.speak(text, { rate: 0.6 }) }, '🐢'),
    ];
  }

  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const cardKey = (phraseId, dir) => phraseId + '|' + dir;
  const parseKey = key => { const [id, dir] = key.split('|'); return { id, dir }; };

  function plural(n, one, few, many) {
    const m10 = n % 10, m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return one;
    if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
    return many;
  }

  function fmtInterval(days) {
    if (days < 31) return days + ' ' + plural(days, 'день', 'дня', 'дней');
    if (days < 365) { const m = Math.round(days / 30); return '≈' + m + ' мес'; }
    const y = Math.round(days / 36.5) / 10;
    return '≈' + y + ' г';
  }

  function fmtClock(ms) {
    const s = Math.ceil(ms / 1000);
    return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
  }

  // Cards whose Phrase still exists (a Phrase may have been removed from the Lessons).
  function liveCards() {
    const cards = Store.get().cards;
    return Object.keys(cards).filter(k => phraseIndex.has(parseKey(k).id));
  }

  function stats(now) {
    const cards = Store.get().cards;
    let due = 0, learned = 0, total = 0;
    for (const k of liveCards()) {
      total++;
      if (SRS.isDue(cards[k], now)) due++;
      if (SRS.isLearned(cards[k])) learned++;
    }
    return { due, learned, total };
  }

  // Session order: the longest-overdue Cards first; on a tie Recognition comes before Production,
  // so a new Phrase is recognised before the learner has to produce it.
  function queueOrder(a, b) {
    const cards = Store.get().cards;
    const ca = cards[a], cb = cards[b];
    if (ca.due !== cb.due) return ca.due - cb.due;
    const pa = parseKey(a), pb = parseKey(b);
    if (pa.dir !== pb.dir) return DIRS.indexOf(pa.dir) - DIRS.indexOf(pb.dir);
    const ia = phraseIndex.get(pa.id), ib = phraseIndex.get(pb.id);
    return ia.lesson.n - ib.lesson.n || ia.order - ib.order;
  }

  function completeLesson(lesson) {
    const st = Store.get();
    const now = Date.now();
    if (!st.completedLessons.includes(lesson.n)) st.completedLessons.push(lesson.n);
    for (const p of lesson.phrases) {
      for (const dir of DIRS) {
        const k = cardKey(p.id, dir);
        if (!st.cards[k]) st.cards[k] = SRS.newCard(now);
      }
    }
    saveOrWarn();
  }

  function saveOrWarn() {
    if (!Store.save()) {
      alert('Браузер не дал сохранить прогресс. Сделайте экспорт в файл, чтобы ничего не потерять.');
    }
  }

  // ---------- routing ----------

  let cleanup = null;

  function route() {
    if (cleanup) { cleanup(); cleanup = null; }
    Speech.stop();
    const parts = (location.hash.slice(1) || '/').split('/').filter(Boolean);
    $app.replaceChildren();
    window.scrollTo(0, 0);
    if (parts[0] === 'lesson') renderLesson(parts[1]);
    else if (parts[0] === 'review') renderReview();
    else renderHome();
  }

  window.addEventListener('hashchange', route);

  // ---------- home ----------

  function renderHome() {
    const st = Store.get();
    const now = Date.now();
    const s = stats(now);

    document.title = 'Испанский тренажёр';

    const reviewPanel = h('section', { class: 'panel' },
      h('div', { class: 'stats' },
        h('div', { class: 'stat' }, h('b', null, s.due), h('span', null, 'к повторению')),
        h('div', { class: 'stat' }, h('b', null, s.learned), h('span', null, 'выучено')),
        h('div', { class: 'stat' }, h('b', null, s.total), h('span', null, 'карточек в колоде')),
      ),
      s.total === 0
        ? h('p', { class: 'muted' }, 'Колода пока пуста. Пройдите первый урок и отметьте его пройденным — его фразы появятся здесь.')
        : s.due === 0
          ? h('p', { class: 'muted' }, 'На сегодня всё повторено. ¡Muy bien!')
          : h('a', { class: 'btn primary', href: '#/review' }, `Начать сессию · ${st.settings.sessionMinutes} мин`),
    );

    const lessonList = h('ul', { class: 'lessons' },
      LESSONS.map(l => {
        const done = st.completedLessons.includes(l.n);
        return h('li', { class: done ? 'done' : null },
          h('a', { href: '#/lesson/' + l.n },
            h('span', { class: 'num' }, done ? '✓' : l.n),
            h('span', { class: 't' }, h('span', { class: 'es', lang: 'es' }, l.title), h('i', null, l.ru)),
            done ? h('span', { class: 'badge' }, 'пройден') : null,
          ));
      }),
    );

    // Settings and progress backup
    const minutes = h('input', {
      type: 'number', min: '1', max: '120', value: st.settings.sessionMinutes, class: 'answer',
      style: 'width:90px;font-size:17px;padding:6px 8px', 'aria-label': 'Длительность сессии в минутах',
      onchange: e => {
        const n = Number(e.target.value);
        const v = e.target.value.trim() !== '' && Number.isFinite(n) ? Math.min(120, Math.max(1, Math.round(n))) : 15;
        st.settings.sessionMinutes = v;
        saveOrWarn();
        route();
      },
    });

    const fileInput = h('input', { type: 'file', accept: '.json,application/json', hidden: true, onchange: importProgress });

    const daysSinceExport = st.lastExport ? Math.floor((now - st.lastExport) / SRS.DAY) : null;
    const exportReminder = s.total > 0 && (daysSinceExport === null || daysSinceExport >= 7)
      ? h('div', { class: 'warn' },
          daysSinceExport === null
            ? 'Прогресс ещё ни разу не сохранялся в файл. Если очистить данные браузера, он пропадёт.'
            : `Последнее сохранение в файл было ${daysSinceExport} ${plural(daysSinceExport, 'день', 'дня', 'дней')} назад.`)
      : null;

    const voiceStatus = h('p', { class: 'muted' });
    const updateVoice = () => voiceStatus.replaceChildren(...voiceInfo());
    updateVoice();
    const off = Speech.onChange(updateVoice);
    cleanup = off;

    $app.append(
      h('h1', null, 'Учим испанский'),
      h('p', { class: 'sub' }, 'Уроки в стиле Assimil и карточки с интервальным повторением.'),
      reviewPanel,
      h('h2', null, 'Уроки'),
      lessonList,
      h('h2', null, 'Прогресс и настройки'),
      h('section', { class: 'panel' },
        exportReminder,
        h('div', { class: 'row' },
          h('button', { onclick: exportProgress }, '💾 Сохранить прогресс в файл'),
          h('button', { onclick: () => fileInput.click() }, '📂 Загрузить из файла'),
          fileInput,
        ),
        h('p', { class: 'muted' }, st.lastExport
          ? 'Последнее сохранение: ' + new Date(st.lastExport).toLocaleString('ru-RU')
          : 'Прогресс хранится только в этом браузере.'),
        h('div', { class: 'row' }, h('label', null, 'Длительность сессии, минут:'), minutes),
        voiceStatus,
      ),
    );
  }

  function voiceInfo() {
    if (!Speech.supported) return [h('span', { class: 'warn' }, 'Этот браузер не умеет озвучивать текст. Откройте тренажёр в Microsoft Edge или Chrome.')];
    const v = Speech.voice();
    if (v && Speech.isSpanishSpain()) return ['Голос: ' + v.name];
    const how = 'Установите испанский голос: Параметры Windows → Время и язык → Речь → Добавить голоса → Español (España). Или откройте тренажёр в Microsoft Edge — там есть онлайн-голоса.';
    if (v) return [h('div', { class: 'warn' }, `Голос для Испании не найден, использую «${v.name}». ${how}`)];
    return [h('div', { class: 'warn' }, 'Испанский голос не найден. ' + how)];
  }

  function exportProgress() {
    const st = Store.get();
    st.lastExport = Date.now();
    saveOrWarn();
    const blob = new Blob([Store.toJson()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = h('a', { href: url, download: 'spanish-progress-' + new Date().toISOString().slice(0, 10) + '.json' });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    route();
  }

  function importProgress(e) {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      let data;
      try { data = JSON.parse(reader.result); } catch (err) { data = null; }
      if (!Store.looksLikeProgress(data)) {
        alert('Это не похоже на файл прогресса тренажёра.');
        return;
      }
      if (!confirm('Заменить текущий прогресс данными из файла?')) return;
      if (!Store.replace(data)) alert('Браузер не дал сохранить прогресс.');
      route();
    };
    reader.readAsText(file);
  }

  // ---------- Lesson ----------

  function renderLesson(nStr) {
    const idx = LESSONS.findIndex(l => String(l.n) === nStr);
    if (idx < 0) { location.hash = '#/'; return; }
    const lesson = LESSONS[idx];
    const st = Store.get();
    document.title = `Урок ${lesson.n}: ${lesson.title}`;

    const items = lesson.phrases.map(p =>
      h('li', { class: 'phrase' },
        esLine(p),
        h('div', { class: 'ru' }, p.ru),
        h('div', { class: 'actions' }, playButtons(p.es)),
      ));
    const dialog = h('ol', { class: 'dialog' }, items);

    // Playback: Phrase → pause to repeat aloud → next Phrase.
    let runId = 0;
    const status = h('div', { class: 'status', 'aria-live': 'polite' });
    const playBtn = h('button', { class: 'primary', onclick: () => (runId && playing ? stop() : playAll()) }, '▶ Слушать и повторять');
    let playing = false;

    function setPlaying(v) {
      playing = v;
      playBtn.textContent = v ? '■ Остановить' : '▶ Слушать и повторять';
    }

    async function playAll() {
      const my = ++runId;
      setPlaying(true);
      for (let i = 0; i < lesson.phrases.length; i++) {
        if (my !== runId) return;
        items.forEach(li => li.classList.remove('playing'));
        items[i].classList.add('playing');
        items[i].scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        status.textContent = 'Слушайте…';
        const t0 = performance.now();
        await Speech.speak(lesson.phrases[i].es);
        if (my !== runId) return;
        const spoken = performance.now() - t0;
        status.textContent = 'Повторите вслух…';
        await sleep(Math.max(1800, spoken * 1.3));
      }
      if (my !== runId) return;
      items.forEach(li => li.classList.remove('playing'));
      status.textContent = '';
      setPlaying(false);
    }

    function stop() {
      runId++;
      Speech.stop();
      items.forEach(li => li.classList.remove('playing'));
      status.textContent = '';
      setPlaying(false);
    }

    cleanup = stop;

    const done = st.completedLessons.includes(lesson.n);
    const completion = done
      ? h('p', { class: 'done-msg' }, '✓ Урок пройден — его фразы в колоде.')
      : h('div', null,
          h('p', { class: 'muted' }, 'Когда прослушаете и повторите диалог несколько раз, отметьте урок пройденным: его фразы попадут в колоду карточек.'),
          h('button', {
            class: 'primary',
            onclick: () => { completeLesson(lesson); route(); },
          }, 'Отметить урок пройденным'));

    const prev = LESSONS[idx - 1], next = LESSONS[idx + 1];

    $app.append(
      h('p', { class: 'muted' }, h('a', { href: '#/' }, '← Все уроки')),
      h('h1', null, `Урок ${lesson.n}. `, h('span', { lang: 'es' }, lesson.title)),
      h('p', { class: 'sub' }, lesson.ru),
      h('div', { class: 'player' }, h('div', { class: 'row' }, playBtn), status),
      ...(Speech.supported && !Speech.voice() ? [h('div', null, voiceInfo())] : []),
      dialog,
      ...(lesson.notes && lesson.notes.length
        ? [h('h2', null, 'Пояснения'), h('ul', { class: 'notes' }, lesson.notes.map(n => h('li', null, n)))]
        : []),
      h('h2', null, 'Готово?'),
      completion,
      h('nav', { class: 'lesson-nav' },
        prev ? h('a', { class: 'btn', href: '#/lesson/' + prev.n }, '← Урок ' + prev.n) : h('span'),
        next ? h('a', { class: 'btn', href: '#/lesson/' + next.n }, 'Урок ' + next.n + ' →') : h('span'),
      ),
    );
  }

  // ---------- Session ----------

  function renderReview() {
    const st = Store.get();
    const queue = liveCards().filter(k => SRS.isDue(st.cards[k], Date.now())).sort(queueOrder);
    document.title = 'Повторение';

    if (!queue.length) {
      $app.append(
        h('h1', null, 'Повторение'),
        h('p', null, 'Сейчас повторять нечего.'),
        h('a', { class: 'btn', href: '#/' }, '← На главную'),
      );
      return;
    }

    const limitMs = st.settings.sessionMinutes * 60 * 1000;
    const startedAt = Date.now();
    let timeUp = false;
    let reviewed = 0;
    let onKey = null;

    const timerEl = h('span', { class: 'timer' }, fmtClock(limitMs));
    const leftEl = h('span');
    const stage = h('div');

    const tick = () => {
      const left = Math.max(0, limitMs - (Date.now() - startedAt));
      timerEl.textContent = fmtClock(left);
      if (left === 0 && !timeUp) {
        timeUp = true;
        timerEl.classList.add('over');
        timerEl.textContent = 'время вышло — доделайте карточку';
      }
    };
    const timer = setInterval(tick, 1000);
    const keyListener = e => { if (onKey) onKey(e); };
    document.addEventListener('keydown', keyListener);
    cleanup = () => { clearInterval(timer); document.removeEventListener('keydown', keyListener); };

    $app.append(
      h('div', { class: 'session-bar' },
        h('a', { href: '#/' }, '← Выйти'),
        leftEl,
        timerEl,
      ),
      stage,
    );

    next();

    function updateLeft() {
      leftEl.textContent = 'осталось ' + queue.length + ' · повторено ' + reviewed;
    }

    function next() {
      if (timeUp || !queue.length) return finish();
      updateLeft();
      showCard(queue.shift());
    }

    function showCard(key) {
      const { id, dir } = parseKey(key);
      const p = phraseIndex.get(id).phrase;
      const card = h('div', { class: 'card' }, h('div', { class: 'dir' }, DIR_LABEL[dir]));
      stage.replaceChildren(card);

      if (dir === 'recog') {
        card.append(
          h('div', { class: 'prompt es', lang: 'es' }, p.es),
          h('div', { class: 'row' }, playButtons(p.es)),
        );
        const showBtn = h('button', { class: 'primary', onclick: reveal }, 'Показать ответ');
        const controls = h('div', { class: 'controls' }, showBtn, h('div', { class: 'hint' }, 'Вспомните перевод в уме или вслух. Пробел — показать ответ.'));
        card.append(controls);
        Speech.speak(p.es);
        showBtn.focus();
        onKey = e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); reveal(); } };

        function reveal() {
          if (!controls.isConnected) return;
          controls.remove();
          card.append(answerBlock(p));
          card.append(gradeBar(key));
        }
      } else {
        card.append(h('div', { class: 'prompt ru' }, p.ru));
        const input = h('input', {
          type: 'text', class: 'answer', lang: 'es', autocomplete: 'off', autocapitalize: 'off',
          spellcheck: 'false', placeholder: 'Напишите по-испански…', 'aria-label': 'Ваш ответ по-испански',
        });
        const accents = h('div', { class: 'accents' },
          Array.from('áéíóúüñ¿¡').map(ch =>
            h('button', { type: 'button', class: 'key', onclick: () => insertAtCursor(input, ch) }, ch)));
        const checkBtn = h('button', { class: 'primary', onclick: check }, 'Проверить');
        const controls = h('div', { class: 'controls' }, checkBtn, h('div', { class: 'hint' }, 'Enter — проверить.'));
        card.append(input, accents, controls);
        input.focus();
        onKey = e => { if (e.key === 'Enter' && document.activeElement === input) { e.preventDefault(); check(); } };

        function check() {
          if (input.disabled) return;
          input.disabled = true;
          accents.remove();
          controls.remove();
          card.append(diffBlock(input.value, p.es), answerBlock(p), gradeBar(key));
          Speech.speak(p.es);
        }
      }
    }

    function gradeBar(key) {
      const now = Date.now();
      const card = st.cards[key];
      // Guard against a bounced key press: the key that revealed the answer must not also set the Grade.
      const safeGrade = g => { if (Date.now() - now > 300) grade(key, g); };
      const bar = h('div', null,
        h('div', { class: 'grades' },
          SRS.GRADES.map((g, i) => {
            const preview = SRS.review(card, g, now).interval;
            return h('button', { class: g, onclick: () => safeGrade(g) },
              GRADE_LABEL[g], h('small', null, (i + 1) + ' · ' + fmtInterval(preview)));
          })),
        h('div', { class: 'hint' }, 'Оцените себя честно. Клавиши 1–4.'),
      );
      onKey = e => {
        const i = ['1', '2', '3', '4'].indexOf(e.key);
        if (i >= 0) { e.preventDefault(); safeGrade(SRS.GRADES[i]); }
      };
      setTimeout(() => { const b = bar.querySelector('.good'); if (b) b.focus(); }, 0);
      return bar;
    }

    function grade(key, g) {
      onKey = null;
      st.cards[key] = SRS.review(st.cards[key], g, Date.now());
      saveOrWarn();
      reviewed++;
      // "again": the Card comes back once more in this same Session.
      if (g === 'again') queue.push(key);
      next();
    }

    function finish() {
      cleanup();
      cleanup = null;
      onKey = null;
      Speech.stop();
      const left = stats(Date.now()).due;
      $app.replaceChildren(
        h('h1', null, '¡Muy bien!'),
        h('p', null, `Сессия окончена. Повторено карточек: ${reviewed}.`),
        h('p', { class: 'muted' }, left
          ? `Ещё к повторению: ${left}.`
          : 'На сегодня всё повторено.'),
        h('div', { class: 'row' },
          h('a', { class: 'btn', href: '#/' }, '← На главную'),
          left ? h('button', { class: 'primary', onclick: route }, 'Ещё одна сессия') : null,
        ),
      );
    }
  }

  function answerBlock(p) {
    return h('div', { class: 'answer-block' },
      h('div', { class: 'row' }, esLine(p), playButtons(p.es)),
      h('div', { class: 'ru' }, p.ru),
    );
  }

  function diffBlock(typed, correct) {
    const verdict = Diff.compare(typed, correct);
    const text = {
      exact: 'Точно!',
      almost: 'Почти: отличаются только ударения, ñ, заглавные буквы или знаки.',
      different: 'Есть отличия:',
      empty: 'Ответ пустой.',
    }[verdict];
    const block = h('div', null, h('div', { class: 'verdict ' + verdict }, text));
    if (verdict === 'almost' || verdict === 'different') {
      const ops = Diff.diffChars(typed.trim().replace(/\s+/g, ' '), correct);
      block.append(
        h('div', { class: 'diff', lang: 'es' }, ops.map(o => o.type === 'same' ? o.text : h('span', { class: o.type }, o.text))),
        h('div', { class: 'hint' }, 'Зачёркнуто — лишнее у вас, подчёркнуто — чего не хватает.'),
      );
    }
    return block;
  }

  function insertAtCursor(input, ch) {
    const start = input.selectionStart ?? input.value.length;
    const end = input.selectionEnd ?? input.value.length;
    input.value = input.value.slice(0, start) + ch + input.value.slice(end);
    input.focus();
    input.setSelectionRange(start + ch.length, start + ch.length);
  }

  route();
})();
