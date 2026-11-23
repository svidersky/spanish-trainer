// Проверка учебных данных: уроки, Фразы, Транскрипция.
const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { read } = require('./helpers/dom');

const ctx = { window: {} };
vm.runInNewContext(read('data/lessons.js'), ctx);
const LESSONS = JSON.parse(JSON.stringify(ctx.window.LESSONS));
const PHRASES = LESSONS.flatMap(l => l.phrases.map(p => ({ ...p, lesson: l.n })));

const VOWELS = 'аеёиоуыэюя';

// Слоги в слове Транскрипции. «у» перед гласной — полугласный звук (буэн, куаль), не слог.
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

test('уроки пронумерованы подряд с 1', () => {
  assert.ok(LESSONS.length >= 10);
  LESSONS.forEach((l, i) => assert.equal(l.n, i + 1));
});

test('у каждого урока есть название, перевод, фразы и пояснения', () => {
  for (const l of LESSONS) {
    assert.ok(l.title && l.ru, `урок ${l.n}: нет названия`);
    assert.ok(l.phrases.length >= 5 && l.phrases.length <= 10, `урок ${l.n}: в диалоге должно быть 5–10 фраз`);
    assert.ok(Array.isArray(l.notes) && l.notes.length > 0, `урок ${l.n}: нет пояснений`);
  }
});

test('id фраз уникальны и в формате lNN-NN своего урока', () => {
  const seen = new Set();
  for (const p of PHRASES) {
    assert.match(p.id, /^l\d{2}-\d{2}$/);
    assert.equal(Number(p.id.slice(1, 3)), p.lesson, `${p.id} лежит в уроке ${p.lesson}`);
    assert.ok(!seen.has(p.id), `повтор id ${p.id}`);
    seen.add(p.id);
  }
});

test('у каждой фразы заполнены испанский текст, Транскрипция и перевод', () => {
  for (const p of PHRASES) {
    for (const k of ['es', 'tr', 'ru']) {
      assert.equal(typeof p[k], 'string', `${p.id}.${k}`);
      assert.ok(p[k].trim().length > 0, `${p.id}.${k} пустое`);
      assert.equal(p[k], p[k].trim(), `${p.id}.${k}: лишние пробелы по краям`);
    }
  }
});

test('Транскрипция — только русские буквы, знаки препинания и апострофы ударения', () => {
  for (const p of PHRASES) {
    assert.match(p.tr, /^[а-яё\s,.!?'-]+$/i, `${p.id}: «${p.tr}»`);
  }
});

test('апостроф ударения стоит сразу после гласной, не больше одного на слово', () => {
  for (const p of PHRASES) {
    for (const w of words(p.tr)) {
      const marks = (w.match(/'/g) || []).length;
      assert.ok(marks <= 1, `${p.id}: два ударения в «${w}»`);
      if (marks) {
        const before = w[w.indexOf("'") - 1] || '';
        assert.ok(VOWELS.includes(before.toLowerCase()), `${p.id}: апостроф не после гласной в «${w}»`);
      }
    }
  }
});

test('в многосложных словах Транскрипции отмечено ударение', () => {
  for (const p of PHRASES) {
    for (const w of words(p.tr)) {
      if (syllables(w) > 1) assert.ok(w.includes("'"), `${p.id}: нет ударения в «${w}»`);
    }
  }
});

test('испанские вопросы и восклицания открываются перевёрнутыми знаками', () => {
  for (const p of PHRASES) {
    const count = ch => p.es.split(ch).length - 1;
    assert.equal(count('¿'), count('?'), `${p.id}: ¿ и ? не в паре`);
    assert.equal(count('¡'), count('!'), `${p.id}: ¡ и ! не в паре`);
  }
});

test('Транскрипция заканчивается тем же знаком, что и испанская фраза', () => {
  for (const p of PHRASES) {
    const last = p.es.at(-1);
    if (last === '?' || last === '!') assert.equal(p.tr.at(-1), last, `${p.id}: «${p.tr}»`);
  }
});

test('испанские фразы не повторяются', () => {
  const seen = new Map();
  for (const p of PHRASES) {
    assert.ok(!seen.has(p.es), `«${p.es}» и в ${seen.get(p.es)}, и в ${p.id}`);
    seen.set(p.es, p.id);
  }
});
