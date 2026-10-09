import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(new URL("../src/lib/motion-planning.ts", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } });
const m = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`);
const p = m.MOTION_TEMPLATES[0];
function seeded(seed) { return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 2 ** 32; }; }

test("planning placements respect collisions, bounds, fixed obstacles, and the whole piece footprint", () => {
  const state = m.initialMotionState(p);
  assert.equal(m.applyMotionMove(p, state, { piece: 0, to: { x: 2, y: 4 } }), null, "ball cannot jump the full barrier");
  assert.equal(m.applyMotionMove(p, state, { piece: 1, to: { x: 1, y: 0 } }), null, "tall block would overlap another block");
  assert.equal(m.applyMotionMove(p, state, { piece: 1, to: { x: 0, y: 3 } }), null, "whole block must remain in bounds");
  assert.equal(m.applyMotionMove(p, state, { piece: 0, to: { x: 2, y: 0 } }), null, "unchanged positions are not moves");
  const hard = m.MOTION_TEMPLATES[2];
  assert.equal(m.applyMotionMove(hard, m.initialMotionState(hard), { piece: 0, to: { x: 1, y: 0 } }), null, "bolted obstacle is immovable");
});

test("a continuous placement can turn without rotating and counts as one move", () => {
  const move = { piece: 1, to: { x: 2, y: 2 } };
  const path = m.motionPath(p, m.initialMotionState(p), move);
  assert.ok(path.length > 3);
  for (let index = 1; index < path.length; index++) assert.equal(Math.abs(path[index].x - path[index - 1].x) + Math.abs(path[index].y - path[index - 1].y), 1);
  assert.ok(path.some((point, index) => index && point.x !== path[index - 1].x));
  assert.ok(path.some((point, index) => index && point.y !== path[index - 1].y));
  const state = m.applyMotionMove(p, m.initialMotionState(p), move);
  assert.deepEqual(state[1], move.to);
  assert.deepEqual(state[0], { x: 2, y: 0 });
  assert.deepEqual([p.pieces[1].width, p.pieces[1].height], [1, 3]);
});

test("shortest solutions match independently established base-layout move counts", () => {
  const counts = [2, 2, 3, 3, 4, 4, 5, 4, 6, 6, 8, 8, 9, 10, 11];
  m.MOTION_TEMPLATES.forEach((puzzle, index) => {
    assert.ok(m.isMotionPuzzle(puzzle));
    const solution = m.solveMotion(puzzle);
    assert.equal(solution.length, counts[index]);
    assert.ok(m.isMotionCorrect(puzzle, { moves: solution, skipped: false }));
    assert.ok(solution.some(move => move.piece !== 0), "a block must move in every layout");
    assert.equal(m.solveMotion(puzzle, undefined, 1), null, "bounded searches do not claim an optimum");
  });
});

test("randomized mirrored and rotated layouts retain solvability and their difficulty", () => {
  const signatures = new Set();
  const random = seeded(731910);
  for (let seed = 1; seed <= 120; seed++) for (const advanced of [false, true]) {
    const puzzle = m.createMotionPuzzle(advanced, random);
    assert.ok(m.isMotionPuzzle(puzzle));
    const solution = m.solveMotion(puzzle);
    assert.ok(solution && solution.length >= (advanced ? 3 : 2));
    assert.ok(m.isMotionResponse(puzzle, { moves: solution, skipped: false }));
    assert.equal(puzzle.walls.length > 0, advanced);
    signatures.add(JSON.stringify(puzzle));
  }
  assert.ok(signatures.size >= 40);
});

test("planning responses distinguish skips and completions and reject fabricated move histories", () => {
  const solution = m.solveMotion(p);
  assert.ok(m.isMotionResponse(p, { moves: [], skipped: true }));
  assert.equal(m.isMotionCorrect(p, { moves: [], skipped: true }), false);
  assert.equal(m.isMotionResponse(p, { moves: [], skipped: false }), false);
  assert.equal(m.isMotionResponse(p, { moves: solution, skipped: true }), false);
  assert.equal(m.isMotionResponse(p, { moves: [...solution, solution[0]], skipped: false }), false);
  for (const moves of [[{ piece: 99, to: { x: 0, y: 0 } }], [{ piece: 0, to: { x: 2, y: 4 } }], [{ piece: 1, to: null }], [{ piece: 1.5, to: { x: 0, y: 0 } }]]) assert.equal(m.isMotionResponse(p, { moves, skipped: true }), false);
});

test("planning puzzle validation rejects overlapping pieces, malformed sizes, and inaccessible targets", () => {
  for (const corrupt of [
    { ...p, rows: 1 }, { ...p, target: { x: 9, y: 0 } },
    { ...p, pieces: [p.pieces[0], { ...p.pieces[1], x: 2 }] },
    { ...p, pieces: [p.pieces[0], { ...p.pieces[1], width: 0 }] },
    { ...p, pieces: [p.pieces[0], { ...p.pieces[1], color: "url(external)" }] },
    { ...p, walls: [{ x: 1, y: 4, width: 1, height: 1 }] },
  ]) assert.equal(m.isMotionPuzzle(corrupt), false);
});

test("later planning rounds reach hard and expert layouts with proven higher optimal counts", () => {
  assert.deepEqual(Array.from({ length: 10 }, (_, round) => m.motionDifficulty(round)), [0, 0, 1, 1, 2, 2, 2, 3, 3, 3]);
  assert.equal(m.motionDifficulty(0, "hard"), 2);
  assert.equal(m.motionDifficulty(20, "easy"), 0);
  const random = seeded(973824);
  for (let stage = 0; stage < 4; stage++) for (let index = 0; index < 30; index++) {
    const puzzle = m.createMotionPuzzle(stage > 0, random, stage);
    const solution = m.optimalMotionSolution(puzzle);
    assert.ok(solution.length >= [2, 3, 6, 9][stage]);
    assert.ok(solution.length <= [2, 5, 8, 11][stage]);
    assert.ok(m.isMotionResponse(puzzle, { moves: solution, skipped: false }));
    assert.deepEqual(solution, m.solveMotion(puzzle));
  }
});
