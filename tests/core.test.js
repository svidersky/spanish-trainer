// SM-2 scheduler and answer comparison. Run with: npm test
const test = require('node:test');
const assert = require('node:assert/strict');
const SRS = require('../js/srs.js');
const Diff = require('../js/diff.js');

const NOW = new Date(2026, 10, 23, 18, 30).getTime();
const day = n => SRS.startOfDay(NOW) + n * SRS.DAY;

test('a new card is due immediately', () => {
  const c = SRS.newCard(NOW);
  assert.ok(SRS.isDue(c, NOW));
  assert.ok(!SRS.isLearned(c));
});

test('there are three Grades: again, hard and good ("Легко")', () => {
  assert.deepEqual(SRS.GRADES, ['again', 'hard', 'good']);
  assert.throws(() => SRS.review(SRS.newCard(NOW), 'easy', NOW), /Unknown grade/);
});

test('first answer: each grade gives its own interval (1 / 1 / 3 days)', () => {
  const at = g => SRS.review(SRS.newCard(NOW), g, NOW).interval;
  assert.deepEqual(['again', 'hard', 'good'].map(at), [1, 1, 3]);
});

test('consecutive "good" grades: 3 → 8 → 20 → 50 days', () => {
  let c = SRS.newCard(NOW);
  const seen = [];
  for (let i = 0; i < 4; i++) {
    c = SRS.review(c, 'good', c.due);
    seen.push(c.interval);
  }
  assert.deepEqual(seen, [3, 8, 20, 50]);
});

test('on a review card hard < good, both longer than before', () => {
  const card = { ef: 2.5, reps: 3, interval: 10, lapses: 0, due: NOW, last: null };
  const [hard, good] = ['hard', 'good'].map(g => SRS.review(card, g, NOW).interval);
  assert.deepEqual([hard, good], [12, 25]);
  for (const ease of [1.3, 1.5, 2.5, 3]) {
    const c = { ...card, ef: ease, interval: 1 };
    const [h, g] = ['hard', 'good'].map(x => SRS.review(c, x, NOW).interval);
    assert.ok(1 < h && h < g, `ease ${ease}: ${h} ${g}`);
  }
});

test('a forgotten card starts again from the first-answer intervals', () => {
  let c = { ef: 2.5, reps: 4, interval: 30, lapses: 0, due: NOW, last: null };
  c = SRS.review(c, 'again', NOW);
  assert.equal(c.interval, 1);
  c = SRS.review(c, 'good', c.due);
  assert.equal(c.interval, 3);
});

test('due date is the start of a day, not the exact answer time', () => {
  const c = SRS.review(SRS.newCard(NOW), 'hard', NOW);
  assert.equal(new Date(c.due).getHours(), 0);
  assert.ok(!SRS.isDue(c, NOW));
  assert.ok(SRS.isDue(c, day(1) + 1));
});

test('"again" resets repetitions and removes the Learned status', () => {
  let c = { ef: 2.5, reps: 5, interval: 40, lapses: 0, due: NOW, last: null };
  assert.ok(SRS.isLearned(c));
  c = SRS.review(c, 'again', NOW);
  assert.equal(c.reps, 0);
  assert.equal(c.interval, 1);
  assert.equal(c.lapses, 1);
  assert.ok(!SRS.isLearned(c));
  assert.ok(c.ef < 2.5);
});

test('"hard" lowers ease, "good" keeps it, ease never drops below 1.3', () => {
  const base = SRS.newCard(NOW);
  assert.ok(SRS.review(base, 'hard', NOW).ef < 2.5);
  assert.equal(SRS.review(base, 'good', NOW).ef, 2.5);
  let c = base;
  for (let i = 0; i < 20; i++) c = SRS.review(c, 'again', NOW);
  assert.equal(c.ef, 1.3);
});

test('a card is Learned from a 21-day interval', () => {
  assert.ok(SRS.isLearned({ interval: 21 }));
  assert.ok(!SRS.isLearned({ interval: 20 }));
});

test('the interval always grows after a successful answer', () => {
  let c = { ef: 1.3, reps: 2, interval: 2, lapses: 0, due: NOW, last: null };
  c = SRS.review(c, 'hard', NOW);
  assert.ok(c.interval > 2);
});

test('an unknown grade throws', () => {
  assert.throws(() => SRS.review(SRS.newCard(NOW), 'meh', NOW));
});

// ---------- Archive («Запомненные») ----------

test('archiving freezes the SM-2 state, marks the Card and counts as its latest answer', () => {
  const card = { ef: 2.2, reps: 3, interval: 12, lapses: 2, due: day(5), last: NOW - SRS.DAY };
  const later = NOW + 1000;
  const archived = SRS.archive(card, later);
  assert.deepEqual(archived, { ...card, archived: true, last: later });
  assert.ok(SRS.isArchived(archived));
  assert.ok(!SRS.isArchived(card));
  assert.deepEqual(card, { ef: 2.2, reps: 3, interval: 12, lapses: 2, due: day(5), last: NOW - SRS.DAY }, 'the original is not changed');
});

test('a Grade given to an archived Card returns it to the Deck, scheduled from its frozen state', () => {
  const archived = SRS.archive({ ef: 2.5, reps: 3, interval: 10, lapses: 0, due: day(-30), last: NOW - 40 * SRS.DAY }, NOW - 30 * SRS.DAY);
  const good = SRS.review(archived, 'good', NOW);
  assert.ok(!SRS.isArchived(good));
  assert.equal(good.interval, 25, 'the frozen 10 days × ease 2.5');
  assert.equal(good.due, day(25), 'counted from today');
  const again = SRS.review(archived, 'again', NOW);
  assert.ok(!SRS.isArchived(again));
  assert.equal(again.interval, 1);
  assert.equal(again.lapses, 1);
});

test('answer comparison: exact / almost / different / empty', () => {
  assert.equal(Diff.compare('¿Dónde está el baño?', '¿Dónde está el baño?'), 'exact');
  assert.equal(Diff.compare('  ¿Dónde  está el baño? ', '¿Dónde está el baño?'), 'exact');
  assert.equal(Diff.compare('donde esta el bano', '¿Dónde está el baño?'), 'almost');
  assert.equal(Diff.compare('donde es el baño', '¿Dónde está el baño?'), 'different');
  assert.equal(Diff.compare('   ', 'Hola'), 'empty');
});

test('diff marks extra and missing characters', () => {
  const ops = Diff.diffChars('ola', 'Hola');
  assert.deepEqual(ops, [{ type: 'missing', text: 'H' }, { type: 'same', text: 'ola' }]);
  const ops2 = Diff.diffChars('Holaa', 'Hola');
  assert.deepEqual(ops2, [{ type: 'same', text: 'Hola' }, { type: 'extra', text: 'a' }]);
});
