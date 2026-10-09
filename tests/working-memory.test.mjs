import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(new URL("../src/lib/working-memory.ts", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } });
const logic = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`);
function seededRandom(seed) { return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 2 ** 32; }; }

test("later memory rounds expand to eight dots, denser tasks, and shorter timing", () => {
  const levels = Array.from({ length: 9 }, (_, round) => logic.memoryDifficulty(round, "adaptive"));
  assert.deepEqual(levels, [0, 0, 1, 1, 2, 2, 3, 3, 4]);
  assert.equal(logic.memoryDifficulty(2, "adaptive", 2), 2);
  assert.equal(logic.memoryDifficulty(0, "hard"), 2);
  assert.equal(logic.memoryDifficulty(4, "hard"), 4);
  assert.deepEqual(logic.memoryTiming(4, 1.5, 10), { flashSeconds: 0.9, spatialSeconds: 6 });
  assert.deepEqual(logic.memoryTiming(4, 0.5, 3), { flashSeconds: 0.5, spatialSeconds: 3 });
  for (let difficulty = 0; difficulty <= 4; difficulty++) {
    const task = logic.createMemoryTask(logic.MEMORY_LENGTHS[difficulty], seededRandom(53292 + difficulty), 0, difficulty);
    assert.ok(logic.isMemoryTask(task));
    assert.equal(task.sequence.length, logic.MEMORY_LENGTHS[difficulty]);
    assert.equal(task.spatial.length, task.sequence.length);
    const rotation = task.spatial.find(question => question.kind === "rotation");
    assert.equal(rotation.left.rows, Math.min(8, 5 + difficulty));
  }
});

test("advanced spatial distractors preserve counts and require comparing actual positions and lines", () => {
  const random = seededRandom(839153);
  const seen = { rotation: new Set(), symmetry: new Set(), equation: new Set() };
  for (let index = 0; index < 120; index++) for (const kind of ["rotation", "symmetry", "equation"]) {
    const question = logic.createSpatialTask(kind, random, 4);
    seen[kind].add(logic.spatialAnswer(question));
    if (kind !== "equation") assert.equal(question.left.cells.filter(Boolean).length, question.right.cells.filter(Boolean).length);
    else {
      assert.ok(question.left.length >= 10);
      assert.equal(question.result.length, logic.combineSegments(question.left, question.right, question.operation).length);
    }
    assert.ok(logic.isMemoryTask({ ...logic.createMemoryTask(8), spatial: Array.from({ length: 8 }, () => question) }));
  }
  for (const values of Object.values(seen)) assert.deepEqual([...values].sort(), [false, true]);
});
const pattern = { rows: 3, columns: 3, cells: [true, true, false, false, true, false, false, false, false] };

test("working memory spatial comparisons distinguish reflections and quarter-turn rotations", () => {
  const mirror = logic.mirrorPattern(pattern);
  assert.deepEqual(mirror.cells, [false, true, true, false, true, false, false, false, false]);
  assert.ok(logic.spatialAnswer({ kind: "symmetry", left: pattern, right: mirror }));
  assert.equal(logic.spatialAnswer({ kind: "symmetry", left: pattern, right: pattern }), false);
  let rotated = pattern;
  for (let turn = 0; turn < 4; turn++) {
    assert.ok(logic.spatialAnswer({ kind: "rotation", left: pattern, right: rotated }));
    rotated = logic.rotatePattern(rotated);
  }
  assert.deepEqual(rotated, pattern);
  assert.equal(logic.spatialAnswer({ kind: "rotation", left: pattern, right: mirror }), false);
});

test("figure equations add unique lines and subtract lines independent of endpoint direction", () => {
  const left = [[0, 4], [4, 7]], right = [[7, 4]];
  assert.deepEqual(logic.combineSegments(left, right, "add"), left);
  assert.deepEqual(logic.combineSegments(left, right, "subtract"), [[0, 4]]);
  assert.ok(logic.spatialAnswer({ kind: "equation", left, right, result: [[4, 0]], operation: "subtract" }));
  assert.equal(logic.spatialAnswer({ kind: "equation", left, right, result: [[0, 4], [4, 7]], operation: "subtract" }), false);
  assert.ok(logic.spatialAnswer({ kind: "equation", left: [[0, 1]], right: [[1, 2]], result: [[0, 1], [1, 2]], operation: "add" }));
});

test("generated memory tasks have stable spaced dots, unique ordered sequences, and balanced spatial answers", () => {
  const counts = new Map();
  for (const length of [3, 4, 5]) for (let seed = 1; seed <= 100; seed++) {
    const task = logic.createMemoryTask(length, seededRandom(seed), seed % 3);
    assert.ok(logic.isMemoryTask(task));
    assert.equal(task.sequence.length, length);
    assert.equal(new Set(task.sequence).size, length);
    for (let first = 0; first < 16; first++) for (let second = first + 1; second < 16; second++) assert.ok(Math.hypot(task.dots[first].x - task.dots[second].x, task.dots[first].y - task.dots[second].y) > 15);
    for (const question of task.spatial) {
      const answer = logic.spatialAnswer(question), key = `${question.kind}-${answer}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
      assert.ok(logic.spatialExplanation(question).length > 30);
    }
  }
  for (const kind of ["symmetry", "rotation", "equation"]) for (const answer of [true, false]) assert.ok(counts.get(`${kind}-${answer}`) > 20);
});

test("memory score grades dot order separately from spatial answers and treats timeouts as incorrect", () => {
  const task = logic.createMemoryTask(3, seededRandom(31));
  const judgments = task.spatial.map(question => ({ response: logic.spatialAnswer(question), seconds: 1 }));
  assert.deepEqual(logic.memoryScore(task, { recalled: task.sequence, judgments }), { recalled: 3, spatial: 3, perfectRecall: true });
  const recalled = [...task.sequence]; [recalled[0], recalled[1]] = [recalled[1], recalled[0]];
  assert.deepEqual(logic.memoryScore(task, { recalled, judgments: judgments.map(() => ({ response: null, seconds: 10 })) }), { recalled: 1, spatial: 0, perfectRecall: false });
});

test("memory rounds interleave each flash and judgment and ignore duplicate or premature input", () => {
  const task = logic.createMemoryTask(3, seededRandom(19));
  let state = { ...logic.initialRoundState };
  assert.equal(logic.advanceMemoryRound(state, { type: "select", index: 2 }, task), state);
  for (let index = 0; index < 3; index++) {
    assert.equal(state.phase, "flash"); assert.equal(state.cursor, index);
    state = logic.advanceMemoryRound(state, { type: "flash-end" }, task);
    assert.equal(state.phase, "spatial");
    state = logic.advanceMemoryRound(state, { type: "judge", response: index === 1 ? null : true, seconds: 2 }, task);
    assert.equal(state.judgments.length, index + 1);
    assert.equal(logic.advanceMemoryRound(state, { type: "judge", response: false, seconds: 2 }, task), state);
    if (index < 2) state = logic.advanceMemoryRound(state, { type: "gap-end" }, task);
  }
  assert.equal(state.phase, "recall");
  assert.equal(state.judgments[1].response, null);
});

test("recall controls preserve click order, enforce the length, and support undo, clearing and replacement", () => {
  const task = logic.createMemoryTask(3, seededRandom(22));
  let state = { ...logic.initialRoundState, phase: "recall" };
  for (const index of [8, 2, 5, 9]) state = logic.advanceMemoryRound(state, { type: "select", index }, task);
  assert.deepEqual(state.recalled, [8, 2, 5]);
  state = logic.advanceMemoryRound(state, { type: "select", index: 2 }, task);
  assert.deepEqual(state.recalled, [8]);
  state = logic.advanceMemoryRound(state, { type: "select", index: 9 }, task);
  state = logic.advanceMemoryRound(state, { type: "undo" }, task);
  assert.deepEqual(state.recalled, [8]);
  state = logic.advanceMemoryRound(state, { type: "clear" }, task);
  assert.deepEqual(state.recalled, []);
  assert.equal(logic.advanceMemoryRound(state, { type: "select", index: -1 }, task), state);
});

test("working memory validators reject damaged tasks, duplicate recalled dots, and invalid judgments", () => {
  const task = logic.createMemoryTask(3, seededRandom(31));
  assert.equal(logic.isMemoryTask({ ...task, sequence: [0, 0, 1] }), false);
  assert.equal(logic.isMemoryTask({ ...task, dots: [{ x: Infinity, y: 1 }, ...task.dots.slice(1)] }), false);
  assert.equal(logic.isMemoryTask({ ...task, spatial: [null, ...task.spatial.slice(1)] }), false);
  assert.equal(logic.isMemoryResponse(task, { recalled: [0, 0], judgments: [] }), false);
  assert.equal(logic.isMemoryResponse(task, { recalled: [0], judgments: [{ response: "yes", seconds: 1 }] }), false);
  assert.equal(logic.isMemoryResponse(task, { recalled: [0], judgments: [{ response: null, seconds: -1 }] }), false);
});
