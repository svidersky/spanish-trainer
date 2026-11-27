// Trainer screens: home, settings, Lesson, review Session, Practice and the Archive run.
// Learner-facing strings come from js/i18n.js in the chosen interface language (Russian or English).
(function () {
  'use strict';

  const $app = document.getElementById('app');
  const LESSONS = window.LESSONS || [];
  const DIRS = ['recog', 'produce'];
  const t = I18n.t;
  const DIR_KEY = { recog: 'dirRecog', produce: 'dirProduce' };
  const GRADE_KEY = { again: 'gradeAgain', hard: 'gradeHard', good: 'gradeGood' };

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

  // Lesson content in the interface language: the translation, the Transcription, notes.
  const english = () => I18n.lang() === 'en';
  const translation = x => (english() ? x.en : x.ru);
  const notesOf = lesson => (english() ? lesson.notesEn : lesson.notes);

  function translationEl(p, cls) {
    return h('div', { class: cls, lang: I18n.lang() }, translation(p));
  }

  function transcription(p) {
    return h('span', { class: 'tr', lang: I18n.lang() }, '(' + (english() ? p.trEn : stress(p.tr)) + ')');
  }

  function esLine(p) {
    return h('div', { class: 'line' }, h('span', { class: 'es', lang: 'es' }, p.es), ' ', transcription(p));
  }

  function playButtons(p) {
    return [
      h('button', { class: 'icon', title: t('listen'), 'aria-label': t('listen'), onclick: () => Speech.say(p) }, '▶'),
      h('button', { class: 'icon', title: t('slow'), 'aria-label': t('listenSlow'), onclick: () => Speech.say(p, { slow: true }) }, '🐢'),
    ];
  }

  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const cardKey = (phraseId, dir) => phraseId + '|' + dir;
  const parseKey = key => { const [id, dir] = key.split('|'); return { id, dir }; };

  function fmtInterval(days) {
    if (days < 31) return I18n.days(days);
    if (days < 365) return t('months', Math.round(days / 30));
    return t('years', Math.round(days / 36.5) / 10);
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

  // Cards in the Deck, not in the Archive.
  const deckCards = () => liveCards().filter(k => !SRS.isArchived(Store.get().cards[k]));
  const archivedCards = () => liveCards().filter(k => SRS.isArchived(Store.get().cards[k]));

  // Counts for the Deck (total, due, learned); archived Cards are counted on their own.
  function stats(now) {
    const cards = Store.get().cards;
    let due = 0, learned = 0, total = 0;
    for (const k of deckCards()) {
      total++;
      if (SRS.isDue(cards[k], now)) due++;
      if (SRS.isLearned(cards[k])) learned++;
    }
    const archived = archivedCards().length;
    return { due, learned, total, archived, notLearned: total - learned };
  }

  // A random pick of n keys (Fisher–Yates shuffle, then the first n).
  function randomPick(keys, n) {
    const a = keys.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a.slice(0, n);
  }

  // Practice order: the hardest Cards first (lowest ease, then most lapses), then the soonest due,
  // then the Session order.
  function practiceOrder(a, b) {
    const cards = Store.get().cards;
    const ca = cards[a], cb = cards[b];
    return ca.ef - cb.ef || cb.lapses - ca.lapses || queueOrder(a, b);
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
      alert(t('saveFailed'));
    }
  }

  // ---------- routing ----------

  let cleanup = null;

  // '#/lesson/3' -> ['lesson', '3']; the home screen is [].
  const routeParts = () => (location.hash.slice(1) || '/').split('/').filter(Boolean);

  function route() {
    if (cleanup) { cleanup(); cleanup = null; }
    applyLanguage();
    Speech.stop();
    const parts = routeParts();
    $app.replaceChildren();
    window.scrollTo(0, 0);
    if (parts[0] === 'lesson') renderLesson(parts[1]);
    else if (parts[0] === 'review') renderReview('session');
    else if (parts[0] === 'practice') renderReview('practice');
    else if (parts[0] === 'archive') renderReview('archive');
    else if (parts[0] === 'settings') renderSettings();
    else renderHome();
  }

  window.addEventListener('hashchange', route);

  // ---------- interface language ----------

  const $brand = document.querySelector('header .brand span');
  const $lang = h('select', {
    class: 'lang', name: 'lang',
    onchange: e => {
      Store.setSetting('lang', e.target.value);
      saveOrWarn();
      route();
    },
  }, I18n.LANGS.map(l => h('option', { value: l, lang: l }, I18n.NAMES[l])));
  // The gear opens the settings page; it is marked while the progress needs a file copy.
  const $gear = h('a', { class: 'gear', href: '#/settings' }, '⚙');
  document.querySelector('header .top-inner').append(h('div', { class: 'tools' }, $gear, $lang));

  // The parts outside the screens: the page language, the brand, the gear and the dropdown.
  function applyLanguage() {
    document.documentElement.lang = I18n.lang();
    if ($brand) $brand.textContent = t('appTitle');
    $lang.value = I18n.lang();
    $lang.setAttribute('aria-label', t('langLabel'));
    $lang.title = t('langLabel');
    const attention = backupDue(Date.now()) !== false;
    $gear.classList.toggle('attention', attention);
    $gear.setAttribute('aria-label', t(attention ? 'settingsAttention' : 'settingsLabel'));
    $gear.title = t('settingsLabel');
  }

  // ---------- backup reminder ----------

  // Whether the progress needs a file copy: false if not (empty Deck, a Profile keeps it on the
  // Sync server, or exported less than a week ago), otherwise the whole days since the last
  // export (null if never exported).
  function backupDue(now) {
    const st = Store.get();
    const s = stats(now);
    if (s.total + s.archived === 0) return false;
    if (hasProfile()) return false;
    if (!st.lastExport) return null;
    const days = Math.floor((now - st.lastExport) / SRS.DAY);
    return days >= 7 ? days : false;
  }

  // Whether a Profile is remembered on this device (its progress is then kept on the Sync server).
  const hasProfile = () => !!(window.Sync && Sync.profile());

  // A part of a screen that depends on the Profile: re-rendered in place on every Sync status
  // change, so the rest of the screen (scroll position, a field being typed in) is left alone.
  // render() returns a node or null. Returns the node to place and the function that stops it.
  function followsProfile(render) {
    const current = () => render() || document.createComment('');
    let node = current();
    const off = window.Sync
      ? Sync.onStatus(() => {
          const next = current();
          node.replaceWith(next);
          node = next;
        })
      : () => {};
    return { node, off };
  }

  // The reminder text, with a link to the settings page when shown elsewhere.
  function backupReminder(now, withLink) {
    const days = backupDue(now);
    if (days === false) return null;
    return h('div', { class: 'warn' },
      days === null ? t('neverExported') : t('exportedAgo', I18n.days(days)),
      withLink ? [' ', h('a', { href: '#/settings' }, t('saveCopyLink'))] : null);
  }

  // ---------- home ----------

  function renderHome() {
    const st = Store.get();
    const now = Date.now();
    const s = stats(now);

    document.title = t('appTitle');

    const reviewPanel = h('section', { class: 'panel' },
      h('div', { class: 'stats' },
        h('div', { class: 'stat' }, h('b', null, s.due), h('span', null, t('statDue'))),
        h('div', { class: 'stat' }, h('b', null, s.learned), h('span', null, t('statLearned'))),
        h('div', { class: 'stat' }, h('b', null, s.total), h('span', null, t('statTotal'))),
        h('div', { class: 'stat' }, h('b', null, s.archived), h('span', null, t('statArchived'))),
      ),
      s.total + s.archived === 0
        ? h('p', { class: 'muted' }, t('deckEmpty'))
        : s.due === 0
          ? h('p', { class: 'muted' }, t('allReviewedToday'))
          : h('a', { class: 'btn primary', href: '#/review' }, t('startSession', st.settings.sessionMinutes)),
      s.notLearned > 0
        ? h('p', null, h('a', { class: 'btn', href: '#/practice' },
            t('startPractice', Math.min(s.notLearned, st.settings.practiceCards))))
        : null,
      s.archived > 0
        ? h('p', null, h('a', { class: 'btn', href: '#/archive' },
            t('startArchive', Math.min(s.archived, st.settings.practiceCards))))
        : null,
    );

    const lessonList = h('ul', { class: 'lessons' },
      LESSONS.map(l => {
        const done = st.completedLessons.includes(l.n);
        return h('li', { class: done ? 'done' : null },
          h('a', { href: '#/lesson/' + l.n },
            h('span', { class: 'num' }, done ? '✓' : l.n),
            h('span', { class: 't' }, h('span', { class: 'es', lang: 'es' }, l.title), h('i', { lang: I18n.lang() }, translation(l))),
            done ? h('span', { class: 'badge' }, t('completedBadge')) : null,
          ));
      }),
    );

    const reminder = followsProfile(() => backupReminder(Date.now(), true));
    cleanup = reminder.off;
    $app.append(
      h('h1', null, t('homeTitle')),
      h('p', { class: 'sub' }, t('homeSub')),
      reviewPanel,
      reminder.node,
      h('h2', null, t('lessons')),
      lessonList,
    );
  }

  // ---------- settings: progress backup, Sync, Session and Practice sizes, voice ----------

  function renderSettings() {
    const st = Store.get();

    document.title = t('progressAndSettings');

    // A whole-number setting clamped to [min, max]; anything unreadable falls back to the default.
    const numberSetting = (name, min, max, fallback, label) => h('input', {
      type: 'number', min: String(min), max: String(max), value: st.settings[name], class: 'answer',
      style: 'width:90px;font-size:17px;padding:6px 8px', 'aria-label': label,
      onchange: e => {
        const n = Number(e.target.value);
        const v = e.target.value.trim() !== '' && Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : fallback;
        Store.setSetting(name, v);
        saveOrWarn();
        route();
      },
    });
    const minutes = numberSetting('sessionMinutes', 1, 120, 15, t('sessionMinutesLabel'));
    const practiceSize = numberSetting('practiceCards', 1, 200, 20, t('practiceCardsLabel'));

    const fileInput = h('input', { type: 'file', accept: '.json,application/json', hidden: true, onchange: importProgress });

    const voiceStatus = h('p', { class: 'muted' });
    const updateVoice = () => voiceStatus.replaceChildren(
      ...(Speech.hasRecordings()
        ? [t('recordingsInfo')]
        : []),
      ...voiceInfo(),
    );
    updateVoice();
    const offVoice = Speech.onChange(updateVoice);
    const sync = syncSection();
    const reminder = followsProfile(() => backupReminder(Date.now(), false));
    const fileNote = followsProfile(() => h('p', { class: 'muted' }, st.lastExport
      ? t('lastExport', new Date(st.lastExport).toLocaleString(I18n.locale()))
      : hasProfile()
        ? t('fileIsExtraCopy')
        : t('onlyInBrowser')));
    cleanup = () => { offVoice(); sync.off(); reminder.off(); fileNote.off(); };

    $app.append(
      h('p', null, h('a', { href: '#/' }, t('toHome'))),
      h('h1', null, t('progressAndSettings')),
      ...(sync.el ? [sync.el] : []),
      h('section', { class: 'panel' },
        reminder.node,
        h('div', { class: 'row' },
          h('button', { onclick: exportProgress }, t('exportButton')),
          h('button', { onclick: () => fileInput.click() }, t('importButton')),
          fileInput,
        ),
        fileNote.node,
        h('div', { class: 'row' }, h('label', null, t('sessionMinutesField')), minutes),
        h('div', { class: 'row' }, h('label', null, t('practiceCardsField')), practiceSize),
        voiceStatus,
      ),
    );
  }

  // ---------- Sync between devices ----------

  // Re-draw the home screen or the settings page when another device's progress arrives (other
  // screens keep going: a review Session holds the same progress object, which Sync updates in place).
  if (window.Sync) {
    Sync.onData(() => {
      const parts = routeParts();
      if (!parts.length || parts[0] === 'settings') route();
    });

    // The gear's mark follows the Profile on every screen; the home screen and the settings
    // page update their own reminder in place (followsProfile).
    Sync.onStatus(applyLanguage);
  }

  function syncStatusText(s) {
    switch (s.state) {
      case 'syncing': return t('syncing');
      case 'ok': return t('syncedAt', new Date(s.at).toLocaleTimeString(I18n.locale(), { hour: '2-digit', minute: '2-digit' }));
      case 'wrong-pin': return t('wrongPin');
      case 'locked': return t('locked', s.minutes);
      case 'offline': return t('offline');
      case 'invalid': return s.field === 'pin' ? t('invalidPin') : t('invalidName');
      case 'error': return t('syncError', s.code);
      default: return '';
    }
  }

  function syncSection() {
    if (!window.Sync) return { el: null, off: () => {} };

    const status = h('p', { class: 'sync-status', 'aria-live': 'polite' });
    const name = h('input', {
      name: 'sync-name', type: 'text', class: 'answer', autocomplete: 'username', autocapitalize: 'off',
      spellcheck: 'false', placeholder: t('namePlaceholder'), 'aria-label': t('nameLabel'),
    });
    const pin = h('input', {
      name: 'sync-pin', type: 'password', class: 'answer', inputmode: 'numeric', maxlength: '4',
      autocomplete: 'current-password', placeholder: 'PIN', 'aria-label': t('pinLabel'),
    });
    const connect = () => Sync.connect(name.value, pin.value);
    pin.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); connect(); } });

    const form = h('div', { class: 'sync-form' },
      h('p', { class: 'muted' }, t('syncIntro')),
      h('div', { class: 'row' }, name, pin, h('button', { type: 'button', class: 'primary', onclick: connect }, t('connect'))),
    );
    const profileName = h('b');
    const connected = h('div', null,
      h('p', null, t('profileBefore'), profileName, t('profileAfter')),
      h('div', { class: 'row' },
        h('button', { type: 'button', onclick: () => Sync.syncNow() }, t('syncNow')),
        h('button', { type: 'button', onclick: () => Sync.disconnect() }, t('disconnect')),
      ),
    );

    const update = () => {
      const profile = Sync.profile();
      form.hidden = !!profile;
      connected.hidden = !profile;
      profileName.textContent = profile ? profile.name : '';
      status.textContent = syncStatusText(Sync.status());
    };
    update();
    const off = Sync.onStatus(update);

    const el = h('section', { class: 'panel sync' }, h('h3', null, t('syncTitle')), form, connected, status);
    return { el, off };
  }

  function voiceInfo() {
    if (!Speech.supported) return [h('span', { class: 'warn' }, t('noSpeech'))];
    const v = Speech.voice();
    if (v && Speech.isSpanishSpain()) return [t('voiceName', v.name)];
    const how = t(VOICE_HELP[platform()]);
    if (v) return [h('div', { class: 'warn' }, t('noSpainVoice', v.name, how))];
    return [h('div', { class: 'warn' }, t('noSpanishVoice', how))];
  }

  // Where to add a Spanish (Spain) voice, by platform (the texts are in js/i18n.js).
  const VOICE_HELP = {
    ios: 'voiceHelpIos', android: 'voiceHelpAndroid', windows: 'voiceHelpWindows', mac: 'voiceHelpMac', other: 'voiceHelpOther',
  };

  function platform() {
    const nav = window.navigator;
    const ua = nav.userAgent || '';
    // iPadOS reports itself as a Mac, but has touch.
    if (/iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && nav.maxTouchPoints > 1)) return 'ios';
    if (/Android/i.test(ua)) return 'android';
    if (/Windows/.test(ua)) return 'windows';
    if (/Macintosh|Mac OS X/.test(ua)) return 'mac';
    return 'other';
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
      try { data = JSON.parse(reader.result); } catch { data = null; }
      if (!Store.looksLikeProgress(data)) {
        alert(t('notAProgressFile'));
        return;
      }
      if (!confirm(t('confirmReplace'))) return;
      if (!Store.replace(data)) alert(t('replaceFailed'));
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
    document.title = t('lessonTitle', lesson.n, lesson.title);

    const items = lesson.phrases.map(p =>
      h('li', { class: 'phrase' },
        esLine(p),
        translationEl(p, 'ru'),
        h('div', { class: 'actions' }, playButtons(p)),
      ));
    const dialog = h('ol', { class: 'dialog' }, items);

    // Two playback modes, one at a time:
    // "listen and repeat": Phrase → pause to repeat aloud → next Phrase, once through;
    // "loop": the whole dialogue with short gaps, a pause, and again until stopped.
    const LOOP_GAP_MS = 700;
    const LOOP_PAUSE_MS = 5000;
    let runId = 0;
    let mode = null; // 'repeat' | 'loop' | null
    const status = h('div', { class: 'status', 'aria-live': 'polite' });
    const playBtn = h('button', { class: 'primary', onclick: () => (mode === 'repeat' ? stop() : play('repeat')) }, t('listenAndRepeat'));
    const loopBtn = h('button', { onclick: () => (mode === 'loop' ? stop() : play('loop')) }, t('listenInLoop'));

    function setMode(m) {
      mode = m;
      playBtn.textContent = m === 'repeat' ? t('stop') : t('listenAndRepeat');
      loopBtn.textContent = m === 'loop' ? t('stop') : t('listenInLoop');
    }

    function highlight(i) {
      items.forEach(li => li.classList.remove('playing'));
      if (i == null) return;
      items[i].classList.add('playing');
      items[i].scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }

    async function play(m) {
      const my = ++runId;
      setMode(m);
      for (;;) {
        for (let i = 0; i < lesson.phrases.length; i++) {
          if (my !== runId) return;
          highlight(i);
          status.textContent = t('listenNow');
          const t0 = performance.now();
          await Speech.say(lesson.phrases[i]);
          if (my !== runId) return;
          if (m === 'repeat') {
            status.textContent = t('repeatAloud');
            await sleep(Math.max(1800, (performance.now() - t0) * 1.3));
          } else if (i < lesson.phrases.length - 1) {
            await sleep(LOOP_GAP_MS);
          }
        }
        if (my !== runId) return;
        if (m !== 'loop') break;
        highlight(null);
        status.textContent = t('loopPause');
        await sleep(LOOP_PAUSE_MS); // a stop during the pause is caught at the top of the next round
      }
      highlight(null);
      status.textContent = '';
      setMode(null);
    }

    function stop() {
      runId++;
      Speech.stop();
      highlight(null);
      status.textContent = '';
      setMode(null);
    }

    cleanup = stop;

    const done = st.completedLessons.includes(lesson.n);
    const completion = done
      ? h('p', { class: 'done-msg' }, t('lessonDone'))
      : h('div', null,
          h('p', { class: 'muted' }, t('lessonDoneHint')),
          h('button', {
            class: 'primary',
            onclick: () => { completeLesson(lesson); route(); },
          }, t('markCompleted')));

    const prev = LESSONS[idx - 1], next = LESSONS[idx + 1];

    $app.append(
      h('p', { class: 'muted' }, h('a', { href: '#/' }, t('allLessons'))),
      h('h1', null, t('lessonHeading', lesson.n), h('span', { lang: 'es' }, lesson.title)),
      h('p', { class: 'sub', lang: I18n.lang() }, translation(lesson)),
      h('div', { class: 'player' }, h('div', { class: 'row' }, playBtn, loopBtn), status),
      ...(Speech.supported && !Speech.voice() && !Speech.hasRecordings() ? [h('div', null, voiceInfo())] : []),
      dialog,
      ...(notesOf(lesson) && notesOf(lesson).length
        ? [h('h2', null, t('notes')), h('ul', { class: 'notes', lang: I18n.lang() }, notesOf(lesson).map(n => h('li', null, n)))]
        : []),
      h('h2', null, t('ready')),
      completion,
      h('nav', { class: 'lesson-nav' },
        prev ? h('a', { class: 'btn', href: '#/lesson/' + prev.n }, t('prevLesson', prev.n)) : h('span'),
        next ? h('a', { class: 'btn', href: '#/lesson/' + next.n }, t('nextLesson', next.n)) : h('span'),
      ),
    );
  }

  // ---------- Session, Practice and the Archive run ----------

  // mode: 'session', 'practice' or 'archive'.
  function renderReview(mode) {
    const st = Store.get();
    const practice = mode === 'practice';
    const archiveRun = mode === 'archive';
    // A Session takes the due Cards for a set time; a Practice takes a set number of the
    // not-yet-Learned Cards, due or not; the Archive run takes as many archived Cards at random.
    const queue = archiveRun
      ? randomPick(archivedCards(), st.settings.practiceCards)
      : practice
        ? deckCards().filter(k => !SRS.isLearned(st.cards[k])).sort(practiceOrder).slice(0, st.settings.practiceCards)
        : deckCards().filter(k => SRS.isDue(st.cards[k], Date.now())).sort(queueOrder);
    const title = t({ session: 'reviewTitle', practice: 'practiceTitle', archive: 'archiveTitle' }[mode]);
    document.title = title;
    const untimed = practice || archiveRun;

    if (!queue.length) {
      $app.append(
        h('h1', null, title),
        h('p', null, t({ session: 'nothingToReview', practice: 'nothingToPractise', archive: 'nothingArchived' }[mode])),
        h('a', { class: 'btn', href: '#/' }, t('toHome')),
      );
      return;
    }

    const limitMs = st.settings.sessionMinutes * 60 * 1000;
    const startedAt = Date.now();
    let timeUp = false;
    let reviewed = 0;
    let onKey = null;

    const timerEl = untimed ? null : h('span', { class: 'timer' }, fmtClock(limitMs));
    const leftEl = h('span');
    const stage = h('div');

    const tick = () => {
      const left = Math.max(0, limitMs - (Date.now() - startedAt));
      timerEl.textContent = fmtClock(left);
      if (left === 0 && !timeUp) {
        timeUp = true;
        timerEl.classList.add('over');
        timerEl.textContent = t('timeUp');
      }
    };
    const timer = untimed ? null : setInterval(tick, 1000);
    const keyListener = e => { if (onKey) onKey(e); };
    document.addEventListener('keydown', keyListener);
    cleanup = () => { clearInterval(timer); document.removeEventListener('keydown', keyListener); };

    $app.append(
      h('div', { class: 'session-bar' },
        h('a', { href: '#/' }, t('exit')),
        leftEl,
        timerEl,
      ),
      stage,
    );

    next();

    function updateLeft() {
      leftEl.textContent = t(untimed ? 'leftPractice' : 'leftSession', queue.length, reviewed);
    }

    function next() {
      if (timeUp || !queue.length) return finish();
      updateLeft();
      showCard(queue.shift());
    }

    function showCard(key) {
      const { id, dir } = parseKey(key);
      const p = phraseIndex.get(id).phrase;
      const card = h('div', { class: 'card' }, h('div', { class: 'dir' }, t(DIR_KEY[dir])));
      stage.replaceChildren(card);

      if (dir === 'recog') {
        card.append(
          h('div', { class: 'prompt es', lang: 'es' }, p.es),
          h('div', { class: 'row' }, playButtons(p)),
        );
        const showBtn = h('button', { class: 'primary', onclick: reveal }, t('showAnswer'));
        const controls = h('div', { class: 'controls' },
          h('div', { class: 'row' }, showBtn, dontKnowButton(giveUp)),
          h('div', { class: 'hint' }, t('recallHint'), kbdHint(t('spaceHint'))));
        card.append(controls);
        Speech.say(p);
        showBtn.focus();
        onKey = e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); reveal(); } };

        function reveal() {
          if (!controls.isConnected) return;
          controls.remove();
          card.append(answerBlock(p));
          card.append(gradeBar(key));
        }

        function giveUp() {
          if (!controls.isConnected) return;
          controls.remove();
          card.append(answerBlock(p), dontKnowBar(key));
          Speech.say(p);
        }
      } else {
        card.append(translationEl(p, 'prompt ru'));
        const input = h('input', {
          type: 'text', class: 'answer', lang: 'es', autocomplete: 'off', autocapitalize: 'off',
          spellcheck: 'false', placeholder: t('typePlaceholder'), 'aria-label': t('typeLabel'),
        });
        const accents = h('div', { class: 'accents' },
          Array.from('áéíóúüñ¿¡').map(ch =>
            h('button', { type: 'button', class: 'key', onclick: () => insertAtCursor(input, ch) }, ch)));
        const checkBtn = h('button', { class: 'primary', onclick: check }, t('check'));
        const controls = h('div', { class: 'controls' },
          h('div', { class: 'row' }, checkBtn, dontKnowButton(giveUp)),
          h('div', { class: 'hint' }, kbdHint(t('enterHint'))));
        card.append(input, accents, controls);
        input.focus();
        onKey = e => { if (e.key === 'Enter' && document.activeElement === input) { e.preventDefault(); check(); } };

        function close() {
          if (input.disabled) return false;
          input.disabled = true;
          accents.remove();
          controls.remove();
          return true;
        }

        function check() {
          if (!close()) return;
          card.append(diffBlock(input.value, p.es), answerBlock(p), gradeBar(key));
          Speech.say(p);
        }

        function giveUp() {
          if (!close()) return;
          card.append(answerBlock(p), dontKnowBar(key));
          Speech.say(p);
        }
      }
    }

    function gradeBar(key) {
      const now = Date.now();
      const card = st.cards[key];
      // Guard against a bounced key press: the key that revealed the answer must not also set the Grade.
      const settled = () => Date.now() - now > 300;
      const safeGrade = g => { if (settled()) grade(key, g); };
      const safeArchive = () => { if (settled()) bar.replaceWith(archiveChoice(key, gradeBar)); };
      const bar = h('div', null,
        h('div', { class: 'grades' },
          SRS.GRADES.map((g, i) => {
            const preview = counts(g) ? fmtInterval(SRS.review(card, g, now).interval) : t('scheduleUnchanged');
            return h('button', { class: g, onclick: () => safeGrade(g) },
              t(GRADE_KEY[g]), h('small', null, kbdHint((i + 1) + ' · '), preview));
          }),
          h('button', { class: 'archive', onclick: safeArchive },
            t('gradeArchive'), h('small', null, kbdHint((SRS.GRADES.length + 1) + ' · '), t('archivePreview')))),
        h('div', { class: 'hint' }, t('gradeHint'), kbdHint(t('gradeKeysHint'))),
      );
      onKey = e => {
        const i = ['1', '2', '3'].indexOf(e.key);
        if (i >= 0) { e.preventDefault(); safeGrade(SRS.GRADES[i]); }
        else if (e.key === '4') { e.preventDefault(); safeArchive(); }
      };
      setTimeout(() => { const b = bar.querySelector('.good'); if (b) b.focus(); }, 0);
      return bar;
    }

    // "Всё, запомнил": which Cards go to the Archive — this one, or both Cards of the Phrase
    // (offered while the other one is still in the Deck). "Cancel" brings back what was there.
    function archiveChoice(key, back) {
      const shownAt = Date.now();
      const settled = () => Date.now() - shownAt > 300;
      const { id, dir } = parseKey(key);
      const otherKey = cardKey(id, DIRS.find(d => d !== dir));
      const other = st.cards[otherKey];
      const offerBoth = !!other && !SRS.isArchived(other);
      const pick = keys => { if (settled()) archive(keys); };
      const cancel = () => { if (settled()) bar.replaceWith(back(key)); };
      const oneBtn = h('button', { class: 'primary', onclick: () => pick([key]) }, t('archiveOne'));
      const bar = h('div', { class: 'archive-choice' },
        h('p', null, t('archiveQuestion')),
        h('div', { class: 'row' },
          oneBtn,
          offerBoth ? h('button', { onclick: () => pick([key, otherKey]) }, t('archiveBoth')) : null,
          h('button', { onclick: cancel }, t('cancel')),
        ),
        h('div', { class: 'hint' }, kbdHint(t(offerBoth ? 'archiveKeysHint' : 'archiveOneKeyHint'))),
      );
      onKey = e => {
        if (e.key === '1' || (e.key === 'Enter' && document.activeElement === oneBtn)) { e.preventDefault(); pick([key]); }
        else if (e.key === '2' && offerBoth) { e.preventDefault(); pick([key, otherKey]); }
        else if (e.key === 'Escape') { e.preventDefault(); cancel(); }
      };
      setTimeout(() => oneBtn.focus(), 0);
      return bar;
    }

    // Moves the Cards to the Archive. They also leave this run's queue (the other Card of the
    // Phrase, or this one if "again" had put it back).
    function archive(keys) {
      onKey = null;
      const now = Date.now();
      for (const k of keys) {
        st.cards[k] = SRS.archive(st.cards[k], now);
        for (let i = queue.length - 1; i >= 0; i--) if (queue[i] === k) queue.splice(i, 1);
      }
      saveOrWarn();
      reviewed++;
      next();
    }

    // "Don't know": the answer is shown and the Grade is "again" right away; one button moves on.
    function dontKnowButton(onclick) {
      return h('button', { class: 'dont-know', onclick }, t('dontKnow'));
    }

    function dontKnowBar(key) {
      record(key, 'again');
      const shownAt = Date.now();
      const nextBtn = h('button', { class: 'primary', onclick: () => next() }, t('next'));
      const bar = h('div', { class: 'controls' },
        h('p', { class: 'verdict different' }, t({ session: 'againSession', practice: 'againPractice', archive: 'againArchive' }[mode])),
        nextBtn,
        h('div', { class: 'hint' }, kbdHint(t('nextHint'))),
      );
      onKey = e => {
        if ((e.key === 'Enter' || e.key === ' ') && Date.now() - shownAt > 300) { e.preventDefault(); next(); }
      };
      setTimeout(() => nextBtn.focus(), 0);
      return bar;
    }

    // In a Practice only "again" changes the schedule: SM-2 is not meant for answers given before
    // the Card is due, so an early "good" must not grow the interval. In the Archive run every
    // Grade counts: it returns the Card to the Deck.
    function counts(g) {
      return !practice || g === 'again';
    }

    function record(key, g) {
      onKey = null;
      if (counts(g)) {
        st.cards[key] = SRS.review(st.cards[key], g, Date.now());
        saveOrWarn();
      }
      reviewed++;
      // "again": the Card comes back once more in this same Session or Practice.
      if (g === 'again') queue.push(key);
      updateLeft();
    }

    function grade(key, g) {
      record(key, g);
      next();
    }

    function finish() {
      cleanup();
      cleanup = null;
      onKey = null;
      Speech.stop();
      if (practice) {
        $app.replaceChildren(
          h('h1', null, '¡Muy bien!'),
          h('p', null, t('practiceOver', reviewed)),
          h('div', { class: 'row' },
            h('a', { class: 'btn', href: '#/' }, t('toHome')),
            h('button', { class: 'primary', onclick: route }, t('anotherPractice')),
          ),
        );
        return;
      }
      if (archiveRun) {
        $app.replaceChildren(
          h('h1', null, '¡Muy bien!'),
          h('p', null, t('archiveOver', reviewed)),
          h('div', { class: 'row' },
            h('a', { class: 'btn', href: '#/' }, t('toHome')),
            archivedCards().length ? h('button', { class: 'primary', onclick: route }, t('anotherArchive')) : null,
          ),
        );
        return;
      }
      const left = stats(Date.now()).due;
      $app.replaceChildren(
        h('h1', null, '¡Muy bien!'),
        h('p', null, t('sessionOver', reviewed)),
        h('p', { class: 'muted' }, left ? t('moreDue', left) : t('allReviewed')),
        h('div', { class: 'row' },
          h('a', { class: 'btn', href: '#/' }, t('toHome')),
          left ? h('button', { class: 'primary', onclick: route }, t('anotherSession')) : null,
        ),
      );
    }
  }

  // Keyboard shortcuts are only mentioned where there is a keyboard (hidden on touch screens by CSS).
  function kbdHint(text) {
    return h('span', { class: 'kbd-hint' }, text);
  }

  function answerBlock(p) {
    return h('div', { class: 'answer-block' },
      h('div', { class: 'row' }, esLine(p), playButtons(p)),
      translationEl(p, 'ru'),
    );
  }

  function diffBlock(typed, correct) {
    const verdict = Diff.compare(typed, correct);
    const text = t({ exact: 'verdictExact', almost: 'verdictAlmost', different: 'verdictDifferent', empty: 'verdictEmpty' }[verdict]);
    const block = h('div', null, h('div', { class: 'verdict ' + verdict }, text));
    if (verdict === 'almost' || verdict === 'different') {
      const ops = Diff.diffChars(typed.trim().replace(/\s+/g, ' '), correct);
      block.append(
        h('div', { class: 'diff', lang: 'es' }, ops.map(o => o.type === 'same' ? o.text : h('span', { class: o.type }, o.text))),
        h('div', { class: 'hint' }, t('diffHint')),
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
