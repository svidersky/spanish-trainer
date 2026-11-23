# Project conventions

- **Language.** All project documentation is written in English: README, CONTEXT.md, ADRs, code comments, test names and assertion messages, commit messages, and PR descriptions. Only learner-facing content is in Russian (UI strings and lesson translations) or Spanish (lesson phrases).
- **Domain terms.** Use the glossary in [CONTEXT.md](CONTEXT.md) (Lesson, Phrase, Card, Recognition, Production, Grade, Session, Deck, Learned, Transcription).
- **No build step.** The app must keep working when `index.html` is opened from disk: plain `<script>` tags, no ES modules, no `fetch` of local files.
- **Tests.** `npm test` (Node 20+, jsdom). See README.
