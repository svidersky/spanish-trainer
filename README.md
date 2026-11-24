# Spanish Trainer

A personal Spanish trainer (Spain variant, es-ES) for a Russian- or English-speaking learner. It is plain HTML files: no server, nothing to install.

- **Assimil-style lessons.** Short dialogues with the Spanish and the translation side by side, and a transcription in the learner's own letters for every phrase. The browser's voice speaks each phrase, then pauses so you can repeat it aloud.
- **Flashcards with spaced repetition (SM-2, as in Anki).** A completed lesson adds its phrases to the deck. Every phrase becomes two cards: Recognition (ES → RU, answer in your head) and Production (RU → ES, type the answer; the trainer highlights the differences).

The project's terms are defined in [CONTEXT.md](CONTEXT.md). The learner-facing interface and lesson content are in Russian by default and can be switched to English in the header (strings in `js/i18n.js`, lesson content in `data/lessons.js`); everything else in the repository is in English.

## Running it

**On any device, including a phone:** open https://svidersky.github.io/spanish-trainer/ (GitHub Pages, deployed from `main`).

**Locally:** open `index.html` by double-clicking it. **Microsoft Edge** works best: it ships good online Spanish voices.

If no Spanish voice is found, the trainer shows where to add one for the current device. The menu paths follow the vendors' support pages:
- **iPhone/iPad:** Settings → Accessibility → Read & Speak → Voices ([Apple](https://support.apple.com/guide/iphone/hear-iphone-speak-the-screen-selection-iph96b214f0/ios)).
- **Android:** Settings → Accessibility → Text-to-speech output → Install voice data ([Google](https://support.google.com/accessibility/android/answer/6006983)).
- **Windows:** Language & region → Add a language → Spanish (Spain) with Text-to-speech ([Microsoft](https://support.microsoft.com/en-us/windows/download-languages-and-voices-for-immersive-reader-read-mode-and-read-aloud-4c83a8d8-7486-42f7-8e46-2b0fdf753130)).

Progress is stored per device and browser. To move it, export it to a file on one device and import it on the other.

## Sync between devices

On the home screen, enter a name and a 4-digit PIN (the same on every device). Progress then syncs automatically: when the app opens and a couple of seconds after every answer. The first sync with a new name creates its Profile; after 5 wrong PINs the name is locked for an hour.

The Sync server runs at `https://spanish-progress.spanish-trainer.workers.dev` (`DEFAULT_URL` in [js/sync.js](js/sync.js)). It is a Cloudflare Worker in [worker/](worker) with one SQLite-backed Durable Object per Profile (free plan). The object stores the Profile's progress with a salted SHA-256 of the PIN and a version number, and handles its requests strictly one at a time. The app merges ([js/merge.js](js/merge.js)) and saves with the version it started from; a save based on an old version gets the current copy back to merge, so two devices never overwrite each other, even when they save at the same moment. [.github/workflows/deploy-worker.yml](.github/workflows/deploy-worker.yml) deploys it on every change to `worker/` on `main`, using the repository secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`.

A 4-digit PIN is a convenience, not strong security: anyone who knows the name can try PINs, slowed down by the lockout. Do not reuse a PIN from anything important.

## Recordings

Every phrase has a pre-made mp3 in [audio/](audio), listed in [data/audio.js](data/audio.js). The trainer plays the recording and falls back to the browser's voice only when a phrase has no recording, its recording is out of date, or playback fails. Dialogues are voiced by role: the `speaker` field of a phrase (`m`/`f`) picks the voice.

Recordings are synthesized offline with [Piper](https://github.com/OHF-Voice/piper1-gpl):

| Speaker | Piper voice |
|---|---|
| `m` | `es_ES-sharvard-medium`, speaker 0 ("M") |
| `f` | `es_ES-sharvard-medium`, speaker 1 ("F") |

**Voice credit:** the `es_ES-sharvard-medium` voice was trained on the [Sharvard corpus](https://datashare.ed.ac.uk/handle/10283/574) (Aubanel, García Lecumberri, Cooke; University of Edinburgh), licensed [CC BY 3.0](http://creativecommons.org/licenses/by/3.0/), and fine-tuned from Piper's `hifi_tts_92` base voice.

Only the generated mp3 files are in this repository; the Piper engine (GPL-3.0) and the voice models are not.

### Regenerating after editing lessons

You need Python 3.11–3.14 (onnxruntime has no wheels for newer versions yet) and ffmpeg.

```
python -m venv .venv-piper
.venv-piper/Scripts/python -m pip install -r tools/requirements.txt
.venv-piper/Scripts/python -m piper.download_voices --data-dir <voices-dir> es_ES-sharvard-medium
.venv-piper/Scripts/python tools/generate_audio.py --voices-dir <voices-dir>
```

Only new or changed phrases are re-recorded. A test fails if any phrase lacks an up-to-date recording.

## Progress

Progress lives in the browser (localStorage) and is lost if you clear the browser's data. Click **«Сохранить прогресс в файл»** (save progress to a file) from time to time. You can keep that file in the cloud and load it back with **«Загрузить из файла»** (load from a file). The trainer reminds you if more than a week has passed since the last save.

## Adding a lesson

Lessons live in [data/lessons.js](data/lessons.js). Copy a lesson, change its number `n`, and give every phrase a unique `id`. Never change the `id` of a phrase in a lesson that has already been completed: progress is keyed on it.

In the transcription, put an apostrophe right after the stressed vowel: `"о'ла"` is rendered as «о́ла».

## Tests

Requires Node.js 22.22.2+, 24.15.0+ or 26+ (the minimum for jsdom 31):

```
npm install
npm test
```

- [tests/core.test.js](tests/core.test.js) covers the SM-2 scheduler and answer comparison.
- [tests/lessons.test.js](tests/lessons.test.js) checks lesson data: unique ids, stress marks in transcriptions, paired ¿? and ¡! marks.
- [tests/ui.test.js](tests/ui.test.js) runs the screens in jsdom: lessons, marking a lesson completed, a session with both card directions, the timer, Practice over not-yet-Learned cards, export and import, and voice selection.

GitHub Actions runs the tests on every pull request and on every push to `main` ([.github/workflows/test.yml](.github/workflows/test.yml)), on Node 24 LTS.
