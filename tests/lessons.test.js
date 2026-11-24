// Lesson data checks: Lessons, Phrases, Transcriptions.
const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { read } = require('./helpers/dom');

const ctx = { window: {} };
vm.runInNewContext(read('data/lessons.js'), ctx);
const LESSONS = JSON.parse(JSON.stringify(ctx.window.LESSONS));
const PHRASES = LESSONS.flatMap(l => l.phrases.map(p => ({ ...p, lesson: l.n })));

const VOWELS = 'аеёиоуыэюя';

// Syllables in a Transcription word. «у» before a vowel is a glide (буэн, куаль), not a syllable.
function syllables(word) {
  const w = word.toLowerCase().replace(/'/g, '');
  let n = 0;
  for (let i = 0; i < w.length; i++) {
    if (!VOWELS.includes(w[i])) continue;
    if (w[i] === 'у' && VOWELS.includes(w[i + 1] || '')) continue;
    n++;
  }
  return n;
}

const words = tr => tr.split(/[\s,.!?¿¡]+/).filter(Boolean);

test('lessons are numbered consecutively from 1', () => {
  assert.ok(LESSONS.length >= 10);
  LESSONS.forEach((l, i) => assert.equal(l.n, i + 1));
});

test('every lesson has a title, translation, phrases and notes', () => {
  for (const l of LESSONS) {
    assert.ok(l.title && l.ru, `lesson ${l.n}: missing title`);
    assert.ok(l.phrases.length >= 5 && l.phrases.length <= 10, `lesson ${l.n}: a dialogue must have 5–10 phrases`);
    assert.ok(Array.isArray(l.notes) && l.notes.length > 0, `lesson ${l.n}: missing notes`);
  }
});

test('phrase ids are unique and follow lNN-NN of their own lesson', () => {
  const seen = new Set();
  for (const p of PHRASES) {
    assert.match(p.id, /^l\d{2}-\d{2}$/);
    assert.equal(Number(p.id.slice(1, 3)), p.lesson, `${p.id} is in lesson ${p.lesson}`);
    assert.ok(!seen.has(p.id), `duplicate id ${p.id}`);
    seen.add(p.id);
  }
});

test('every phrase has a speaker: m or f', () => {
  for (const p of PHRASES) assert.match(p.speaker || '', /^[mf]$/, `${p.id}: speaker`);
});

test('every phrase has an up-to-date Recording (else run tools/generate_audio.py)', () => {
  const actx = { window: {} };
  vm.runInNewContext(read('data/audio.js'), actx);
  const audio = JSON.parse(JSON.stringify(actx.window.AUDIO));
  const fs = require('node:fs');
  const path = require('node:path');
  for (const p of PHRASES) {
    const rec = audio[p.id];
    assert.ok(rec, `${p.id}: no Recording`);
    assert.equal(rec.text, p.es, `${p.id}: Recording was made from different text`);
    assert.equal(rec.speaker, p.speaker, `${p.id}: Recording has a different speaker`);
    assert.ok(fs.existsSync(path.join(__dirname, '..', rec.file)), `${p.id}: ${rec.file} is missing`);
  }
  const ids = new Set(PHRASES.map(p => p.id));
  for (const id of Object.keys(audio)) assert.ok(ids.has(id), `Recording for unknown phrase ${id}`);
});

test('every phrase has Spanish text, a Transcription and a translation', () => {
  for (const p of PHRASES) {
    for (const k of ['es', 'tr', 'ru']) {
      assert.equal(typeof p[k], 'string', `${p.id}.${k}`);
      assert.ok(p[k].trim().length > 0, `${p.id}.${k} is empty`);
      assert.equal(p[k], p[k].trim(), `${p.id}.${k}: leading or trailing whitespace`);
    }
  }
});

test('a Transcription uses only Russian letters, punctuation and stress apostrophes', () => {
  for (const p of PHRASES) {
    assert.match(p.tr, /^[а-яё\s,.!?'-]+$/i, `${p.id}: «${p.tr}»`);
  }
});

test('a stress apostrophe follows a vowel, at most one per word', () => {
  for (const p of PHRASES) {
    for (const w of words(p.tr)) {
      const marks = (w.match(/'/g) || []).length;
      assert.ok(marks <= 1, `${p.id}: two stress marks in «${w}»`);
      if (marks) {
        const before = w[w.indexOf("'") - 1] || '';
        assert.ok(VOWELS.includes(before.toLowerCase()), `${p.id}: apostrophe not after a vowel in «${w}»`);
      }
    }
  }
});

test('multi-syllable Transcription words have a stress mark', () => {
  for (const p of PHRASES) {
    for (const w of words(p.tr)) {
      if (syllables(w) > 1) assert.ok(w.includes("'"), `${p.id}: no stress mark in «${w}»`);
    }
  }
});

test('Spanish questions and exclamations open with inverted marks', () => {
  for (const p of PHRASES) {
    const count = ch => p.es.split(ch).length - 1;
    assert.equal(count('¿'), count('?'), `${p.id}: ¿ and ? are not paired`);
    assert.equal(count('¡'), count('!'), `${p.id}: ¡ and ! are not paired`);
  }
});

test('a Transcription ends with the same mark as its Spanish phrase', () => {
  for (const p of PHRASES) {
    const last = p.es.at(-1);
    if (last === '?' || last === '!') assert.equal(p.tr.at(-1), last, `${p.id}: «${p.tr}»`);
  }
});

test('Spanish phrases are not repeated', () => {
  const seen = new Map();
  for (const p of PHRASES) {
    assert.ok(!seen.has(p.es), `«${p.es}» is in both ${seen.get(p.es)} and ${p.id}`);
    seen.set(p.es, p.id);
  }
});
