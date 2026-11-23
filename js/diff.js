// Сравнение напечатанного Ответа с правильной Фразой: подсветка, но не оценка.
(function (root) {
  'use strict';

  // Посимвольный diff по наибольшей общей подпоследовательности.
  // same — совпало, extra — лишнее у ученика, missing — не хватает у ученика.
  function diffChars(typed, correct) {
    const a = Array.from(typed);
    const b = Array.from(correct);
    const n = a.length, m = b.length;
    const dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
    for (let i = n - 1; i >= 0; i--) {
      for (let j = m - 1; j >= 0; j--) {
        dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
      }
    }
    const ops = [];
    let i = 0, j = 0;
    while (i < n && j < m) {
      if (a[i] === b[j]) { push(ops, 'same', a[i]); i++; j++; }
      else if (dp[i + 1][j] >= dp[i][j + 1]) { push(ops, 'extra', a[i]); i++; }
      else { push(ops, 'missing', b[j]); j++; }
    }
    while (i < n) push(ops, 'extra', a[i++]);
    while (j < m) push(ops, 'missing', b[j++]);
    return ops;
  }

  // Склеивает соседние символы одного типа в один кусок.
  function push(ops, type, ch) {
    const last = ops[ops.length - 1];
    if (last && last.type === type) last.text += ch;
    else ops.push({ type, text: ch });
  }

  // Без ударений, ñ→n, регистра, знаков препинания и лишних пробелов.
  function loose(s) {
    return s
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[¿?¡!.,;:"«»()\-–—…]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // 'exact' | 'almost' (только ударения/ñ/регистр/знаки) | 'different' | 'empty'
  function compare(typed, correct) {
    const t = typed.trim().replace(/\s+/g, ' ');
    if (!t) return 'empty';
    if (t === correct) return 'exact';
    if (loose(t) === loose(correct)) return 'almost';
    return 'different';
  }

  const Diff = { diffChars, compare, loose };
  if (typeof module !== 'undefined' && module.exports) module.exports = Diff;
  else root.Diff = Diff;
})(typeof window !== 'undefined' ? window : globalThis);
