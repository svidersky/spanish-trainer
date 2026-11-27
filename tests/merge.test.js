// Merging two copies of a learner's progress (this device and the Sync server).
const test = require('node:test');
const assert = require('node:assert/strict');
const Merge = require('../js/merge.js');
const SRS = require('../js/srs.js');

const card = (last, interval = 1) => ({ ef: 2.5, reps: 1, interval, lapses: 0, due: last + interval, last });

const progress = (over = {}) => ({
  version: 1,
  completedLessons: [],
  cards: {},
  settings: { sessionMinutes: 15 },
  settingsUpdatedAt: null,
  lastExport: null,
  ...over,
});

test('without a server copy, the local progress is kept as is', () => {
  const local = progress({ completedLessons: [1], cards: { 'l01-01|recog': card(100) } });
  assert.deepEqual(Merge.merge(local, null), local);
});

test('for a Card answered on both devices, the more recent answer wins', () => {
  const local = progress({ cards: { a: card(200, 3), b: card(100, 1) } });
  const remote = progress({ cards: { a: card(100, 1), b: card(300, 8) } });
  const merged = Merge.merge(local, remote);
  assert.equal(merged.cards.a.interval, 3, 'local answer is newer');
  assert.equal(merged.cards.b.interval, 8, 'remote answer is newer');
});

test('a Card that was never answered loses to one that was', () => {
  const fresh = { ef: 2.5, reps: 0, interval: 0, lapses: 0, due: 50, last: null };
  const merged = Merge.merge(progress({ cards: { a: fresh } }), progress({ cards: { a: card(10, 3) } }));
  assert.equal(merged.cards.a.interval, 3);
});

test('moving a Card to the Archive reaches the other device and later answers bring it back', () => {
  const archivedHere = SRS.archive(card(100, 3), 200);
  const merged = Merge.merge(progress({ cards: { a: archivedHere } }), progress({ cards: { a: card(150, 8) } }));
  assert.ok(SRS.isArchived(merged.cards.a), 'archiving after the remote answer wins');
  const answeredThere = Merge.merge(progress({ cards: { a: archivedHere } }), progress({ cards: { a: card(300, 8) } }));
  assert.ok(!SRS.isArchived(answeredThere.cards.a), 'a later answer elsewhere wins over archiving');
});

test('on an exact tie the local Card is kept', () => {
  const merged = Merge.merge(progress({ cards: { a: card(100, 3) } }), progress({ cards: { a: card(100, 8) } }));
  assert.equal(merged.cards.a.interval, 3);
});

test('Cards present on only one side are all kept', () => {
  const merged = Merge.merge(progress({ cards: { a: card(1) } }), progress({ cards: { b: card(2) } }));
  assert.deepEqual(Object.keys(merged.cards).sort(), ['a', 'b']);
});

test('Completed Lessons are the union of both sides, sorted', () => {
  const merged = Merge.merge(progress({ completedLessons: [3, 1] }), progress({ completedLessons: [2, 3] }));
  assert.deepEqual(merged.completedLessons, [1, 2, 3]);
});

test('settings come from the side that changed them last', () => {
  const local = progress({ settings: { sessionMinutes: 10 }, settingsUpdatedAt: 500 });
  const remote = progress({ settings: { sessionMinutes: 25 }, settingsUpdatedAt: 900 });
  assert.equal(Merge.merge(local, remote).settings.sessionMinutes, 25);
  assert.equal(Merge.merge(remote, local).settings.sessionMinutes, 25);
});

test('settings never changed on this device do not override changed remote ones', () => {
  const local = progress({ settings: { sessionMinutes: 15 }, settingsUpdatedAt: null });
  const remote = progress({ settings: { sessionMinutes: 30 }, settingsUpdatedAt: 10 });
  assert.equal(Merge.merge(local, remote).settings.sessionMinutes, 30);
});

test('the latest export date of the two is kept', () => {
  assert.equal(Merge.merge(progress({ lastExport: 5 }), progress({ lastExport: 9 })).lastExport, 9);
  assert.equal(Merge.merge(progress({ lastExport: null }), progress({ lastExport: 9 })).lastExport, 9);
});

test('merging is symmetric for Cards and idempotent', () => {
  const a = progress({ completedLessons: [1], cards: { x: card(1), y: card(9) } });
  const b = progress({ completedLessons: [2], cards: { x: card(5), z: card(3) } });
  assert.deepEqual(Merge.merge(a, b).cards, Merge.merge(b, a).cards);
  const once = Merge.merge(a, b);
  assert.deepEqual(Merge.merge(once, b), once);
});

test('merging does not modify its inputs', () => {
  const a = progress({ cards: { x: card(1) } });
  const b = progress({ cards: { x: card(5) } });
  const before = JSON.stringify([a, b]);
  Merge.merge(a, b);
  assert.equal(JSON.stringify([a, b]), before);
});
