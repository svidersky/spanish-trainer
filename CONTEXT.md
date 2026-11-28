# Spanish Trainer

A personal Spanish trainer (Spain variant, es-ES) for a single learner whose native language is Russian. It combines two methods: flashcards with spaced repetition and Assimil-style lessons.

The learner-facing interface is in Russian by default and can be switched to English (see Interface language). The Russian label the learner sees is given in parentheses after each term.

## Glossary

**Lesson** («Урок»)
A short Assimil-style dialogue of 5–10 Phrases, with the Spanish text and its translation into the Interface language side by side and a few notes. The learner listens to each Phrase and repeats it aloud during the pause after it is spoken. There is no active "second wave" as in Assimil; Production Cards play that role.

**Completed** («Пройден»)
The learner marks a Lesson as Completed themselves. At that moment all of the Lesson's Phrases are added to the Deck. Phrases from Lessons that are not Completed never enter the Deck.

**Deck** («Колода»)
All Cards of all Phrases from Completed Lessons, except the archived ones. There is a single Deck shared by all Lessons.

**Archive** («Запомненные»)
The Cards the learner has marked «Всё, запомнил» ("Know it for good"). An archived Card leaves the Deck: it never comes up in a Session or a Practice and is not counted as due, Learned or not Learned; the home screen counts archived Cards on their own. Its SM-2 state is frozen as it was. When marking a Card, the learner chooses to archive only this Card or both Cards of the Phrase (the second option is offered while the other Card is still in the Deck), or cancels. Archiving counts as the Card's latest answer, so Sync carries it to the Profile's other devices.

**Archive check** («Проверка запомненных»)
A rare extra run over the Archive: a set number of archived Cards picked at random (the same number as a Practice takes). The Answer and the buttons are the same as in a Session. *again*, *hard* and *good* return the Card to the Deck, scheduled from its frozen state as an ordinary Grade; *again* also brings it back once more in the same check. «Всё, запомнил» keeps it in the Archive.

**Session** («Сессия»)
One time-boxed practice run over the Deck (15 minutes by default). The Cards that have been due the longest come first. When time runs out, the current Card is played through to its Grade and the Session ends. Cards not reached stay in the queue. Archived Cards never come up in a Session; a Card archived during one leaves its queue at once.

**Practice** («Тренировка»)
An extra run over the Deck's Cards that are not Learned yet (never archived ones), at any time, whether they are due or not. The hardest Cards come first: the lowest SM-2 ease, then the most *again* answers, then the soonest due. A Practice takes a set number of Cards (20 by default, changed in the settings) rather than a set time. Only *again* changes a Card's schedule, exactly as in a Session, and brings the Card back at the end of the same Practice, beyond the set number; *hard* and *good* leave the schedule as it was, because SM-2 is not meant for answers given before the Card is due. A Card archived during a Practice leaves its queue at once.

**Profile** («Профиль»)
A name and a 4-digit PIN under which one learner's progress is kept on the Sync server. There is no registration: the first successful sync with a new name creates the Profile with that PIN. After 5 wrong PINs in a row the name is locked for an hour.

**Sync** («Синхронизация»)
Bringing this device's progress and the Profile's copy on the server together. Sync merges rather than overwrites: for each Card the more recent answer wins, Completed Lessons from both sides are kept, and settings come from whichever side changed them last. It runs when the app opens and shortly after every change.

**Interface language** («Язык интерфейса»)
The learner's own language, in which the trainer speaks to them: Russian (the default) or English. It is chosen in a dropdown in the header on every screen and changes the interface texts, the translations, the Lesson notes and the Transcription. It is a setting, so Sync carries it to the Profile's other devices. Spanish is never translated.

**Phrase** («Фраза»)
A unit of learning material: the Spanish text, its Transcription, its translation (Russian and English), and es-ES audio. Cards are built from Phrases.

**Speaker**
Which of the two dialogue roles says a Phrase: male (*m*) or female (*f*). It decides the voice of the Phrase's Recording and must agree with the Phrase's grammar (*encantado* vs *encantada*).

**Recording**
A pre-made audio file of a Phrase, synthesized offline in the Speaker's voice. A Recording belongs to the exact text it was made from; when the Phrase's text changes, the old Recording is no longer used. Without a usable Recording, the browser's own voice speaks the Phrase.

**Transcription** («Транскрипция»)
The pronunciation of a Spanish Phrase written in the letters of the Interface language, with the stress marked. In Russian it uses Cyrillic letters with the stressed vowel marked; in English, Latin letters in hyphen-joined syllables with the stressed syllable in capitals. It is shown in parentheses right after the Spanish text: «¿Dónde está el baño? (до́ндэ эста́ эль ба́ньо?)», "¿Dónde está el baño? (DOHN-deh ehs-TAH ehl BAH-nyoh?)". In a Lesson the Transcription is always visible. On a Card of either direction it appears only after the Answer, together with the correct text.

**Card** («Карточка»)
One direction of testing one Phrase, with its own progress. Every Phrase has two Cards:
- **Recognition** («Узнавание», ES → RU): you see or hear the Spanish and recall the meaning.
- **Production** («Воспроизведение», RU → ES): you see the translation and recall the Spanish.

In English the directions read ES → EN and EN → ES.

The progress of one Card does not affect the other Card of the same Phrase.

**Answer** («Ответ»)
What the learner does before seeing the correct text. For Recognition, the learner answers silently or aloud. For Production, the learner types the Spanish text; the trainer highlights the differences from the correct text but does not judge it.

**Grade** («Оценка»)
The learner's self-assessment after the Answer: *again / hard / good* («забыл / трудно / легко»; in English "Again / Hard / Easy"). It is always given by the learner, never by the trainer. It decides when the Card is shown next, and it matters from the very first answer: *again* brings the Card back in the same Session, while *hard* and *good* give a short and a medium wait. After that, each Grade grows the wait at its own rate (SM-2 ease, with Anki's adjustments). Next to the Grades is «Всё, запомнил», which is not a Grade: it moves the Card to the Archive.

**Learned** («Выучена»)
The status of a Card whose interval until the next review is 21 days or more. A Learned Card is still reviewed. If a Grade of *again* drops the interval below 21 days, the status is removed. There is no separate "problem card" status: difficult Cards are simply shown more often by SM-2.
