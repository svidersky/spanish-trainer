# Project conventions

- **Language.** All project documentation is written in English: README, CONTEXT.md, ADRs, code comments, test names and assertion messages, commit messages, and PR descriptions. Only learner-facing content is in Russian (UI strings and lesson translations) or Spanish (lesson phrases).
- **Domain terms.** Use the glossary in [CONTEXT.md](CONTEXT.md) (Lesson, Phrase, Card, Recognition, Production, Grade, Session, Deck, Learned, Transcription, Speaker, Recording, Profile, Sync).
- **No build step.** The app must keep working when `index.html` is opened from disk: plain `<script>` tags, no ES modules, no `fetch` of local files.
- **Tests.** `npm test` (Node 22.22.2+ / 24.15.0+, jsdom 31). See README.
- **TDD, always, for any change in behaviour.** Features, bug fixes, scheduling rules, UI flows: tests come first, then code. Never write or change production code for such a change before its tests exist.
  1. **Write the tests that matter for the change first**: the behaviour the user asked for, its edge cases, and the old behaviour it must not break. Test through the public surface (the `SRS`/`Diff` APIs, the screens in jsdom), not implementation details.
  2. **Check that the tests really test it.** Re-read each test against the request: would it pass with the old code (then it tests nothing new)? Would it still pass with a plausible wrong implementation (then it is too weak)? Does every assertion pin required behaviour rather than an incidental detail? Fix the tests until the answers are right.
  3. **Red on CI.** Node.js is not installed on the dev machine, so the red phase runs on CI: commit and push the tests alone (message starting `test:`), and confirm in the CI log that exactly the new tests fail, for the expected reason (missing behaviour, not a typo or broken setup). This red run is expected: when Auto-fix reports it, do not "fix" it by weakening the tests.
  4. **Then write the code**, in a separate commit, until CI is green. Refactor only while green.
  - Not required for changes with no behaviour change: docs, lesson content and Recordings (covered by the data tests), pure refactors (existing tests must stay green).
  - If a change cannot be covered by an automated test (e.g. real audio output), say so in the PR and describe the manual check instead.
- **Dependencies: well-known libraries only.** Add a library only if it is widely used and actively maintained (e.g. jsdom, Playwright). No obscure or single-maintainer packages, and no copy-pasted snippets of unknown origin. Prefer the platform (browser APIs, `node:test`) when it does the job.
- **Library facts come from the source, not from memory.** Before adding, upgrading or using a library API, check its official website, docs or registry page (e.g. npmjs.com, the project's GitHub releases) for the current version, API and requirements. Do not rely on remembered versions or signatures.
