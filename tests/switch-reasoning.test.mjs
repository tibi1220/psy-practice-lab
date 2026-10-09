import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';

const source = await readFile(
  new URL('../src/lib/switch-reasoning.ts', import.meta.url),
  'utf8',
);
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext },
});
const {
  SWITCH_EXAMPLES,
  ALL_CODES,
  applyCode,
  applyChain,
  createSwitchPuzzle,
  matchingOptions,
  formatCode,
  isSwitchPuzzle,
} = await import(
  `data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`
);

test('switch codes select source positions rather than destinations', () => {
  assert.deepEqual(applyCode([0, 1, 2, 3], [3, 2, 4, 1]), [2, 1, 3, 0]);
  assert.deepEqual(applyCode([3, 0, 2, 1], [1, 2, 3, 4]), [3, 0, 2, 1]);
  assert.deepEqual(applyCode([3, 0, 2, 1], [1, 2, 4, 3]), [3, 0, 1, 2]);
});

test('chained switches renumber the intermediate sequence', () => {
  assert.deepEqual(
    applyChain(
      [2, 3, 1, 0],
      [
        [2, 1, 4, 3],
        [3, 2, 4, 1],
      ],
    ),
    [0, 2, 1, 3],
  );
  assert.deepEqual(
    applyChain(
      [1, 3, 0, 2],
      [
        [4, 2, 3, 1],
        [1, 2, 4, 3],
      ],
    ),
    [2, 3, 1, 0],
  );
  assert.notDeepEqual(
    applyChain(
      [2, 3, 1, 0],
      [
        [3, 2, 4, 1],
        [2, 1, 4, 3],
      ],
    ),
    [0, 2, 1, 3],
  );
});

test('five switchChallenge examples match the documented answers', () => {
  assert.deepEqual(
    SWITCH_EXAMPLES.map(puzzle => formatCode(puzzle.options[puzzle.answer])),
    ['1-2-4-3', '3-4-2-1', '4-1-2-3', '3-2-4-1', '1-2-4-3'],
  );
  for (const puzzle of SWITCH_EXAMPLES) {
    assert.deepEqual(matchingOptions(puzzle), [puzzle.answer]);
    assert.ok(isSwitchPuzzle(puzzle));
  }
});

test('all 24 codes produce distinct arrangements of four shapes', () => {
  assert.equal(ALL_CODES.length, 24);
  assert.equal(
    new Set(ALL_CODES.map(code => applyCode([0, 1, 2, 3], code).join())).size,
    24,
  );
});

test('generated one- and two-stage questions have one correct choice', () => {
  let seed = 8493;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 2 ** 32;
  };
  const positions = new Set();
  for (const stages of [1, 2]) {
    for (let count = 0; count < 100; count++) {
      const puzzle = createSwitchPuzzle(stages, random);
      assert.ok(isSwitchPuzzle(puzzle));
      assert.equal(puzzle.fixedCodes.length, stages - 1);
      assert.deepEqual(matchingOptions(puzzle), [puzzle.answer]);
      assert.equal(new Set(puzzle.options.map(formatCode)).size, 3);
      positions.add(puzzle.answer);
      // Independently evaluate each position through the full code chain.
      let sequence = [...puzzle.input];
      for (const code of [
        ...puzzle.fixedCodes,
        puzzle.options[puzzle.answer],
      ]) {
        sequence = [
          sequence[code[0] - 1],
          sequence[code[1] - 1],
          sequence[code[2] - 1],
          sequence[code[3] - 1],
        ];
      }
      assert.deepEqual(sequence, puzzle.output);
    }
  }
  assert.equal(positions.size, 3);
});

test('stored puzzle validation rejects malformed and inconsistent questions', () => {
  const example = SWITCH_EXAMPLES[0];
  for (const value of [
    null,
    {},
    { ...example, input: [0, 0, 2, 3] },
    { ...example, options: [[0, 1, 2, 3], ...example.options.slice(1)] },
    { ...example, answer: 2 },
    { ...example, output: [0, 1, 2, 3] },
  ]) {
    assert.equal(isSwitchPuzzle(value), false);
  }
});
