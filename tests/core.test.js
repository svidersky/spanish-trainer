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

test('first answer: each grade gives its own interval (1 / 3 / 7 days)', () => {
  const at = g => SRS.review(SRS.newCard(NOW), g, NOW).interval;
  assert.deepEqual(['again', 'hard', 'good', 'easy'].map(at), [1, 1, 3, 7]);
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

test('consecutive "easy" grades make a card Learned on the second review', () => {
  let c = SRS.review(SRS.newCard(NOW), 'easy', NOW);
  assert.equal(c.interval, 7);
  c = SRS.review(c, 'easy', c.due);
  assert.equal(c.interval, 24); // 7 × 2.6 × 1.3
  assert.ok(SRS.isLearned(c));
});

test('on a review card hard < good < easy, all longer than before', () => {
  const card = { ef: 2.5, reps: 3, interval: 10, lapses: 0, due: NOW, last: null };
  const [hard, good, easy] = ['hard', 'good', 'easy'].map(g => SRS.review(card, g, NOW).interval);
  assert.deepEqual([hard, good, easy], [12, 25, 33]);
  for (const ease of [1.3, 1.5, 2.5, 3]) {
    const c = { ...card, ef: ease, interval: 1 };
    const [h, g, e] = ['hard', 'good', 'easy'].map(x => SRS.review(c, x, NOW).interval);
    assert.ok(1 < h && h < g && g < e, `ease ${ease}: ${h} ${g} ${e}`);
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
