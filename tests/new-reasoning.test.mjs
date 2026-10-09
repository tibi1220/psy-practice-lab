import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

async function loadLogic(name) {
  const source = await readFile(new URL(`../src/lib/${name}.ts`, import.meta.url), "utf8");
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } });
  return import(`data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`);
}
const digit = await loadLogic("digit-challenge");
const odd = await loadLogic("odd-one-out");
const classification = await loadLogic("grid-classification");
const greenGrey = await loadLogic("green-grey");
function seededRandom(seed) {
  return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 2 ** 32; };
}

test("green/grey rules classify independent fixtures and ignore distractors", () => {
  const classify = (rule, grid, positions = [], target = "A") => greenGrey.classifyGreenGrey({ rule, positions, target }, grid.split(""));
  assert.equal(classify("parity", "246824682"), "green");
  assert.equal(classify("parity", "135791357"), "grey");
  assert.equal(classify("parity", "246824681"), null);
  assert.equal(classify("matching", "A1234567A", [0, 8]), "green");
  assert.equal(classify("matching", "A1234567B", [0, 8]), "grey");
  assert.equal(classify("occurrences", "A1BA2C3DA"), "green");
  assert.equal(classify("occurrences", "123A45678"), "grey");
  assert.equal(classify("occurrences", "AA1234567"), null);
  // Top three: indices 0,1,3. Bottom three: indices 5,7,8. Middle cells are letters.
  assert.equal(classify("row-sums", "12A3B8C79"), "green");
  assert.equal(classify("row-sums", "98A7B1C23"), "grey");
  assert.equal(classify("row-sums", "12A3B3C21"), null);
  assert.equal(classify("column-sums", "A89" + "1B7" + "23C"), "green");
  assert.equal(classify("column-sums", "A12" + "9B3" + "87C"), "grey");
  assert.equal(classify("letter-positions", "A123B456C", [0, 4, 8]), "green");
  assert.equal(classify("letter-positions", "1AB234C56", [0, 4, 8]), "grey");
});

test("green/grey generation supplies balanced mixed examples and four classifiable grids for every rule", () => {
  for (const rule of greenGrey.GREEN_GREY_RULES) {
    for (let seed = 1; seed <= 100; seed++) {
      const puzzle = greenGrey.createGreenGreyPuzzle(seed % 2 === 0, seededRandom(seed), rule);
      assert.ok(greenGrey.isGreenGreyPuzzle(puzzle), `${rule}, seed ${seed}`);
      assert.equal(puzzle.examples.filter(example => example.group === "green").length, 3);
      assert.equal(puzzle.examples.filter(example => example.group === "grey").length, 3);
      assert.ok(puzzle.examples.slice(0, 3).some(example => example.group !== puzzle.examples[0].group));
      const answer = puzzle.options.map(grid => greenGrey.classifyGreenGrey(puzzle, grid));
      assert.equal(answer.filter(group => group === "green").length, 2);
      assert.ok(greenGrey.isGreenGreyAnswer(puzzle, answer));
      const wrong = [...answer]; wrong[0] = wrong[0] === "green" ? "grey" : "green";
      assert.equal(greenGrey.isGreenGreyAnswer(puzzle, wrong), false);
      assert.ok(greenGrey.greenGreyExplanation(puzzle).length > 30);
    }
    assert.ok(greenGrey.isGreenGreyPuzzle(greenGrey.createGreenGreyPuzzle(true, () => 0.42, rule)));
  }
});

test("requested green/grey rules respect thresholds, ranges, corners, and strict comparisons", () => {
  const classify = (rule, grid) => greenGrey.classifyGreenGrey({ rule, target: "Z", positions: [] }, grid.split(""));
  const fixtures = [
    ["total-sum", "AB1CD2EF3", "green"], ["total-sum", "AB4CD5EF6", "grey"], ["total-sum", "AB2CD3EF5", null], ["total-sum", "ABCDEFGHI", null],
    ["endpoints", "2ABCDEFG8", "green"], ["endpoints", "8ABCDEFG2", "grey"], ["endpoints", "2ABCDEFG2", null],
    ["below-above-five", "123412341", "green"], ["below-above-five", "678967896", "grey"], ["below-above-five", "567896789", null],
    ["number-ranges", "123412341", "green"], ["number-ranges", "567895678", "grey"], ["number-ranges", "456789567", null],
    ["letter-parity", "A12345678", "green"], ["letter-parity", "AB1234567", "grey"], ["letter-parity", "123456789", "grey"],
    ["region-ranges", "15A3B6C89", "green"], ["region-ranges", "96A8B5C12", "grey"], ["region-ranges", "16A3B6C89", null],
    ["sevens", "777123456", "green"], ["sevens", "777777777", "green"], ["sevens", "771234569", "grey"],
    ["equal-corners", "A1A234A5A", "grey"], ["equal-corners", "A1A234A5B", "green"],
    ["repeated-letters", "QQQQQ1234", "green"], ["repeated-letters", "QQQQQQQQQ", "green"], ["repeated-letters", "QQQQ12345", "grey"], ["repeated-letters", "777777777", "grey"],
    ["four-zs", "ZZZZ12345", "green"], ["four-zs", "ZZZZZZZZZ", "green"], ["four-zs", "ZZZ123456", "grey"],
  ];
  for (const [rule, grid, expected] of fixtures) assert.equal(classify(rule, grid), expected, `${rule}: ${grid}`);
});

test("every green/grey rule is reachable through the adaptive difficulty pools", () => {
  assert.deepEqual(new Set([...greenGrey.EASY_GREEN_GREY_RULES, ...greenGrey.HARD_GREEN_GREY_RULES]), new Set(greenGrey.GREEN_GREY_RULES));
  for (const advanced of [false, true]) {
    const pool = advanced ? greenGrey.HARD_GREEN_GREY_RULES : greenGrey.EASY_GREEN_GREY_RULES;
    for (let index = 0; index < pool.length; index++) {
      const puzzle = greenGrey.createGreenGreyPuzzle(advanced, () => (index + 0.5) / pool.length);
      assert.equal(puzzle.rule, pool[index]);
      assert.ok(greenGrey.isGreenGreyPuzzle(puzzle));
    }
  }
});

test("green/grey history validation rejects incomplete classifications and damaged rules or examples", () => {
  const puzzle = greenGrey.createGreenGreyPuzzle(false, seededRandom(44));
  for (const response of [[], ["green", "grey"], ["green", "grey", "green", null], ["green", "grey", "green", "blue"]]) assert.equal(greenGrey.isGreenGreyResponse(response), false);
  assert.equal(greenGrey.isGreenGreyPuzzle({ ...puzzle, rule: "unknown" }), false);
  assert.equal(greenGrey.isGreenGreyPuzzle({ ...puzzle, positions: [99] }), false);
  assert.equal(greenGrey.isGreenGreyPuzzle({ ...puzzle, options: [[], ...puzzle.options.slice(1)] }), false);
  assert.equal(greenGrey.isGreenGreyPuzzle({ ...puzzle, examples: puzzle.examples.map(example => ({ ...example, group: "green" })) }), false);
  assert.equal(greenGrey.isGreenGreyPuzzle({ ...puzzle, examples: [null, ...puzzle.examples.slice(1)] }), false);
});

test("digitChallenge accepts every documented answer, including alternative orders", () => {
  const fixtures = [
    [{ template: "difference", result: 7 }, [[9,2],[8,1]]],
    [{ template: "sumDifference", result: 15 }, [[9,7,1],[9,8,2],[7,9,1],[8,9,2]]],
    [{ template: "alternating", result: 14 }, [[9,1,8,2],[9,2,8,1],[8,1,9,2],[8,2,9,1]]],
    [{ template: "sumProduct", result: 46 }, [[6,8,5],[6,5,8],[4,6,7],[4,7,6],[1,5,9],[1,9,5]]],
    [{ template: "productDifference", result: 55 }, [[9,7,5,3],[9,7,6,2],[7,9,5,3],[7,9,6,2],[9,7,3,5],[9,7,2,6],[7,9,3,5],[7,9,2,6]]],
  ];
  for (const [puzzle, solutions] of fixtures) {
    assert.ok(digit.isDigitPuzzle(puzzle));
    const all = digit.digitSolutions(puzzle).map(answer => answer.join()).sort();
    assert.deepEqual(all, solutions.map(answer => answer.join()).sort());
    for (const solution of solutions) assert.ok(digit.isDigitAnswer(puzzle, solution));
  }
});

test("numeracy rejects duplicate digits, zero, out-of-range digits and wrong arithmetic", () => {
  const puzzle = { template: "sumDifference", result: 15 };
  for (const answer of [[8,8,1],[9,7,0],[10,7,2],[9,7],[9,7,2]]) assert.equal(digit.isDigitAnswer(puzzle, answer), false);
  assert.equal(digit.evaluateDigits("sumProduct", [6,8,5]), 46);
  assert.equal(digit.evaluateDigits("productDifference", [9,7,5,3]), 55);
});

test("generated equations are solvable at both levels with no repeated digits", () => {
  const random = seededRandom(9381);
  const templates = new Set();
  for (const advanced of [false,true]) {
    for (let index = 0; index < 40; index++) {
      const puzzle = digit.createDigitPuzzle(advanced, random);
      templates.add(puzzle.template);
      assert.ok(digit.isDigitPuzzle(puzzle));
      for (const solution of digit.digitSolutions(puzzle)) {
        assert.equal(new Set(solution).size, solution.length);
        assert.ok(digit.isDigitAnswer(puzzle, solution));
      }
    }
  }
  assert.equal(templates.size, 5);
  for (const advanced of [false,true]) assert.ok(digit.isDigitPuzzle(digit.createDigitPuzzle(advanced, () => 0)));
});

test("every odd-one-out rule has exactly one exception across varied sequences", () => {
  const random = seededRandom(29419);
  for (const rule of odd.ODD_RULES) {
    for (let index = 0; index < 60; index++) {
      const puzzle = odd.createOddPuzzle(true, random, rule);
      assert.ok(odd.isOddPuzzle(puzzle));
      assert.equal(puzzle.objects.length, 9);
      assert.deepEqual(puzzle.objects.flatMap((_, position) => odd.objectFits(puzzle, position) ? [] : [position]), [puzzle.answer]);
      assert.ok(odd.oddExplanation(puzzle).length > 20);
    }
  }
});

test("odd-one-out encodes rotation, 1-1-2 lines, containment, alternating fill and sides", () => {
  for (const rule of odd.ODD_RULES) {
    const puzzle = odd.createOddPuzzle(false, () => 0, rule);
    assert.equal(puzzle.answer, 0);
    const item = puzzle.objects[1];
    if (rule === "rotation") assert.equal(item.rotation, 1);
    if (rule === "lines") assert.deepEqual(puzzle.objects.slice(1,4).map(item => item.lines), [1,2,1]);
    if (rule === "containment") assert.equal(item.contained, true);
    if (rule === "alternating") assert.equal(item.filled, false);
    if (rule === "sides") assert.equal(item.sides, 4);
  }
});

test("video-inspired odd-one-out rules require relationships rather than counting a single feature", () => {
  for (const difficulty of [1, 2]) {
    const gaps = odd.createOddPuzzle(true, () => 0.2, "broken-line", difficulty);
    assert.equal(gaps.step, difficulty === 2 ? 3 : 1);
    assert.deepEqual(gaps.objects.filter((_, i) => i !== gaps.answer).map(item => item.gap), gaps.objects.flatMap((_, i) => i === gaps.answer ? [] : [(gaps.start + gaps.step * i) % 5]));
    assert.equal(gaps.objects[gaps.answer].gap, difficulty === 1 ? -1 : ((gaps.start + gaps.step * gaps.answer) % 5 + 1) % 5);
    const counts = odd.createOddPuzzle(true, seededRandom(3929), "symbol-count", difficulty);
    assert.ok(new Set(counts.objects.map(item => item.squares)).size > 1);
    assert.ok(counts.objects.every((item, i) => (item.circles - item.squares === (difficulty === 2 ? 2 : 1)) === (i !== counts.answer)));
    const pairs = odd.createOddPuzzle(true, seededRandom(3748), "rotation-pairs", difficulty);
    assert.ok(pairs.objects.every((item, i) => ((item.innerRotation - item.rotation + 4) % 4 === pairs.step) === (i !== pairs.answer)));
    assert.ok(odd.isOddPuzzle(gaps) && odd.isOddPuzzle(counts) && odd.isOddPuzzle(pairs));
    const damaged = structuredClone(counts); delete damaged.objects[0].circles;
    assert.equal(odd.isOddPuzzle(damaged), false);
  }
  assert.deepEqual([0, 5, 6, 11, 12, 30].map(i => odd.oddDifficulty(i, "adaptive")), [0, 0, 1, 1, 2, 2]);
  assert.equal(odd.oddDifficulty(0, "hard"), 1);
  assert.equal(odd.oddDifficulty(30, "easy"), 0);
});

test("classification generates two matching examples and exactly two correct candidates", () => {
  const random = seededRandom(45371);
  for (const rule of classification.GRID_RULES) {
    for (let index = 0; index < 60; index++) {
      const puzzle = classification.createClassificationPuzzle(true, random, rule);
      assert.ok(classification.isClassificationPuzzle(puzzle));
      assert.equal(puzzle.answer.length, 2);
      assert.ok(puzzle.examples.every(grid => classification.gridFits(grid, rule, puzzle.symbol)));
      assert.deepEqual(puzzle.options.flatMap((grid, index) => classification.gridFits(grid, rule, puzzle.symbol) ? [index] : []), puzzle.answer);
      assert.ok(classification.isClassificationAnswer(puzzle, [...puzzle.answer].reverse()));
      const incorrect = puzzle.options.findIndex((_, index) => !puzzle.answer.includes(index));
      assert.equal(classification.isClassificationAnswer(puzzle, [puzzle.answer[0],incorrect]), false);
      assert.equal(classification.isClassificationAnswer(puzzle, [puzzle.answer[0],puzzle.answer[0]]), false);
      assert.equal(classification.isClassificationAnswer(puzzle, [puzzle.answer[0]]), false);
    }
  }
});

test("classification distinguishes positions, variable shape identity and seven-shape counts", () => {
  assert.equal(classification.gridFits([3,2,2,0,2,2,4,2,2], "fixed-columns", 2), true);
  assert.equal(classification.gridFits([3,2,2,2,0,2,4,2,2], "fixed-columns", 2), false);
  assert.equal(classification.gridFits([4,4,4,4,4,4,0,2,3], "top-rows", 0), true);
  assert.equal(classification.gridFits([0,3,0,4,2,3,0,4,0], "corners", 0), true);
  assert.equal(classification.gridFits([0,3,0,4,2,3,0,4,2], "corners", 0), false);
  assert.equal(classification.gridFits([4,4,4,0,4,3,4,4,4], "count", 0), true);
  assert.equal(classification.gridFits([4,4,4,0,4,3,2,4,4], "count", 0), false);
});

test("new reasoning history validators reject damaged puzzle data", () => {
  for (const value of [null, {}, { template: "invalid", result: 7 }, { template: "difference", result: 99 }]) assert.equal(digit.isDigitPuzzle(value), false);
  const oddPuzzle = odd.createOddPuzzle(false, () => 0);
  assert.equal(odd.isOddPuzzle({ ...oddPuzzle, answer: 99 }), false);
  assert.equal(odd.isOddPuzzle({ ...oddPuzzle, objects: [] }), false);
  const gridPuzzle = classification.createClassificationPuzzle(false, () => 0);
  assert.equal(classification.isClassificationPuzzle({ ...gridPuzzle, answer: [0,0] }), false);
  assert.equal(classification.isClassificationPuzzle({ ...gridPuzzle, examples: [[]] }), false);
});
