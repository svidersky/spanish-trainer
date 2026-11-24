// Spaced repetition: SM-2 ease updates with Anki-style intervals, using four Grades.
// Works in the browser (window.SRS) and in Node (module.exports) for tests.
(function (root) {
  'use strict';

  const DAY = 24 * 60 * 60 * 1000;
  const LEARNED_DAYS = 21;

  // Learner's Grade -> SM-2 response quality q (0..5).
  const QUALITY = { again: 1, hard: 3, good: 4, easy: 5 };
  const GRADES = ['again', 'hard', 'good', 'easy'];

  // Days until the next review after the first successful answer, by Grade.
  const FIRST_INTERVAL = { hard: 1, good: 3, easy: 7 };
  // Multipliers as in Anki's SM-2 deck options (https://docs.ankiweb.net/deck-options.html).
  const HARD_FACTOR = 1.2;
  const EASY_BONUS = 1.3;

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

    if (grade === 'again') {
      reps = 0;
      interval = 1;
      lapses += 1;
    } else if (reps === 0) {
      // First successful answer of a new (or just-forgotten) Card: the Grade picks the interval.
      reps = 1;
      interval = FIRST_INTERVAL[grade];
    } else {
      // Anki's SM-2 modifiers: hard = previous × 1.2, good = previous × ease, easy = good × 1.3.
      // Each Grade gets a strictly longer interval than the one below it, and longer than before.
      reps += 1;
      const prev = Math.max(1, interval);
      const hard = Math.max(prev + 1, Math.round(prev * HARD_FACTOR));
      const good = Math.max(hard + 1, Math.round(prev * ef));
      const easy = Math.max(good + 1, Math.round(prev * ef * EASY_BONUS));
      interval = { hard, good, easy }[grade];
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

  function daysUntilDue(card, now) {
    if (card.due <= now) return 0;
    return Math.ceil((card.due - startOfDay(now)) / DAY);
  }

  function round2(x) {
    return Math.round(x * 100) / 100;
  }

  const SRS = { DAY, LEARNED_DAYS, GRADES, FIRST_INTERVAL, newCard, review, isDue, isLearned, startOfDay, daysUntilDue };

  if (typeof module !== 'undefined' && module.exports) module.exports = SRS;
  else root.SRS = SRS;
})(typeof window !== 'undefined' ? window : globalThis);
