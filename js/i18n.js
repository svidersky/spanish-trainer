// Interface language: the learner's own language, in which the UI, translations, notes and
// Transcriptions are shown. Russian is the default; English is the alternative.
// The choice is a setting (settings.lang), so Sync carries it to the learner's other devices.
(function (root) {
  'use strict';

  const LANGS = ['ru', 'en'];
  const DEFAULT = 'ru';
  // Each language's name is written in that language, so anyone can find their own.
  const NAMES = { ru: 'Русский', en: 'English' };
  // Locale for dates, times and plural rules.
  const LOCALE = { ru: 'ru-RU', en: 'en-GB' };

  // Plural forms by Intl.PluralRules category ('one', 'few', 'many', 'other').
  const DAYS = {
    ru: { one: 'день', few: 'дня', many: 'дней', other: 'дня' },
    en: { one: 'day', other: 'days' },
  };

  const strings = {
    ru: {
      appTitle: 'Испанский тренажёр',
      langLabel: 'Язык интерфейса',
      settingsLabel: 'Настройки',
      settingsAttention: 'Настройки: прогресс не сохранён в файл',
      dirRecog: 'Узнавание · ES → RU',
      dirProduce: 'Воспроизведение · RU → ES',
      gradeAgain: 'Забыл',
      gradeHard: 'Трудно',
      gradeGood: 'Нормально',
      gradeEasy: 'Легко',
      listen: 'Слушать',
      slow: 'Медленно',
      listenSlow: 'Слушать медленно',
      months: m => '≈' + m + ' мес',
      years: y => '≈' + y + ' г',
      saveFailed: 'Браузер не дал сохранить прогресс. Сделайте экспорт в файл, чтобы ничего не потерять.',

      // home
      homeTitle: 'Учим испанский',
      homeSub: 'Уроки в стиле Assimil и карточки с интервальным повторением.',
      statDue: 'к повторению',
      statLearned: 'выучено',
      statTotal: 'карточек в колоде',
      deckEmpty: 'Колода пока пуста. Пройдите первый урок и отметьте его пройденным — его фразы появятся здесь.',
      allReviewedToday: 'На сегодня всё повторено. ¡Muy bien!',
      startSession: min => `Начать сессию · ${min} мин`,
      startPractice: n => `Потренировать невыученные · ${n}`,
      completedBadge: 'пройден',
      lessons: 'Уроки',
      progressAndSettings: 'Прогресс и настройки',
      sessionMinutesLabel: 'Длительность сессии в минутах',
      practiceCardsLabel: 'Число карточек в тренировке',
      neverExported: 'Прогресс ещё ни разу не сохранялся в файл. Если очистить данные браузера, он пропадёт.',
      exportedAgo: days => `Последнее сохранение в файл было ${days} назад.`,
      saveCopyLink: 'Сохранить копию →',
      recordingsInfo: 'Фразы озвучены заранее записанными голосами. Для новых фраз без записи — голос браузера. ',
      exportButton: '💾 Сохранить прогресс в файл',
      importButton: '📂 Загрузить из файла',
      lastExport: date => 'Последнее сохранение: ' + date,
      fileIsExtraCopy: 'Файл — дополнительная копия: прогресс уже синхронизируется.',
      onlyInBrowser: 'Прогресс хранится только в этом браузере.',
      sessionMinutesField: 'Длительность сессии, минут:',
      practiceCardsField: 'Карточек в тренировке:',
      notAProgressFile: 'Это не похоже на файл прогресса тренажёра.',
      confirmReplace: 'Заменить текущий прогресс данными из файла?',
      replaceFailed: 'Браузер не дал сохранить прогресс.',

      // Sync
      syncing: 'Синхронизация…',
      syncedAt: time => 'Синхронизировано в ' + time + '.',
      wrongPin: 'Неверный PIN для этого имени.',
      locked: min => `Слишком много попыток с неверным PIN. Попробуйте через ${min} мин.`,
      offline: 'Нет связи с сервером. Синхронизируем, когда связь появится.',
      invalidPin: 'PIN — это 4 цифры.',
      invalidName: 'Имя: от 2 до 32 букв или цифр (можно «-» и «_»).',
      syncError: code => `Не удалось синхронизировать (ошибка ${code}).`,
      namePlaceholder: 'Имя',
      nameLabel: 'Имя профиля',
      pinLabel: 'PIN из 4 цифр',
      syncIntro: 'Введите имя и PIN из 4 цифр — одинаковые на всех ваших устройствах. Если такого имени ещё нет, оно будет создано с этим PIN.',
      connect: 'Подключить',
      profileBefore: 'Профиль ',
      profileAfter: ': прогресс общий для всех устройств с этим именем и PIN.',
      syncNow: 'Синхронизировать сейчас',
      disconnect: 'Отключить на этом устройстве',
      syncTitle: 'Синхронизация между устройствами',

      // voice
      noSpeech: 'Этот браузер не умеет озвучивать текст. Откройте тренажёр в Microsoft Edge или Chrome.',
      voiceName: name => 'Голос: ' + name,
      noSpainVoice: (name, how) => `Голос для Испании не найден, использую «${name}». ${how}`,
      noSpanishVoice: how => 'Испанский голос не найден. ' + how,
      // Where to add a Spanish (Spain) voice. Menu paths follow the vendors' support pages:
      // Apple iPhone User Guide "Hear iPhone speak the screen", Google Android Accessibility Help
      // "Text-to-speech output", Microsoft Support "Download languages and voices for Immersive Reader".
      voiceHelpIos: 'На iPhone/iPad: Настройки → Универсальный доступ → чтение вслух (Read & Speak) → Голоса → Español → España. Звука не будет, если включён беззвучный режим.',
      voiceHelpAndroid: 'На Android: Настройки → Специальные возможности → Синтез речи (Text-to-speech output) → установить голосовые данные (Install voice data) → испанский (Испания).',
      voiceHelpWindows: 'В Windows: Параметры → Время и язык → Язык и регион → Добавить язык → Español (España) с отметкой «Преобразование текста в речь». Или откройте тренажёр в Microsoft Edge — там есть онлайн-голоса.',
      voiceHelpMac: 'На Mac: добавьте испанский голос (Испания) в Системных настройках, раздел «Универсальный доступ». Или откройте тренажёр в Chrome.',
      voiceHelpOther: 'Установите испанский голос (Испания) в настройках синтеза речи вашей системы или откройте тренажёр в Microsoft Edge или Chrome.',

      // Lesson
      lessonTitle: (n, title) => `Урок ${n}: ${title}`,
      lessonHeading: n => `Урок ${n}. `,
      listenAndRepeat: '▶ Слушать и повторять',
      stop: '■ Остановить',
      listenNow: 'Слушайте…',
      repeatAloud: 'Повторите вслух…',
      lessonDone: '✓ Урок пройден — его фразы в колоде.',
      lessonDoneHint: 'Когда прослушаете и повторите диалог несколько раз, отметьте урок пройденным: его фразы попадут в колоду карточек.',
      markCompleted: 'Отметить урок пройденным',
      allLessons: '← Все уроки',
      notes: 'Пояснения',
      ready: 'Готово?',
      prevLesson: n => '← Урок ' + n,
      nextLesson: n => 'Урок ' + n + ' →',

      // Session and Practice
      practiceTitle: 'Тренировка',
      reviewTitle: 'Повторение',
      nothingToPractise: 'Тренировать нечего: все карточки выучены.',
      nothingToReview: 'Сейчас повторять нечего.',
      toHome: '← На главную',
      timeUp: 'время вышло — доделайте карточку',
      exit: '← Выйти',
      leftPractice: (left, done) => `осталось ${left} · пройдено ${done}`,
      leftSession: (left, done) => `осталось ${left} · повторено ${done}`,
      showAnswer: 'Показать ответ',
      recallHint: 'Вспомните перевод в уме или вслух.',
      spaceHint: ' Пробел — показать ответ.',
      typePlaceholder: 'Напишите по-испански…',
      typeLabel: 'Ваш ответ по-испански',
      check: 'Проверить',
      enterHint: 'Enter — проверить.',
      scheduleUnchanged: 'срок не меняется',
      gradeHint: 'Оцените себя честно.',
      gradeKeysHint: ' Клавиши 1–4.',
      dontKnow: 'Не знаю',
      next: 'Дальше',
      againPractice: 'Оценка: «Забыл» — карточка вернётся в этой тренировке.',
      againSession: 'Оценка: «Забыл» — карточка вернётся в этой сессии.',
      nextHint: 'Enter или пробел — дальше.',
      practiceOver: n => `Тренировка окончена. Пройдено карточек: ${n}.`,
      anotherPractice: 'Ещё одна тренировка',
      sessionOver: n => `Сессия окончена. Повторено карточек: ${n}.`,
      moreDue: n => `Ещё к повторению: ${n}.`,
      allReviewed: 'На сегодня всё повторено.',
      anotherSession: 'Ещё одна сессия',
      verdictExact: 'Точно!',
      verdictAlmost: 'Почти: отличаются только ударения, ñ, заглавные буквы или знаки.',
      verdictDifferent: 'Есть отличия:',
      verdictEmpty: 'Ответ пустой.',
      diffHint: 'Зачёркнуто — лишнее у вас, подчёркнуто — чего не хватает.',
    },

    en: {
      appTitle: 'Spanish Trainer',
      langLabel: 'Interface language',
      settingsLabel: 'Settings',
      settingsAttention: 'Settings: progress not saved to a file',
      dirRecog: 'Recognition · ES → EN',
      dirProduce: 'Production · EN → ES',
      gradeAgain: 'Again',
      gradeHard: 'Hard',
      gradeGood: 'Good',
      gradeEasy: 'Easy',
      listen: 'Listen',
      slow: 'Slowly',
      listenSlow: 'Listen slowly',
      months: m => '≈' + m + ' mo',
      years: y => '≈' + y + ' yr',
      saveFailed: 'The browser did not let us save your progress. Export it to a file so that nothing is lost.',

      homeTitle: 'Learn Spanish',
      homeSub: 'Assimil-style lessons and spaced-repetition flashcards.',
      statDue: 'due',
      statLearned: 'learned',
      statTotal: 'cards in the deck',
      deckEmpty: 'The deck is empty for now. Go through the first lesson and mark it completed: its phrases will appear here.',
      allReviewedToday: 'Everything is reviewed for today. ¡Muy bien!',
      startSession: min => `Start a session · ${min} min`,
      startPractice: n => `Practise cards not learned yet · ${n}`,
      completedBadge: 'completed',
      lessons: 'Lessons',
      progressAndSettings: 'Progress and settings',
      sessionMinutesLabel: 'Session length in minutes',
      practiceCardsLabel: 'Number of cards in a practice',
      neverExported: 'Your progress has never been saved to a file. If the browser data is cleared, it will be lost.',
      exportedAgo: days => `Last saved to a file ${days} ago.`,
      saveCopyLink: 'Save a copy →',
      recordingsInfo: 'Phrases are voiced by pre-made recordings. New phrases without a recording use the browser voice. ',
      exportButton: '💾 Save progress to a file',
      importButton: '📂 Load from a file',
      lastExport: date => 'Last saved: ' + date,
      fileIsExtraCopy: 'The file is an extra copy: your progress is already synced.',
      onlyInBrowser: 'Your progress is kept only in this browser.',
      sessionMinutesField: 'Session length, minutes:',
      practiceCardsField: 'Cards in a practice:',
      notAProgressFile: 'This does not look like a trainer progress file.',
      confirmReplace: 'Replace your current progress with the data from the file?',
      replaceFailed: 'The browser did not let us save your progress.',

      syncing: 'Syncing…',
      syncedAt: time => 'Synced at ' + time + '.',
      wrongPin: 'Wrong PIN for this name.',
      locked: min => `Too many attempts with a wrong PIN. Try again in ${min} min.`,
      offline: 'No connection to the server. We will sync once the connection is back.',
      invalidPin: 'The PIN is 4 digits.',
      invalidName: 'Name: 2 to 32 letters or digits («-» and «_» allowed).',
      syncError: code => `Could not sync (error ${code}).`,
      namePlaceholder: 'Name',
      nameLabel: 'Profile name',
      pinLabel: '4-digit PIN',
      syncIntro: 'Enter a name and a 4-digit PIN, the same on all your devices. If the name does not exist yet, it will be created with this PIN.',
      connect: 'Connect',
      profileBefore: 'Profile ',
      profileAfter: ': progress is shared by all devices with this name and PIN.',
      syncNow: 'Sync now',
      disconnect: 'Disconnect this device',
      syncTitle: 'Sync between devices',

      noSpeech: 'This browser cannot speak text. Open the trainer in Microsoft Edge or Chrome.',
      voiceName: name => 'Voice: ' + name,
      noSpainVoice: (name, how) => `No voice for Spain found, using “${name}”. ${how}`,
      noSpanishVoice: how => 'No Spanish voice found. ' + how,
      voiceHelpIos: 'On iPhone/iPad: Settings → Accessibility → Read & Speak → Voices → Español → España. There is no sound while silent mode is on.',
      voiceHelpAndroid: 'On Android: Settings → Accessibility → Text-to-speech output → Install voice data → Spanish (Spain).',
      voiceHelpWindows: 'On Windows: Settings → Time & language → Language & region → Add a language → Español (España) with “Text-to-speech” ticked. Or open the trainer in Microsoft Edge, which has online voices.',
      voiceHelpMac: 'On a Mac: add a Spanish (Spain) voice in System Settings, under Accessibility. Or open the trainer in Chrome.',
      voiceHelpOther: 'Install a Spanish (Spain) voice in your system’s text-to-speech settings, or open the trainer in Microsoft Edge or Chrome.',

      lessonTitle: (n, title) => `Lesson ${n}: ${title}`,
      lessonHeading: n => `Lesson ${n}. `,
      listenAndRepeat: '▶ Listen and repeat',
      stop: '■ Stop',
      listenNow: 'Listen…',
      repeatAloud: 'Repeat aloud…',
      lessonDone: '✓ Lesson completed: its phrases are in the deck.',
      lessonDoneHint: 'Once you have listened to the dialogue and repeated it a few times, mark the lesson completed: its phrases will go into the flashcard deck.',
      markCompleted: 'Mark the lesson completed',
      allLessons: '← All lessons',
      notes: 'Notes',
      ready: 'Done?',
      prevLesson: n => '← Lesson ' + n,
      nextLesson: n => 'Lesson ' + n + ' →',

      practiceTitle: 'Practice',
      reviewTitle: 'Review',
      nothingToPractise: 'Nothing to practise: every card is learned.',
      nothingToReview: 'Nothing to review right now.',
      toHome: '← Home',
      timeUp: 'time is up — finish this card',
      exit: '← Exit',
      leftPractice: (left, done) => `${left} left · ${done} done`,
      leftSession: (left, done) => `${left} left · ${done} reviewed`,
      showAnswer: 'Show answer',
      recallHint: 'Recall the meaning silently or aloud.',
      spaceHint: ' Space shows the answer.',
      typePlaceholder: 'Type it in Spanish…',
      typeLabel: 'Your answer in Spanish',
      check: 'Check',
      enterHint: 'Enter checks.',
      scheduleUnchanged: 'schedule unchanged',
      gradeHint: 'Grade yourself honestly.',
      gradeKeysHint: ' Keys 1–4.',
      dontKnow: 'I don’t know',
      next: 'Next',
      againPractice: 'Grade: “Again”. The card will come back in this practice.',
      againSession: 'Grade: “Again”. The card will come back in this session.',
      nextHint: 'Enter or Space moves on.',
      practiceOver: n => `Practice over. Cards done: ${n}.`,
      anotherPractice: 'Another practice',
      sessionOver: n => `Session over. Cards reviewed: ${n}.`,
      moreDue: n => `Still due: ${n}.`,
      allReviewed: 'Everything is reviewed for today.',
      anotherSession: 'Another session',
      verdictExact: 'Exactly!',
      verdictAlmost: 'Almost: only accents, ñ, capitals or punctuation differ.',
      verdictDifferent: 'There are differences:',
      verdictEmpty: 'The answer is empty.',
      diffHint: 'Struck out: extra in yours; underlined: what is missing.',
    },
  };

  function lang() {
    const l = root.Store && root.Store.get().settings.lang;
    return LANGS.includes(l) ? l : DEFAULT;
  }

  // The string for key in the current language; a function entry is called with args.
  function t(key, ...args) {
    const v = strings[lang()][key];
    return typeof v === 'function' ? v(...args) : v;
  }

  // "3 дня" / "3 days".
  function days(n) {
    const l = lang();
    const forms = DAYS[l];
    const cat = new Intl.PluralRules(LOCALE[l]).select(n);
    return n + ' ' + (forms[cat] || forms.other);
  }

  root.I18n = { LANGS, DEFAULT, NAMES, strings, lang, t, days, locale: () => LOCALE[lang()] };
})(window);
