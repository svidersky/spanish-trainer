// Spaced repetition with SM-2 (as in Anki), using four Grades.
// Works in the browser (window.SRS) and in Node (module.exports) for tests.
(function (root) {
  'use strict';

  const DAY = 24 * 60 * 60 * 1000;
  const LEARNED_DAYS = 21;

  // Learner's Grade -> SM-2 response quality q (0..5).
  const QUALITY = { again: 1, hard: 3, good: 4, easy: 5 };
  const GRADES = ['again', 'hard', 'good', 'easy'];

  function startOfDay(ts) {
    const d = new Date(ts);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }

  // A new Card is due immediately.
  function newCard(now) {
    return { ef: 2.5, reps: 0, interval: 0, lapses: 0, due: now, last: null };
  }

  function review(card, grade, now) {
    const q = QUALITY[grade];
    if (q === undefined) throw new Error('Unknown grade: ' + grade);

    let { ef, reps, interval, lapses } = card;

    if (q < 3) {
      reps = 0;
      interval = 1;
      lapses += 1;
    } else {
      reps += 1;
      if (reps === 1) interval = 1;
      else if (reps === 2) interval = 6;
      else interval = Math.max(interval + 1, Math.round(interval * ef));
    }

    ef = Math.max(1.3, ef + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)));

    // Due at the start of the day, so the Card is available from the morning of that day.
    const due = startOfDay(now) + interval * DAY;
    return { ef: round2(ef), reps, interval, lapses, due, last: now };
  }

  function isDue(card, now) {
    return card.due <= now;
  }

  function isLearned(card) {
    return card.interval >= LEARNED_DAYS;
  }

  function round2(x) {
    return Math.round(x * 100) / 100;
  }

  const SRS = { DAY, LEARNED_DAYS, GRADES, newCard, review, isDue, isLearned, startOfDay };

  if (typeof module !== 'undefined' && module.exports) module.exports = SRS;
  else root.SRS = SRS;
})(typeof window !== 'undefined' ? window : globalThis);
