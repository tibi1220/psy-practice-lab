import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';
const source = await readFile(
  new URL('../src/lib/concentration.ts', import.meta.url),
  'utf8',
);
const { outputText } = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  },
});
const m = await import(
  `data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`
);
function seeded(seed) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 2 ** 32;
  };
}
const fixture = {
  glyph: 'e',
  rotation: 0,
  difficulty: 0,
  dots: [
    { x: 80, y: 42 },
    { x: 110, y: 178 },
    { x: 140, y: 178 },
  ],
};

test('concentration requires both an upright complete E and exactly three surrounding dots', () => {
  assert.equal(m.concentrationAnswer(fixture), true);
  for (const glyph of m.CONCENTRATION_GLYPHS.slice(1))
    assert.equal(m.concentrationAnswer({ ...fixture, glyph }), false);
  for (const rotation of [90, 180, 270])
    assert.equal(m.concentrationAnswer({ ...fixture, rotation }), false);
  for (const count of [2, 4, 5])
    assert.equal(
      m.concentrationAnswer({
        ...fixture,
        dots: Array.from({ length: count }, () => ({ x: 52, y: 75 })),
      }),
      false,
    );
  assert.equal(
    m.concentrationAnswer({
      ...fixture,
      dots: [
        { x: 52, y: 75 },
        { x: 168, y: 110 },
        { x: 110, y: 42 },
      ],
    }),
    true,
    'dot placement does not change the rule',
  );
});

test('concentration generation supplies readable valid targets and both kinds of distractors at every level', () => {
  const random = seeded(527398);
  for (let difficulty = 0; difficulty < 3; difficulty++) {
    let targets = 0,
      wrongSymbols = 0,
      wrongCounts = 0;
    const glyphs = new Set();
    for (let index = 0; index < 500; index++) {
      const puzzle = m.createConcentrationPuzzle(
        difficulty > 0,
        random,
        difficulty,
      );
      assert.ok(m.isConcentrationPuzzle(puzzle));
      assert.equal(puzzle.difficulty, difficulty);
      const actual =
        puzzle.glyph === 'e' &&
        puzzle.rotation === 0 &&
        puzzle.dots.length === 3;
      assert.equal(m.concentrationAnswer(puzzle), actual);
      if (actual) targets++;
      else if (puzzle.glyph === 'e') wrongCounts++;
      else wrongSymbols++;
      glyphs.add(puzzle.glyph);
      assert.match(
        m.concentrationExplanation(puzzle),
        /Both conditions must hold/,
      );
    }
    assert.ok(targets > 200 && targets < 300);
    assert.ok(wrongSymbols > 50 && wrongCounts > 40);
    assert.ok(glyphs.size >= 4);
    if (difficulty === 2)
      assert.ok(glyphs.has('broken-e') && glyphs.has('closed-e'));
  }
});

test('later concentration rounds introduce closer distractors without changing the target rule', () => {
  assert.deepEqual(
    [0, 14, 15, 29, 30, 100].map(round =>
      m.concentrationDifficulty(round, 'adaptive'),
    ),
    [0, 0, 1, 1, 2, 2],
  );
  assert.equal(m.concentrationDifficulty(0, 'hard'), 1);
  assert.equal(m.concentrationDifficulty(15, 'hard'), 2);
  assert.equal(m.concentrationDifficulty(100, 'easy'), 0);
});

test('A/D shortcut handling ignores held keys, modifiers, and editing fields', () => {
  const event = {
    key: 'a',
    repeat: false,
    altKey: false,
    ctrlKey: false,
    metaKey: false,
  };
  assert.equal(m.concentrationKey(event), false);
  assert.equal(m.concentrationKey({ ...event, key: 'D' }), true);
  assert.equal(m.concentrationKey({ ...event, key: 'Enter' }), null);
  for (const flag of ['repeat', 'altKey', 'ctrlKey', 'metaKey', 'editable'])
    assert.equal(m.concentrationKey({ ...event, [flag]: true }), null);
  for (const targetTag of ['INPUT', 'TEXTAREA', 'SELECT'])
    assert.equal(m.concentrationKey({ ...event, targetTag }), null);
});

test('saved concentration objects reject unknown symbols, malformed dots, overlap, and invalid difficulty', () => {
  assert.ok(m.isConcentrationPuzzle(fixture));
  for (const puzzle of [
    { ...fixture, glyph: 'unknown' },
    { ...fixture, rotation: 45 },
    { ...fixture, difficulty: 8 },
    {
      ...fixture,
      dots: [
        { x: 80, y: 42 },
        { x: 80, y: 42 },
      ],
    },
    { ...fixture, dots: [null, ...fixture.dots] },
    { ...fixture, dots: [{ x: 110, y: 110 }, ...fixture.dots] },
    { ...fixture, dots: [{ x: 300, y: 42 }, ...fixture.dots] },
    { ...fixture, dots: [] },
  ])
    assert.equal(m.isConcentrationPuzzle(puzzle), false);
});
