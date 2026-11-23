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

test('consecutive "good" grades: 1 → 6 → ~15 days', () => {
  let c = SRS.newCard(NOW);
  c = SRS.review(c, 'good', NOW);
  assert.equal(c.interval, 1);
  assert.equal(c.due, day(1));
  c = SRS.review(c, 'good', c.due);
  assert.equal(c.interval, 6);
  c = SRS.review(c, 'good', c.due);
  assert.equal(c.interval, 15); // 6 * 2.5
});

test('due date is the start of a day, not the exact answer time', () => {
  const c = SRS.review(SRS.newCard(NOW), 'good', NOW);
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

test('"hard" lowers ease, "easy" raises it, ease never drops below 1.3', () => {
  const base = SRS.newCard(NOW);
  assert.ok(SRS.review(base, 'hard', NOW).ef < 2.5);
  assert.ok(SRS.review(base, 'easy', NOW).ef > 2.5);
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
