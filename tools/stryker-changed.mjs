// Runs StrykerJS on the lines of js/*.js that this branch added or changed against a base ref,
// e.g. `node tools/stryker-changed.mjs origin/main`. Exits 0 without running Stryker when no
// app line changed (Stryker fails on an empty selection), and with Stryker's code otherwise.
import { execFileSync, spawnSync } from 'node:child_process';

const base = process.argv[2];
if (!base) {
  console.error('Usage: node tools/stryker-changed.mjs <base-ref>');
  process.exit(2);
}

// -U0: hunks without context, so each "+start,count" is exactly the added or changed lines.
// Throws (and fails the step) when the base ref is missing, e.g. in a shallow clone.
const diff = execFileSync(
  'git',
  ['diff', '-U0', '--diff-filter=AM', '--no-color', `${base}...HEAD`, '--', 'js/*.js'],
  { encoding: 'utf8' },
);

const ranges = [];
let file = null;
for (const line of diff.split('\n')) {
  const header = line.match(/^\+\+\+ b\/(.+)$/);
  if (header) {
    file = header[1];
    continue;
  }
  const hunk = line.match(/^@@ -\S+ \+(\d+)(?:,(\d+))? @@/);
  if (!hunk || !file) continue;
  const start = Number(hunk[1]);
  const count = hunk[2] === undefined ? 1 : Number(hunk[2]);
  if (count > 0) ranges.push(`${file}:${start}-${start + count - 1}`);
}

if (ranges.length === 0) {
  console.log(`No app lines (js/*.js) changed against ${base}: nothing to mutate.`);
  process.exit(0);
}

console.log(`Mutating the changed lines:\n  ${ranges.join('\n  ')}`);
const run = spawnSync('npx', ['stryker', 'run', '--mutate', ranges.join(',')], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
});
process.exit(run.status ?? 1);
