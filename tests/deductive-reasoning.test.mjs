import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(new URL("../src/lib/deductive-reasoning.ts", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } });
const { EXAMPLE_PUZZLES, createPuzzle, createPracticePuzzle, createSolvingGuide, deductionMoves, targetAnswers, completePuzzle } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`);

function assertValidCompletion(puzzle) {
  const original = [...puzzle.cells];
  const solution = completePuzzle(puzzle);
  assert.ok(solution);
  assert.equal(solution.length, puzzle.size ** 2);
  assert.equal(solution[puzzle.target], puzzle.answer);
  const expected = Array.from({ length: puzzle.size }, (_, index) => index);
  for (let index = 0; index < puzzle.size; index++) {
    assert.deepEqual(solution.slice(index * puzzle.size, (index + 1) * puzzle.size).sort(), expected);
    assert.deepEqual(expected.map(row => solution[row * puzzle.size + index]).sort(), expected);
  }
  original.forEach((clue, index) => {
    if (clue !== null) assert.equal(solution[index], clue);
  });
  assert.deepEqual(puzzle.cells, original);
}

test("example solutions fill every blank while preserving clues and target answers", () => {
  for (const puzzle of EXAMPLE_PUZZLES) assertValidCompletion(puzzle);
  assert.equal(completePuzzle({ ...EXAMPLE_PUZZLES[0], answer: 2 }), null);
});

test("all five PDF grids have exactly the documented target answer", () => {
  assert.deepEqual(EXAMPLE_PUZZLES.map(puzzle => puzzle.answer), [0, 3, 0, 2, 3]);
  for (const puzzle of EXAMPLE_PUZZLES) {
    assert.deepEqual(targetAnswers(puzzle), [puzzle.answer]);
    assert.equal(puzzle.cells[puzzle.target], null);
  }
});

test("solver distinguishes ambiguous targets and inconsistent clues", () => {
  const blank = { size: 4, cells: Array(16).fill(null), target: 0 };
  assert.deepEqual(targetAnswers(blank), [0, 1, 2, 3]);
  const invalid = { ...blank, cells: [null, 0, 0, ...Array(13).fill(null)] };
  assert.deepEqual(targetAnswers(invalid), []);
});

test("generated grids retain a unique answer after removing clues", () => {
  let seed = 93821;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 2 ** 32;
  };
  const seen = new Set();
  for (const size of [4, 5]) {
    for (const difficulty of ["easy", "hard"]) {
      for (let count = 0; count < 30; count++) {
        const puzzle = createPuzzle(size, difficulty, random);
        assert.equal(puzzle.cells.length, size * size);
        assert.equal(puzzle.cells[puzzle.target], null);
        assert.deepEqual(targetAnswers(puzzle), [puzzle.answer]);
        assertValidCompletion(puzzle);
        assert.ok(puzzle.cells.filter(cell => cell === null).length > 1);
        seen.add(JSON.stringify(puzzle));
      }
    }
  }
  assert.equal(seen.size, 120);
});

test("extra-hard deductive rounds alternate grey and black and retain solvable grids", () => {
  const answers = [];
  for (let round = 0; round < 6; round++) {
    const puzzle = createPracticePuzzle("extra-hard", answers, () => 0.42);
    assert.equal(puzzle.size, 5);
    assert.equal(puzzle.palette, round % 2 === 0 ? "gray" : "black");
    assert.deepEqual(targetAnswers(puzzle), [puzzle.answer]);
    assertValidCompletion(puzzle);
    answers.push({ puzzle: JSON.parse(JSON.stringify(puzzle)), selected: puzzle.answer });
  }
  for (const level of ["easy", "hard"]) {
    const puzzle = createPracticePuzzle(level, answers, () => 0.42);
    assert.equal(puzzle.size, level === "easy" ? 4 : 5);
    assert.equal(puzzle.palette, undefined);
  }
});

test("adaptive deductive practice reaches monochrome only after successful 5x5 rounds", () => {
  const answers = [];
  for (let round = 0; round < 10; round++) {
    const puzzle = createPracticePuzzle("adaptive", answers, () => 0.42);
    assert.equal(puzzle.size, round < 4 ? 4 : 5);
    assert.equal(puzzle.palette, round < 8 ? undefined : round === 8 ? "gray" : "black");
    answers.push({ puzzle, selected: puzzle.answer });
  }
  const failures = [];
  for (let round = 0; round < 5; round++) {
    const puzzle = createPracticePuzzle("adaptive", [...answers, ...failures], () => 0.42);
    failures.push({ puzzle, selected: (puzzle.answer + 1) % puzzle.size });
  }
  const reduced = createPracticePuzzle("adaptive", [...answers, ...failures], () => 0.42);
  assert.equal(reduced.size, 4);
  assert.equal(reduced.palette, undefined);
  const resumed = createPracticePuzzle("adaptive", [...answers, ...failures, ...answers.slice(4, 8)], () => 0.42);
  assert.equal(resumed.palette, "gray");
});

test("deductive walkthroughs find short routes for all PDF examples", () => {
  assert.deepEqual(EXAMPLE_PUZZLES.map(puzzle => createSolvingGuide(puzzle).steps.length), [1, 1, 1, 2, 1]);
  for (const puzzle of EXAMPLE_PUZZLES) assert.ok(createSolvingGuide(puzzle).shortest);
  assert.deepEqual(createSolvingGuide({ size: 4, cells: Array(16).fill(null), target: 0, answer: 0 }).steps, []);
});

test("generated solving guides use sound deductions, stop at the target, and preserve clues", () => {
  let seed = 32893;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 2 ** 32; };
  for (let round = 0; round < 40; round++) {
    const puzzle = createPuzzle(round % 2 ? 5 : 4, "hard", random);
    const original = [...puzzle.cells];
    const guide = createSolvingGuide(puzzle);
    let cells = [...original];
    assert.ok(guide.steps.length);
    for (const step of guide.steps) {
      assert.equal(cells[step.index], null);
      assert.deepEqual(targetAnswers({ cells, size: puzzle.size, target: step.index }), [step.value]);
      if (guide.shortest) assert.ok(deductionMoves(cells, puzzle.size).some(move => move.index === step.index && move.value === step.value));
      cells[step.index] = step.value;
      assert.deepEqual(step.cells, cells);
      assert.ok(step.description.length > 30);
    }
    assert.equal(guide.steps.at(-1).index, puzzle.target);
    assert.equal(guide.steps.at(-1).value, puzzle.answer);
    assert.deepEqual(puzzle.cells, original);
  }
});
