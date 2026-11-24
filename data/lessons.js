// Assimil-style Lessons. Spanish is the Spain variant (es-ES).
// Lesson titles and phrases are Spanish; translations, notes and Transcriptions are
// learner-facing and therefore Russian.
//
// Phrase format:
//   id — unique; never change it once the Lesson has been Completed (progress is keyed on it)
//   speaker — 'm' or 'f': which of the two dialogue roles says the Phrase (picks the Recording voice)
//   es — Spanish text
//   tr — Transcription in Russian letters; put an apostrophe RIGHT AFTER the stressed vowel: "о'ла" → «о́ла»
//   ru — Russian translation
//
// Transcription conventions:
//   c (before e, i) and z sound like English "th" in "think" in Spain — written «с».
//   ll and y — «й»; j and g (before e, i) — «х»; h is silent; v = b — «б»; ñ — «нь».
//   Consonant + e is written «э»: "de" → «дэ».

window.LESSONS = [
  {
    n: 1,
    title: 'Hola',
    ru: 'Знакомство',
    phrases: [
      { id: 'l01-01', speaker: 'm', es: '¡Hola! ¿Qué tal?', tr: "о'ла! кэ таль?", ru: 'Привет! Как дела?' },
      { id: 'l01-02', speaker: 'f', es: 'Muy bien, gracias. ¿Y tú?', tr: "муй бьен, гра'сьяс. и ту?", ru: 'Очень хорошо, спасибо. А ты?' },
      { id: 'l01-03', speaker: 'm', es: 'Bien también.', tr: "бьен тамбье'н", ru: 'Тоже хорошо.' },
      { id: 'l01-04', speaker: 'm', es: '¿Cómo te llamas?', tr: "ко'мо тэ йа'мас?", ru: 'Как тебя зовут?' },
      { id: 'l01-05', speaker: 'f', es: 'Me llamo Ana. ¿Y tú?', tr: "мэ йа'мо а'на. и ту?", ru: 'Меня зовут Ана. А тебя?' },
      { id: 'l01-06', speaker: 'm', es: 'Me llamo Pablo. Encantado.', tr: "мэ йа'мо па'бло. энканта'до", ru: 'Меня зовут Пабло. Очень приятно.' },
      { id: 'l01-07', speaker: 'f', es: 'Encantada.', tr: "энканта'да", ru: 'Очень приятно (говорит женщина).' },
      { id: 'l01-08', speaker: 'm', es: '¡Hasta luego!', tr: "а'ста луэ'го!", ru: 'До встречи!' },
    ],
    notes: [
      'Буква h в испанском никогда не читается: hola — «ола», hasta — «аста».',
      'll в современном испанском звучит почти как «й»: llamo — «йамо».',
      'Encantado говорит мужчина, encantada — женщина.',
      'Вопрос и восклицание отмечаются и в начале, перевёрнутым знаком: ¿…? и ¡…!',
    ],
  },
  {
    n: 2,
    title: '¿De dónde eres?',
    ru: 'Откуда ты?',
    phrases: [
      { id: 'l02-01', speaker: 'f', es: '¿De dónde eres?', tr: "дэ до'ндэ э'рэс?", ru: 'Откуда ты?' },
      { id: 'l02-02', speaker: 'm', es: 'Soy de Rusia.', tr: "сой дэ ру'сья", ru: 'Я из России.' },
      { id: 'l02-03', speaker: 'm', es: 'Y tú, ¿de dónde eres?', tr: "и ту, дэ до'ндэ э'рэс?", ru: 'А ты откуда?' },
      { id: 'l02-04', speaker: 'f', es: 'Soy de Madrid, pero vivo en Barcelona.', tr: "сой дэ мадри'д, пэ'ро би'бо эн барсэло'на", ru: 'Я из Мадрида, но живу в Барселоне.' },
      { id: 'l02-05', speaker: 'f', es: '¿Hablas español?', tr: "а'блас эспаньо'ль?", ru: 'Ты говоришь по-испански?' },
      { id: 'l02-06', speaker: 'm', es: 'Hablo un poco.', tr: "а'бло ун по'ко", ru: 'Я немного говорю.' },
      { id: 'l02-07', speaker: 'f', es: '¡Hablas muy bien!', tr: "а'блас муй бьен!", ru: 'Ты очень хорошо говоришь!' },
    ],
    notes: [
      'Soy — «я есть» (глагол ser): так говорят о происхождении, профессии, характере.',
      'v читается как «б»: vivo — «бибо».',
      'ñ — это «нь»: español — «эспаньоль».',
      'Местоимение «я» обычно опускают: hablo — уже «я говорю».',
    ],
  },
  {
    n: 3,
    title: 'En el café',
    ru: 'В кафе',
    phrases: [
      { id: 'l03-01', speaker: 'm', es: '¡Buenos días!', tr: "буэ'нос ди'ас!", ru: 'Доброе утро! / Добрый день!' },
      { id: 'l03-02', speaker: 'm', es: 'Un café con leche, por favor.', tr: "ун кафэ' кон лэ'чэ, пор фабо'р", ru: 'Кофе с молоком, пожалуйста.' },
      { id: 'l03-03', speaker: 'f', es: '¿Algo más?', tr: "а'льго мас?", ru: 'Что-нибудь ещё?' },
      { id: 'l03-04', speaker: 'm', es: 'Sí, un agua sin gas.', tr: "си, ун а'гуа син гас", ru: 'Да, воду без газа.' },
      { id: 'l03-05', speaker: 'm', es: '¿Cuánto es?', tr: "куа'нто эс?", ru: 'Сколько с меня?' },
      { id: 'l03-06', speaker: 'f', es: 'Son tres euros.', tr: "сон трэс э'урос", ru: 'Три евро.' },
      { id: 'l03-07', speaker: 'm', es: 'Aquí tiene.', tr: "аки' тье'нэ", ru: 'Вот, держите.' },
      { id: 'l03-08', speaker: 'm', es: '¡Gracias, adiós!', tr: "гра'сьяс, адьо'с!", ru: 'Спасибо, до свидания!' },
    ],
    notes: [
      'Buenos días говорят до обеда (примерно до 14:00), потом — buenas tardes.',
      'Agua — женского рода, но перед ударным «а» ставят un и el: un agua, el agua.',
      'ch читается как «ч»: leche — «лэчэ».',
      'Aquí tiene — вежливое «вот, пожалуйста», когда что-то протягиваешь.',
    ],
  },
  {
    n: 4,
    title: '¿Dónde está?',
    ru: 'Где находится?',
    phrases: [
      { id: 'l04-01', speaker: 'm', es: 'Perdone, ¿dónde está el baño?', tr: "пэрдо'нэ, до'ндэ эста' эль ба'ньо?", ru: 'Извините, где туалет?' },
      { id: 'l04-02', speaker: 'f', es: 'Está allí, a la derecha.', tr: "эста' айи', а ла дэрэ'ча", ru: 'Там, справа.' },
      { id: 'l04-03', speaker: 'm', es: '¿Y la estación de metro?', tr: "и ла эстасьо'н дэ мэ'тро?", ru: 'А станция метро?' },
      { id: 'l04-04', speaker: 'f', es: 'Está cerca. Todo recto y a la izquierda.', tr: "эста' сэ'рка. то'до рэ'кто и а ла искье'рда", ru: 'Рядом. Прямо и налево.' },
      { id: 'l04-05', speaker: 'm', es: '¿Está lejos?', tr: "эста' лэ'хос?", ru: 'Это далеко?' },
      { id: 'l04-06', speaker: 'f', es: 'No, está a cinco minutos.', tr: "но, эста' а си'нко мину'тос", ru: 'Нет, в пяти минутах.' },
      { id: 'l04-07', speaker: 'm', es: 'Muchas gracias.', tr: "му'час гра'сьяс", ru: 'Большое спасибо.' },
      { id: 'l04-08', speaker: 'f', es: 'De nada.', tr: "дэ на'да", ru: 'Не за что.' },
    ],
    notes: [
      'Está (глагол estar) — «находится». Для места всегда estar, а не ser.',
      'j читается как «х»: lejos — «лэхос».',
      'r в начале слова раскатистое, как «рр»: recto.',
      'Perdone — вежливое «извините» незнакомому человеку.',
    ],
  },
  {
    n: 5,
    title: 'Los números',
    ru: 'Числа и время',
    phrases: [
      { id: 'l05-01', speaker: 'f', es: 'Uno, dos, tres, cuatro, cinco.', tr: "у'но, дос, трэс, куа'тро, си'нко", ru: 'Один, два, три, четыре, пять.' },
      { id: 'l05-02', speaker: 'm', es: 'Seis, siete, ocho, nueve, diez.', tr: "сэйс, сье'тэ, о'чо, нуэ'бэ, дьес", ru: 'Шесть, семь, восемь, девять, десять.' },
      { id: 'l05-03', speaker: 'f', es: '¿Cuántos años tienes?', tr: "куа'нтос а'ньос тье'нэс?", ru: 'Сколько тебе лет?' },
      { id: 'l05-04', speaker: 'm', es: 'Tengo treinta años.', tr: "тэ'нго трэ'йнта а'ньос", ru: 'Мне тридцать лет.' },
      { id: 'l05-05', speaker: 'm', es: '¿Qué hora es?', tr: "кэ о'ра эс?", ru: 'Который час?' },
      { id: 'l05-06', speaker: 'f', es: 'Son las dos y media.', tr: "сон лас дос и мэ'дья", ru: 'Половина третьего.' },
      { id: 'l05-07', speaker: 'm', es: 'Es la una.', tr: "эс ла у'на", ru: 'Час (ровно).' },
    ],
    notes: [
      'Возраст «имеют»: tengo treinta años — дословно «имею тридцать лет».',
      'Осторожно: años (годы) и anos — совсем разные слова. Тильда над ñ важна!',
      'Время: es la una (час), но son las dos, son las tres…',
    ],
  },
  {
    n: 6,
    title: 'En la tienda',
    ru: 'В магазине',
    phrases: [
      { id: 'l06-01', speaker: 'f', es: 'Buenas tardes. ¿Qué desea?', tr: "буэ'нас та'рдэс. кэ дэсэ'а?", ru: 'Добрый день. Что желаете?' },
      { id: 'l06-02', speaker: 'm', es: 'Quiero un kilo de tomates.', tr: "кье'ро ун ки'ло дэ тома'тэс", ru: 'Мне, пожалуйста, килограмм помидоров.' },
      { id: 'l06-03', speaker: 'm', es: '¿Tiene pan?', tr: "тье'нэ пан?", ru: 'У вас есть хлеб?' },
      { id: 'l06-04', speaker: 'f', es: 'Sí, claro. ¿Algo más?', tr: "си, кла'ро. а'льго мас?", ru: 'Да, конечно. Что-нибудь ещё?' },
      { id: 'l06-05', speaker: 'm', es: 'No, nada más, gracias.', tr: "но, на'да мас, гра'сьяс", ru: 'Нет, больше ничего, спасибо.' },
      { id: 'l06-06', speaker: 'm', es: '¿Puedo pagar con tarjeta?', tr: "пуэ'до пага'р кон тархэ'та?", ru: 'Можно заплатить картой?' },
      { id: 'l06-07', speaker: 'f', es: 'Sí, por supuesto.', tr: "си, пор супуэ'сто", ru: 'Да, конечно.' },
    ],
    notes: [
      'Tiene, desea — вежливая форма на «вы» (usted), совпадает с формой «он/она».',
      'qu читается как «к»: quiero — «кьеро».',
      'Quiero — «хочу»; ещё вежливее — quería: Quería un kilo de tomates.',
    ],
  },
  {
    n: 7,
    title: 'La familia',
    ru: 'Семья',
    phrases: [
      { id: 'l07-01', speaker: 'f', es: '¿Tienes hermanos?', tr: "тье'нэс эрма'нос?", ru: 'У тебя есть братья или сёстры?' },
      { id: 'l07-02', speaker: 'm', es: 'Sí, tengo una hermana.', tr: "си, тэ'нго у'на эрма'на", ru: 'Да, у меня есть сестра.' },
      { id: 'l07-03', speaker: 'm', es: 'Mi hermana se llama Lucía.', tr: "ми эрма'на сэ йа'ма луси'а", ru: 'Мою сестру зовут Лусия.' },
      { id: 'l07-04', speaker: 'f', es: '¿Estás casado?', tr: "эста'с каса'до?", ru: 'Ты женат?' },
      { id: 'l07-05', speaker: 'm', es: 'Sí, y tengo dos hijos.', tr: "си, и тэ'нго дос и'хос", ru: 'Да, и у меня двое детей.' },
      { id: 'l07-06', speaker: 'm', es: 'Mis padres viven en Moscú.', tr: "мис па'дрэс би'бэн эн моску'", ru: 'Мои родители живут в Москве.' },
    ],
    notes: [
      'Hermanos — и «братья», и «братья и сёстры». Так же hijos — «сыновья» или просто «дети», padres — «родители».',
      'Casado — женат (о мужчине), casada — замужем.',
      'Tengo / tienes — «у меня есть / у тебя есть» (глагол tener).',
    ],
  },
  {
    n: 8,
    title: 'Mi día',
    ru: 'Мой день',
    phrases: [
      { id: 'l08-01', speaker: 'm', es: 'Me levanto a las siete.', tr: "мэ лэба'нто а лас сье'тэ", ru: 'Я встаю в семь.' },
      { id: 'l08-02', speaker: 'm', es: 'Desayuno café y tostadas.', tr: "дэсайу'но кафэ' и тоста'дас", ru: 'На завтрак у меня кофе и тосты.' },
      { id: 'l08-03', speaker: 'm', es: 'Trabajo de nueve a cinco.', tr: "траба'хо дэ нуэ'бэ а си'нко", ru: 'Я работаю с девяти до пяти.' },
      { id: 'l08-04', speaker: 'm', es: 'Como a las dos.', tr: "ко'мо а лас дос", ru: 'Я обедаю в два.' },
      { id: 'l08-05', speaker: 'm', es: 'Por la tarde voy al gimnasio.', tr: "пор ла та'рдэ бой аль химна'сьо", ru: 'Вечером я хожу в спортзал.' },
      { id: 'l08-06', speaker: 'm', es: 'Ceno a las nueve.', tr: "сэ'но а лас нуэ'бэ", ru: 'Я ужинаю в девять.' },
      { id: 'l08-07', speaker: 'm', es: 'Me acuesto a las once.', tr: "мэ акуэ'сто а лас о'нсэ", ru: 'Я ложусь спать в одиннадцать.' },
    ],
    notes: [
      'В Испании обедают поздно, около 14–15 часов, а ужинают в 21–22.',
      'Como — «я ем / обедаю»; comer — «есть», comida — «обед, еда».',
      'g перед e, i читается как «х»: gimnasio — «химнасьо».',
      'Por la tarde — «после обеда, вечером» (до темноты).',
    ],
  },
  {
    n: 9,
    title: 'El tiempo',
    ru: 'Погода',
    phrases: [
      { id: 'l09-01', speaker: 'f', es: '¿Qué tiempo hace hoy?', tr: "кэ тье'мпо а'сэ ой?", ru: 'Какая сегодня погода?' },
      { id: 'l09-02', speaker: 'm', es: 'Hace sol y mucho calor.', tr: "а'сэ соль и му'чо кало'р", ru: 'Солнечно и очень жарко.' },
      { id: 'l09-03', speaker: 'f', es: 'Hace frío.', tr: "а'сэ фри'о", ru: 'Холодно.' },
      { id: 'l09-04', speaker: 'm', es: 'Está lloviendo.', tr: "эста' йобье'ндо", ru: 'Идёт дождь.' },
      { id: 'l09-05', speaker: 'f', es: 'Mañana va a hacer buen tiempo.', tr: "манья'на ба а асэ'р буэн тье'мпо", ru: 'Завтра будет хорошая погода.' },
      { id: 'l09-06', speaker: 'm', es: 'Me gusta el verano.', tr: "мэ гу'ста эль бэра'но", ru: 'Мне нравится лето.' },
    ],
    notes: [
      'О погоде говорят через hace («делает»): hace sol, hace frío, hace calor.',
      'Va a + глагол — ближайшее будущее: va a hacer — «будет».',
      'Me gusta — «мне нравится», дословно «мне нравится (что-то)».',
    ],
  },
  {
    n: 10,
    title: 'En el restaurante',
    ru: 'В ресторане',
    phrases: [
      { id: 'l10-01', speaker: 'm', es: 'Una mesa para dos, por favor.', tr: "у'на мэ'са па'ра дос, пор фабо'р", ru: 'Столик на двоих, пожалуйста.' },
      { id: 'l10-02', speaker: 'm', es: '¿Qué me recomienda?', tr: "кэ мэ рэкомье'нда?", ru: 'Что вы посоветуете?' },
      { id: 'l10-03', speaker: 'f', es: 'La paella está muy rica.', tr: "ла паэ'йа эста' муй ри'ка", ru: 'Паэлья очень вкусная.' },
      { id: 'l10-04', speaker: 'm', es: 'Para mí, la paella y una copa de vino tinto.', tr: "па'ра ми, ла паэ'йа и у'на ко'па дэ би'но ти'нто", ru: 'Мне паэлью и бокал красного вина.' },
      { id: 'l10-05', speaker: 'm', es: '¿Me trae la cuenta, por favor?', tr: "мэ тра'э ла куэ'нта, пор фабо'р?", ru: 'Принесите, пожалуйста, счёт.' },
      { id: 'l10-06', speaker: 'f', es: '¡Que aproveche!', tr: "кэ апробэ'чэ!", ru: 'Приятного аппетита!' },
    ],
    notes: [
      'Rico о еде — «вкусный» (а не «богатый»).',
      'Vino tinto — красное вино (не rojo!), vino blanco — белое.',
      'Para mí — «для меня, мне»: так заказывают.',
    ],
  },
];
