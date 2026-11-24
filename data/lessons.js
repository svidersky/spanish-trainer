// Assimil-style Lessons. Spanish is the Spain variant (es-ES).
// Lesson titles and phrases are Spanish; translations, notes and Transcriptions are
// learner-facing and come in each interface language: Russian (ru, tr, notes) and
// English (en, trEn, notesEn).
//
// Phrase format:
//   id — unique; never change it once the Lesson has been Completed (progress is keyed on it)
//   speaker — 'm' or 'f': which of the two dialogue roles says the Phrase (picks the Recording voice)
//   es — Spanish text
//   tr — Transcription in Russian letters; put an apostrophe RIGHT AFTER the stressed vowel: "о'ла" → «о́ла»
//   ru — Russian translation
//   en — English translation
//   trEn — English Transcription: Latin letters, syllables joined by hyphens, the stressed
//          syllable in capitals: "Muy bien, gracias." → "mwee byehn, GRAH-thyahs"
//
// Transcription conventions:
//   c (before e, i) and z sound like English "th" in "think" in Spain — written «с».
//   ll and y — «й»; j and g (before e, i) — «х»; h is silent; v = b — «б»; ñ — «нь».
//   Consonant + e is written «э»: "de" → «дэ».
//   In English: c/z → "th", ll/y → "y", j/g → "h", ñ → "ny", v → "b"; a → "ah", e → "eh",
//   i → "ee", o → "oh", u → "oo".

window.LESSONS = [
  {
    n: 1,
    title: 'Hola',
    ru: 'Знакомство',
    en: 'Introductions',
    phrases: [
      { id: 'l01-01', speaker: 'm', es: '¡Hola! ¿Qué tal?', tr: "о'ла! кэ таль?", ru: 'Привет! Как дела?', en: 'Hi! How are you?', trEn: 'OH-lah! keh tahl?' },
      { id: 'l01-02', speaker: 'f', es: 'Muy bien, gracias. ¿Y tú?', tr: "муй бьен, гра'сьяс. и ту?", ru: 'Очень хорошо, спасибо. А ты?', en: 'Very well, thanks. And you?', trEn: 'mwee byehn, GRAH-thyahs. ee too?' },
      { id: 'l01-03', speaker: 'm', es: 'Bien también.', tr: "бьен тамбье'н", ru: 'Тоже хорошо.', en: 'Fine too.', trEn: 'byehn tahm-BYEHN' },
      { id: 'l01-04', speaker: 'm', es: '¿Cómo te llamas?', tr: "ко'мо тэ йа'мас?", ru: 'Как тебя зовут?', en: 'What’s your name?', trEn: 'KOH-moh teh YAH-mahs?' },
      { id: 'l01-05', speaker: 'f', es: 'Me llamo Ana. ¿Y tú?', tr: "мэ йа'мо а'на. и ту?", ru: 'Меня зовут Ана. А тебя?', en: 'My name is Ana. And yours?', trEn: 'meh YAH-moh AH-nah. ee too?' },
      { id: 'l01-06', speaker: 'm', es: 'Me llamo Pablo. Encantado.', tr: "мэ йа'мо па'бло. энканта'до", ru: 'Меня зовут Пабло. Очень приятно.', en: 'My name is Pablo. Nice to meet you.', trEn: 'meh YAH-moh PAH-bloh. ehn-kahn-TAH-doh' },
      { id: 'l01-07', speaker: 'f', es: 'Encantada.', tr: "энканта'да", ru: 'Очень приятно (говорит женщина).', en: 'Nice to meet you (said by a woman).', trEn: 'ehn-kahn-TAH-dah' },
      { id: 'l01-08', speaker: 'm', es: '¡Hasta luego!', tr: "а'ста луэ'го!", ru: 'До встречи!', en: 'See you later!', trEn: 'AHS-tah LWEH-goh!' },
    ],
    notes: [
      'Буква h в испанском никогда не читается: hola — «ола», hasta — «аста».',
      'll в современном испанском звучит почти как «й»: llamo — «йамо».',
      'Encantado говорит мужчина, encantada — женщина.',
      'Вопрос и восклицание отмечаются и в начале, перевёрнутым знаком: ¿…? и ¡…!',
    ],
    notesEn: [
      'The letter h is never pronounced in Spanish: hola sounds like “ola”, hasta like “asta”.',
      'In modern Spanish ll sounds almost like the English y: llamo is “YAH-moh”.',
      'A man says encantado, a woman says encantada.',
      'Questions and exclamations are marked at the start too, with an upside-down sign: ¿…? and ¡…!',
    ],
  },
  {
    n: 2,
    title: '¿De dónde eres?',
    ru: 'Откуда ты?',
    en: 'Where are you from?',
    phrases: [
      { id: 'l02-01', speaker: 'f', es: '¿De dónde eres?', tr: "дэ до'ндэ э'рэс?", ru: 'Откуда ты?', en: 'Where are you from?', trEn: 'deh DOHN-deh EH-rehs?' },
      { id: 'l02-02', speaker: 'm', es: 'Soy de Rusia.', tr: "сой дэ ру'сья", ru: 'Я из России.', en: 'I’m from Russia.', trEn: 'soy deh ROO-syah' },
      { id: 'l02-03', speaker: 'm', es: 'Y tú, ¿de dónde eres?', tr: "и ту, дэ до'ндэ э'рэс?", ru: 'А ты откуда?', en: 'And you, where are you from?', trEn: 'ee too, deh DOHN-deh EH-rehs?' },
      { id: 'l02-04', speaker: 'f', es: 'Soy de Madrid, pero vivo en Barcelona.', tr: "сой дэ мадри'д, пэ'ро би'бо эн барсэло'на", ru: 'Я из Мадрида, но живу в Барселоне.', en: 'I’m from Madrid, but I live in Barcelona.', trEn: 'soy deh mah-DREED, PEH-roh BEE-boh ehn bahr-theh-LOH-nah' },
      { id: 'l02-05', speaker: 'f', es: '¿Hablas español?', tr: "а'блас эспаньо'ль?", ru: 'Ты говоришь по-испански?', en: 'Do you speak Spanish?', trEn: 'AH-blahs ehs-pah-NYOHL?' },
      { id: 'l02-06', speaker: 'm', es: 'Hablo un poco.', tr: "а'бло ун по'ко", ru: 'Я немного говорю.', en: 'I speak a little.', trEn: 'AH-bloh oon POH-koh' },
      { id: 'l02-07', speaker: 'f', es: '¡Hablas muy bien!', tr: "а'блас муй бьен!", ru: 'Ты очень хорошо говоришь!', en: 'You speak very well!', trEn: 'AH-blahs mwee byehn!' },
    ],
    notes: [
      'Soy — «я есть» (глагол ser): так говорят о происхождении, профессии, характере.',
      'v читается как «б»: vivo — «бибо».',
      'ñ — это «нь»: español — «эспаньоль».',
      'Местоимение «я» обычно опускают: hablo — уже «я говорю».',
    ],
    notesEn: [
      'Soy means “I am” (the verb ser): it is used for where you come from, your job, your character.',
      'v is pronounced like b: vivo is “BEE-boh”.',
      'ñ sounds like “ny” in canyon: español is “ehs-pah-NYOHL”.',
      'The word for “I” is usually left out: hablo already means “I speak”.',
    ],
  },
  {
    n: 3,
    title: 'En el café',
    ru: 'В кафе',
    en: 'At the café',
    phrases: [
      { id: 'l03-01', speaker: 'm', es: '¡Buenos días!', tr: "буэ'нос ди'ас!", ru: 'Доброе утро! / Добрый день!', en: 'Good morning!', trEn: 'BWEH-nohs DEE-ahs!' },
      { id: 'l03-02', speaker: 'm', es: 'Un café con leche, por favor.', tr: "ун кафэ' кон лэ'чэ, пор фабо'р", ru: 'Кофе с молоком, пожалуйста.', en: 'A coffee with milk, please.', trEn: 'oon kah-FEH kohn LEH-cheh, pohr fah-BOHR' },
      { id: 'l03-03', speaker: 'f', es: '¿Algo más?', tr: "а'льго мас?", ru: 'Что-нибудь ещё?', en: 'Anything else?', trEn: 'AHL-goh mahs?' },
      { id: 'l03-04', speaker: 'm', es: 'Sí, un agua sin gas.', tr: "си, ун а'гуа син гас", ru: 'Да, воду без газа.', en: 'Yes, a still water.', trEn: 'see, oon AH-gwah seen gahs' },
      { id: 'l03-05', speaker: 'm', es: '¿Cuánto es?', tr: "куа'нто эс?", ru: 'Сколько с меня?', en: 'How much is it?', trEn: 'KWAHN-toh ehs?' },
      { id: 'l03-06', speaker: 'f', es: 'Son tres euros.', tr: "сон трэс э'урос", ru: 'Три евро.', en: 'That’s three euros.', trEn: 'sohn trehs EW-rohs' },
      { id: 'l03-07', speaker: 'm', es: 'Aquí tiene.', tr: "аки' тье'нэ", ru: 'Вот, держите.', en: 'Here you are.', trEn: 'ah-KEE TYEH-neh' },
      { id: 'l03-08', speaker: 'm', es: '¡Gracias, adiós!', tr: "гра'сьяс, адьо'с!", ru: 'Спасибо, до свидания!', en: 'Thank you, goodbye!', trEn: 'GRAH-thyahs, ah-DYOHS!' },
    ],
    notes: [
      'Buenos días говорят до обеда (примерно до 14:00), потом — buenas tardes.',
      'Agua — женского рода, но перед ударным «а» ставят un и el: un agua, el agua.',
      'ch читается как «ч»: leche — «лэчэ».',
      'Aquí tiene — вежливое «вот, пожалуйста», когда что-то протягиваешь.',
    ],
    notesEn: [
      'Buenos días is said until lunch (roughly until 2 p.m.), after that buenas tardes.',
      'Agua is feminine, but before a stressed “a” it takes un and el: un agua, el agua.',
      'ch is pronounced as in “church”: leche is “LEH-cheh”.',
      'Aquí tiene is a polite “here you are” when you hand something over.',
    ],
  },
  {
    n: 4,
    title: '¿Dónde está?',
    ru: 'Где находится?',
    en: 'Where is it?',
    phrases: [
      { id: 'l04-01', speaker: 'm', es: 'Perdone, ¿dónde está el baño?', tr: "пэрдо'нэ, до'ндэ эста' эль ба'ньо?", ru: 'Извините, где туалет?', en: 'Excuse me, where is the toilet?', trEn: 'pehr-DOH-neh, DOHN-deh ehs-TAH ehl BAH-nyoh?' },
      { id: 'l04-02', speaker: 'f', es: 'Está allí, a la derecha.', tr: "эста' айи', а ла дэрэ'ча", ru: 'Там, справа.', en: 'It’s over there, on the right.', trEn: 'ehs-TAH ah-YEE, ah lah deh-REH-chah' },
      { id: 'l04-03', speaker: 'm', es: '¿Y la estación de metro?', tr: "и ла эстасьо'н дэ мэ'тро?", ru: 'А станция метро?', en: 'And the metro station?', trEn: 'ee lah ehs-tah-THYOHN deh MEH-troh?' },
      { id: 'l04-04', speaker: 'f', es: 'Está cerca. Todo recto y a la izquierda.', tr: "эста' сэ'рка. то'до рэ'кто и а ла искье'рда", ru: 'Рядом. Прямо и налево.', en: 'It’s close. Straight on and then left.', trEn: 'ehs-TAH THEHR-kah. TOH-doh REHK-toh ee ah lah eeth-KYEHR-dah' },
      { id: 'l04-05', speaker: 'm', es: '¿Está lejos?', tr: "эста' лэ'хос?", ru: 'Это далеко?', en: 'Is it far?', trEn: 'ehs-TAH LEH-hohs?' },
      { id: 'l04-06', speaker: 'f', es: 'No, está a cinco minutos.', tr: "но, эста' а си'нко мину'тос", ru: 'Нет, в пяти минутах.', en: 'No, it’s five minutes away.', trEn: 'noh, ehs-TAH ah THEEN-koh mee-NOO-tohs' },
      { id: 'l04-07', speaker: 'm', es: 'Muchas gracias.', tr: "му'час гра'сьяс", ru: 'Большое спасибо.', en: 'Thank you very much.', trEn: 'MOO-chahs GRAH-thyahs' },
      { id: 'l04-08', speaker: 'f', es: 'De nada.', tr: "дэ на'да", ru: 'Не за что.', en: 'You’re welcome.', trEn: 'deh NAH-dah' },
    ],
    notes: [
      'Está (глагол estar) — «находится». Для места всегда estar, а не ser.',
      'j читается как «х»: lejos — «лэхос».',
      'r в начале слова раскатистое, как «рр»: recto.',
      'Perdone — вежливое «извините» незнакомому человеку.',
    ],
    notesEn: [
      'Está (the verb estar) means “is located”. For places it is always estar, not ser.',
      'j sounds like a rough h, as in Scottish “loch”: lejos is “LEH-hohs”.',
      'r at the start of a word is strongly rolled, like “rr”: recto.',
      'Perdone is a polite “excuse me” to a stranger.',
    ],
  },
  {
    n: 5,
    title: 'Los números',
    ru: 'Числа и время',
    en: 'Numbers and time',
    phrases: [
      { id: 'l05-01', speaker: 'f', es: 'Uno, dos, tres, cuatro, cinco.', tr: "у'но, дос, трэс, куа'тро, си'нко", ru: 'Один, два, три, четыре, пять.', en: 'One, two, three, four, five.', trEn: 'OO-noh, dohs, trehs, KWAH-troh, THEEN-koh' },
      { id: 'l05-02', speaker: 'm', es: 'Seis, siete, ocho, nueve, diez.', tr: "сэйс, сье'тэ, о'чо, нуэ'бэ, дьес", ru: 'Шесть, семь, восемь, девять, десять.', en: 'Six, seven, eight, nine, ten.', trEn: 'seys, SYEH-teh, OH-choh, NWEH-beh, dyeth' },
      { id: 'l05-03', speaker: 'f', es: '¿Cuántos años tienes?', tr: "куа'нтос а'ньос тье'нэс?", ru: 'Сколько тебе лет?', en: 'How old are you?', trEn: 'KWAHN-tohs AH-nyohs TYEH-nehs?' },
      { id: 'l05-04', speaker: 'm', es: 'Tengo treinta años.', tr: "тэ'нго трэ'йнта а'ньос", ru: 'Мне тридцать лет.', en: 'I’m thirty years old.', trEn: 'TEHN-goh TREYN-tah AH-nyohs' },
      { id: 'l05-05', speaker: 'm', es: '¿Qué hora es?', tr: "кэ о'ра эс?", ru: 'Который час?', en: 'What time is it?', trEn: 'keh OH-rah ehs?' },
      { id: 'l05-06', speaker: 'f', es: 'Son las dos y media.', tr: "сон лас дос и мэ'дья", ru: 'Половина третьего.', en: 'It’s half past two.', trEn: 'sohn lahs dohs ee MEH-dyah' },
      { id: 'l05-07', speaker: 'm', es: 'Es la una.', tr: "эс ла у'на", ru: 'Час (ровно).', en: 'It’s one o’clock.', trEn: 'ehs lah OO-nah' },
    ],
    notes: [
      'Возраст «имеют»: tengo treinta años — дословно «имею тридцать лет».',
      'Осторожно: años (годы) и anos — совсем разные слова. Тильда над ñ важна!',
      'Время: es la una (час), но son las dos, son las tres…',
    ],
    notesEn: [
      'Age is something you “have”: tengo treinta años is literally “I have thirty years”.',
      'Careful: años (years) and anos are completely different words. The tilde on ñ matters!',
      'Time: es la una (one o’clock), but son las dos, son las tres…',
    ],
  },
  {
    n: 6,
    title: 'En la tienda',
    ru: 'В магазине',
    en: 'At the shop',
    phrases: [
      { id: 'l06-01', speaker: 'f', es: 'Buenas tardes. ¿Qué desea?', tr: "буэ'нас та'рдэс. кэ дэсэ'а?", ru: 'Добрый день. Что желаете?', en: 'Good afternoon. What would you like?', trEn: 'BWEH-nahs TAHR-dehs. keh deh-SEH-ah?' },
      { id: 'l06-02', speaker: 'm', es: 'Quiero un kilo de tomates.', tr: "кье'ро ун ки'ло дэ тома'тэс", ru: 'Мне, пожалуйста, килограмм помидоров.', en: 'I’d like a kilo of tomatoes.', trEn: 'KYEH-roh oon KEE-loh deh toh-MAH-tehs' },
      { id: 'l06-03', speaker: 'm', es: '¿Tiene pan?', tr: "тье'нэ пан?", ru: 'У вас есть хлеб?', en: 'Do you have bread?', trEn: 'TYEH-neh pahn?' },
      { id: 'l06-04', speaker: 'f', es: 'Sí, claro. ¿Algo más?', tr: "си, кла'ро. а'льго мас?", ru: 'Да, конечно. Что-нибудь ещё?', en: 'Yes, of course. Anything else?', trEn: 'see, KLAH-roh. AHL-goh mahs?' },
      { id: 'l06-05', speaker: 'm', es: 'No, nada más, gracias.', tr: "но, на'да мас, гра'сьяс", ru: 'Нет, больше ничего, спасибо.', en: 'No, nothing else, thanks.', trEn: 'noh, NAH-dah mahs, GRAH-thyahs' },
      { id: 'l06-06', speaker: 'm', es: '¿Puedo pagar con tarjeta?', tr: "пуэ'до пага'р кон тархэ'та?", ru: 'Можно заплатить картой?', en: 'Can I pay by card?', trEn: 'PWEH-doh pah-GAHR kohn tahr-HEH-tah?' },
      { id: 'l06-07', speaker: 'f', es: 'Sí, por supuesto.', tr: "си, пор супуэ'сто", ru: 'Да, конечно.', en: 'Yes, of course.', trEn: 'see, pohr soo-PWEHS-toh' },
    ],
    notes: [
      'Tiene, desea — вежливая форма на «вы» (usted), совпадает с формой «он/она».',
      'qu читается как «к»: quiero — «кьеро».',
      'Quiero — «хочу»; ещё вежливее — quería: Quería un kilo de tomates.',
    ],
    notesEn: [
      'Tiene and desea are the polite “you” (usted), which has the same form as “he/she”.',
      'qu sounds like “k”: quiero is “KYEH-roh”.',
      'Quiero means “I want”; quería is more polite still: Quería un kilo de tomates.',
    ],
  },
  {
    n: 7,
    title: 'La familia',
    ru: 'Семья',
    en: 'Family',
    phrases: [
      { id: 'l07-01', speaker: 'f', es: '¿Tienes hermanos?', tr: "тье'нэс эрма'нос?", ru: 'У тебя есть братья или сёстры?', en: 'Do you have any brothers or sisters?', trEn: 'TYEH-nehs ehr-MAH-nohs?' },
      { id: 'l07-02', speaker: 'm', es: 'Sí, tengo una hermana.', tr: "си, тэ'нго у'на эрма'на", ru: 'Да, у меня есть сестра.', en: 'Yes, I have a sister.', trEn: 'see, TEHN-goh OO-nah ehr-MAH-nah' },
      { id: 'l07-03', speaker: 'm', es: 'Mi hermana se llama Lucía.', tr: "ми эрма'на сэ йа'ма луси'а", ru: 'Мою сестру зовут Лусия.', en: 'My sister’s name is Lucía.', trEn: 'mee ehr-MAH-nah seh YAH-mah loo-THEE-ah' },
      { id: 'l07-04', speaker: 'f', es: '¿Estás casado?', tr: "эста'с каса'до?", ru: 'Ты женат?', en: 'Are you married?', trEn: 'ehs-TAHS kah-SAH-doh?' },
      { id: 'l07-05', speaker: 'm', es: 'Sí, y tengo dos hijos.', tr: "си, и тэ'нго дос и'хос", ru: 'Да, и у меня двое детей.', en: 'Yes, and I have two children.', trEn: 'see, ee TEHN-goh dohs EE-hohs' },
      { id: 'l07-06', speaker: 'm', es: 'Mis padres viven en Moscú.', tr: "мис па'дрэс би'бэн эн моску'", ru: 'Мои родители живут в Москве.', en: 'My parents live in Moscow.', trEn: 'mees PAH-drehs BEE-behn ehn mohs-KOO' },
    ],
    notes: [
      'Hermanos — и «братья», и «братья и сёстры». Так же hijos — «сыновья» или просто «дети», padres — «родители».',
      'Casado — женат (о мужчине), casada — замужем.',
      'Tengo / tienes — «у меня есть / у тебя есть» (глагол tener).',
    ],
    notesEn: [
      'Hermanos means both “brothers” and “brothers and sisters”. Likewise hijos is “sons” or just “children”, and padres is “parents”.',
      'Casado (of a man) and casada (of a woman) both mean “married”.',
      'Tengo / tienes: “I have / you have” (the verb tener).',
    ],
  },
  {
    n: 8,
    title: 'Mi día',
    ru: 'Мой день',
    en: 'My day',
    phrases: [
      { id: 'l08-01', speaker: 'm', es: 'Me levanto a las siete.', tr: "мэ лэба'нто а лас сье'тэ", ru: 'Я встаю в семь.', en: 'I get up at seven.', trEn: 'meh leh-BAHN-toh ah lahs SYEH-teh' },
      { id: 'l08-02', speaker: 'm', es: 'Desayuno café y tostadas.', tr: "дэсайу'но кафэ' и тоста'дас", ru: 'На завтрак у меня кофе и тосты.', en: 'For breakfast I have coffee and toast.', trEn: 'deh-sah-YOO-noh kah-FEH ee tohs-TAH-dahs' },
      { id: 'l08-03', speaker: 'm', es: 'Trabajo de nueve a cinco.', tr: "траба'хо дэ нуэ'бэ а си'нко", ru: 'Я работаю с девяти до пяти.', en: 'I work from nine to five.', trEn: 'trah-BAH-hoh deh NWEH-beh ah THEEN-koh' },
      { id: 'l08-04', speaker: 'm', es: 'Como a las dos.', tr: "ко'мо а лас дос", ru: 'Я обедаю в два.', en: 'I have lunch at two.', trEn: 'KOH-moh ah lahs dohs' },
      { id: 'l08-05', speaker: 'm', es: 'Por la tarde voy al gimnasio.', tr: "пор ла та'рдэ бой аль химна'сьо", ru: 'Вечером я хожу в спортзал.', en: 'In the afternoon I go to the gym.', trEn: 'pohr lah TAHR-deh boy ahl heem-NAH-syoh' },
      { id: 'l08-06', speaker: 'm', es: 'Ceno a las nueve.', tr: "сэ'но а лас нуэ'бэ", ru: 'Я ужинаю в девять.', en: 'I have dinner at nine.', trEn: 'THEH-noh ah lahs NWEH-beh' },
      { id: 'l08-07', speaker: 'm', es: 'Me acuesto a las once.', tr: "мэ акуэ'сто а лас о'нсэ", ru: 'Я ложусь спать в одиннадцать.', en: 'I go to bed at eleven.', trEn: 'meh ah-KWEHS-toh ah lahs OHN-theh' },
    ],
    notes: [
      'В Испании обедают поздно, около 14–15 часов, а ужинают в 21–22.',
      'Como — «я ем / обедаю»; comer — «есть», comida — «обед, еда».',
      'g перед e, i читается как «х»: gimnasio — «химнасьо».',
      'Por la tarde — «после обеда, вечером» (до темноты).',
    ],
    notesEn: [
      'In Spain people have lunch late, around 2–3 p.m., and dinner at 9–10 p.m.',
      'Como means “I eat / I have lunch”; comer is “to eat”, comida is “lunch, food”.',
      'g before e or i sounds like the rough h of j: gimnasio is “heem-NAH-syoh”.',
      'Por la tarde means “in the afternoon, in the evening” (until it gets dark).',
    ],
  },
  {
    n: 9,
    title: 'El tiempo',
    ru: 'Погода',
    en: 'The weather',
    phrases: [
      { id: 'l09-01', speaker: 'f', es: '¿Qué tiempo hace hoy?', tr: "кэ тье'мпо а'сэ ой?", ru: 'Какая сегодня погода?', en: 'What’s the weather like today?', trEn: 'keh TYEHM-poh AH-theh oy?' },
      { id: 'l09-02', speaker: 'm', es: 'Hace sol y mucho calor.', tr: "а'сэ соль и му'чо кало'р", ru: 'Солнечно и очень жарко.', en: 'It’s sunny and very hot.', trEn: 'AH-theh sohl ee MOO-choh kah-LOHR' },
      { id: 'l09-03', speaker: 'f', es: 'Hace frío.', tr: "а'сэ фри'о", ru: 'Холодно.', en: 'It’s cold.', trEn: 'AH-theh FREE-oh' },
      { id: 'l09-04', speaker: 'm', es: 'Está lloviendo.', tr: "эста' йобье'ндо", ru: 'Идёт дождь.', en: 'It’s raining.', trEn: 'ehs-TAH yoh-BYEHN-doh' },
      { id: 'l09-05', speaker: 'f', es: 'Mañana va a hacer buen tiempo.', tr: "манья'на ба а асэ'р буэн тье'мпо", ru: 'Завтра будет хорошая погода.', en: 'The weather will be good tomorrow.', trEn: 'mah-NYAH-nah bah ah ah-THEHR bwehn TYEHM-poh' },
      { id: 'l09-06', speaker: 'm', es: 'Me gusta el verano.', tr: "мэ гу'ста эль бэра'но", ru: 'Мне нравится лето.', en: 'I like summer.', trEn: 'meh GOOS-tah ehl beh-RAH-noh' },
    ],
    notes: [
      'О погоде говорят через hace («делает»): hace sol, hace frío, hace calor.',
      'Va a + глагол — ближайшее будущее: va a hacer — «будет».',
      'Me gusta — «мне нравится», дословно «мне нравится (что-то)».',
    ],
    notesEn: [
      'Weather is talked about with hace (“it makes”): hace sol, hace frío, hace calor.',
      'Va a + a verb is the near future: va a hacer means “it is going to be”.',
      'Me gusta means “I like”, literally “(something) pleases me”.',
    ],
  },
  {
    n: 10,
    title: 'En el restaurante',
    ru: 'В ресторане',
    en: 'At the restaurant',
    phrases: [
      { id: 'l10-01', speaker: 'm', es: 'Una mesa para dos, por favor.', tr: "у'на мэ'са па'ра дос, пор фабо'р", ru: 'Столик на двоих, пожалуйста.', en: 'A table for two, please.', trEn: 'OO-nah MEH-sah PAH-rah dohs, pohr fah-BOHR' },
      { id: 'l10-02', speaker: 'm', es: '¿Qué me recomienda?', tr: "кэ мэ рэкомье'нда?", ru: 'Что вы посоветуете?', en: 'What do you recommend?', trEn: 'keh meh reh-koh-MYEHN-dah?' },
      { id: 'l10-03', speaker: 'f', es: 'La paella está muy rica.', tr: "ла паэ'йа эста' муй ри'ка", ru: 'Паэлья очень вкусная.', en: 'The paella is very tasty.', trEn: 'lah pah-EH-yah ehs-TAH mwee REE-kah' },
      { id: 'l10-04', speaker: 'm', es: 'Para mí, la paella y una copa de vino tinto.', tr: "па'ра ми, ла паэ'йа и у'на ко'па дэ би'но ти'нто", ru: 'Мне паэлью и бокал красного вина.', en: 'For me, the paella and a glass of red wine.', trEn: 'PAH-rah mee, lah pah-EH-yah ee OO-nah KOH-pah deh BEE-noh TEEN-toh' },
      { id: 'l10-05', speaker: 'm', es: '¿Me trae la cuenta, por favor?', tr: "мэ тра'э ла куэ'нта, пор фабо'р?", ru: 'Принесите, пожалуйста, счёт.', en: 'Could you bring me the bill, please?', trEn: 'meh TRAH-eh lah KWEHN-tah, pohr fah-BOHR?' },
      { id: 'l10-06', speaker: 'f', es: '¡Que aproveche!', tr: "кэ апробэ'чэ!", ru: 'Приятного аппетита!', en: 'Enjoy your meal!', trEn: 'keh ah-proh-BEH-cheh!' },
    ],
    notes: [
      'Rico о еде — «вкусный» (а не «богатый»).',
      'Vino tinto — красное вино (не rojo!), vino blanco — белое.',
      'Para mí — «для меня, мне»: так заказывают.',
    ],
    notesEn: [
      'Rico about food means “tasty” (not “rich”).',
      'Vino tinto is red wine (not rojo!), vino blanco is white wine.',
      'Para mí means “for me”: this is how you order.',
    ],
  },
];
