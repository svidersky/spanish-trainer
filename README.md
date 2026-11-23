# Spanish Trainer

A personal Spanish trainer (Spain variant, es-ES) for a Russian-speaking learner. It is plain HTML files: no server, nothing to install.

- **Assimil-style lessons.** Short dialogues with the Spanish and the Russian side by side, and a Russian-letter transcription for every phrase. The browser's voice speaks each phrase, then pauses so you can repeat it aloud.
- **Flashcards with spaced repetition (SM-2, as in Anki).** A completed lesson adds its phrases to the deck. Every phrase becomes two cards: Recognition (ES → RU, answer in your head) and Production (RU → ES, type the answer; the trainer highlights the differences).

The project's terms are defined in [CONTEXT.md](CONTEXT.md). The learner-facing interface and lesson content are in Russian; everything else in the repository is in English.

## Running it

Open `index.html` by double-clicking it. **Microsoft Edge** works best: it ships good online Spanish voices.

If the trainer says no Spanish voice was found, add one in Windows: *Settings → Time & language → Speech → Add voices → Español (España)*.

## Progress

Progress lives in the browser (localStorage) and is lost if you clear the browser's data. Click **«Сохранить прогресс в файл»** (save progress to a file) from time to time. You can keep that file in the cloud and load it back with **«Загрузить из файла»** (load from a file). The trainer reminds you if more than a week has passed since the last save.

## Adding a lesson

Lessons live in [data/lessons.js](data/lessons.js). Copy a lesson, change its number `n`, and give every phrase a unique `id`. Never change the `id` of a phrase in a lesson that has already been completed: progress is keyed on it.

In the transcription, put an apostrophe right after the stressed vowel: `"о'ла"` is rendered as «о́ла».

## Tests

Requires Node.js 20 or newer:

```
npm install
npm test
```

- [tests/core.test.js](tests/core.test.js) covers the SM-2 scheduler and answer comparison.
- [tests/lessons.test.js](tests/lessons.test.js) checks lesson data: unique ids, stress marks in transcriptions, paired ¿? and ¡! marks.
- [tests/ui.test.js](tests/ui.test.js) runs the screens in jsdom: lessons, marking a lesson completed, a session with both card directions, the timer, export and import, and voice selection.

GitHub Actions runs the tests on every pull request and on every push to `main` ([.github/workflows/test.yml](.github/workflows/test.yml)).
