# Project conventions

- **Language.** All project documentation is written in English: README, CONTEXT.md, ADRs, code comments, test names and assertion messages, commit messages, and PR descriptions. Only learner-facing content is in Russian (UI strings and lesson translations) or Spanish (lesson phrases).
- **Domain terms.** Use the glossary in [CONTEXT.md](CONTEXT.md) (Lesson, Phrase, Card, Recognition, Production, Grade, Session, Deck, Learned, Transcription).
- **No build step.** The app must keep working when `index.html` is opened from disk: plain `<script>` tags, no ES modules, no `fetch` of local files.
- **Tests.** `npm test` (Node 22.22.2+ / 24.15.0+, jsdom 31). See README.
- **Dependencies: well-known libraries only.** Add a library only if it is widely used and actively maintained (e.g. jsdom, Playwright). No obscure or single-maintainer packages, and no copy-pasted snippets of unknown origin. Prefer the platform (browser APIs, `node:test`) when it does the job.
- **Library facts come from the source, not from memory.** Before adding, upgrading or using a library API, check its official website, docs or registry page (e.g. npmjs.com, the project's GitHub releases) for the current version, API and requirements. Do not rely on remembered versions or signatures.
