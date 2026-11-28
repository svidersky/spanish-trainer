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

Progress is stored per device and browser. To move it, export it to a file on one device and import it on the other: both are on the settings page (the ⚙ gear in the header). While the progress has no recent file copy, the home screen reminds you and the gear shows a dot.

## Sync between devices

On the settings page (the ⚙ gear in the header), enter a name and a 4-digit PIN (the same on every device). Progress then syncs automatically: when the app opens and a couple of seconds after every answer. The first sync with a new name creates its Profile; after 5 wrong PINs the name is locked for an hour.

The Sync server runs at `https://spanish-progress.spanish-trainer.workers.dev` (`DEFAULT_URL` in [js/sync.js](js/sync.js)). It is a Cloudflare Worker in [worker/](worker) with one SQLite-backed Durable Object per Profile (free plan). The object stores the Profile's progress with a salted SHA-256 of the PIN and a version number, and handles its requests strictly one at a time. The app merges ([js/merge.js](js/merge.js)) and saves with the version it started from; a save based on an old version gets the current copy back to merge, so two devices never overwrite each other, even when they save at the same moment. [.github/workflows/deploy-worker.yml](.github/workflows/deploy-worker.yml) deploys it on every change to `worker/` on `main`, using the repository secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`.

A 4-digit PIN is a convenience, not strong security: anyone who knows the name can try PINs, slowed down by the lockout. Do not reuse a PIN from anything important.

## Error monitoring

Uncaught errors in the app are reported to [Sentry](https://sentry.io) (project `spanish-trainer` in the `ls-1h` organization). `index.html` loads Sentry's [Loader Script](https://docs.sentry.io/platforms/javascript/install/loader/); its SDK version and features (tracing, Session Replay) are set in the project's settings under SDK Setup → Loader Script, not in this repository. [js/monitoring.js](js/monitoring.js) initialises it: errors are tagged `production` on GitHub Pages and `local` anywhere else (a file opened from disk, a local server), and are sent without personal data (`sendDefaultPii: false`).

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
npm ci
npm test
npm run lint
```

`npm run lint` runs ESLint ([eslint.config.js](eslint.config.js)) over the app, the tests and the Sync server.

`npm ci` installs exactly the versions recorded in `package-lock.json`. After changing `package.json`, update the lockfile in the same commit (`npm install --package-lock-only`), or CI fails.

- [tests/core.test.js](tests/core.test.js) covers the SM-2 scheduler and answer comparison.
- [tests/lessons.test.js](tests/lessons.test.js) checks lesson data: unique ids, stress marks in transcriptions, paired ¿? and ¡! marks.
- [tests/ui.test.js](tests/ui.test.js) runs the screens in jsdom: home and the settings page, lessons, marking a lesson completed, a session with both card directions, the timer, Practice over not-yet-Learned cards, the Archive («Всё, запомнил» and its random check), export and import, and voice selection.
- [tests/monitoring.test.js](tests/monitoring.test.js) checks the Sentry setup: the environment tag, no personal data, and that index.html loads Sentry before the app.

### Mutation tests

[StrykerJS](https://stryker-mutator.io) checks that the tests would notice a wrong answer, not just that they run the code: it makes one small change to the app at a time (a "mutant": `<` for `<=`, `true` for `false`, a removed call) and reruns the tests. A mutant that no test notices survives and points at a missing or too weak assertion.

- On every pull request, [.github/workflows/mutation.yml](.github/workflows/mutation.yml) mutates only the lines of `js/*.js` the pull request added or changed ([tools/stryker-changed.mjs](tools/stryker-changed.mjs)) and fails when fewer than 80% of their mutants are caught. The log lists each survivor; the HTML report is in the run's artifacts.
- Every Monday, and on demand from the Actions tab, it mutates the whole app as a report that never fails.
- A mutant that behaves exactly like the original (an "equivalent" mutant) can be switched off with a comment that says why, e.g. `// Stryker disable next-line EqualityOperator: 0 and below give the same result`.
- Locally: `npm run mutate` (whole app) or `node tools/stryker-changed.mjs origin/main`.

The UI tests run the app inside jsdom, so [tests/helpers/dom.js](tests/helpers/dom.js) passes Stryker's state to the jsdom window; outside Stryker it does nothing.

GitHub Actions runs the tests on every pull request and on every push to `main` ([.github/workflows/test.yml](.github/workflows/test.yml)), on Node 24 LTS, after the linter. The same workflow lints the workflows themselves with [jactionlint](https://jactionlint.jdx.dev): every action is pinned to a full commit SHA (with its version in a comment), and each job gets only the token permissions it needs. [Dependabot](.github/dependabot.yml) opens at most one pull request a week for the npm packages (with `package-lock.json`) and one for the actions (new SHAs and version comments), each for releases at least 7 days old.

[Betterleaks](https://github.com/betterleaks/betterleaks) scans for committed secrets (API tokens, keys) ([.github/workflows/secrets.yml](.github/workflows/secrets.yml)): on a pull request it scans the commits the pull request adds, on a push to `main` the pushed commits, and a manual run from the Actions tab scans the whole history. A finding fails the check; the log shows the file, line and rule with the secret redacted. Remove the secret from the branch and revoke it: once pushed to a public repository, it is exposed.

[lychee](https://lychee.cli.rs) checks the links in `README.md`, `CONTEXT.md` and `CLAUDE.md` and the URLs in comments under `js/`, `worker/` and `.github/` ([.github/workflows/links.yml](.github/workflows/links.yml)). It runs every Monday and on demand from the Actions tab, never on pull requests, so a site that is briefly down cannot block one. A broken link fails the run and opens an issue titled "Broken links" (or comments on the open one). Links that CI cannot check (the Sync server, which only answers the app's requests) are listed in [.lycheeignore](.lycheeignore).

[agnix](https://github.com/agent-sh/agnix) lints the agent configuration, `CLAUDE.md` and `.claude/`, with its Claude Code rules (the `agent-config` job in the same workflow): an error, such as an `@import` of a missing file or an unknown hook event, fails the job; warnings are printed but do not fail it.
