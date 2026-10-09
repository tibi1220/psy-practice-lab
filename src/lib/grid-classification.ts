export type GridRule =
  'fixed-columns' | 'top-rows' | 'corners' | 'block' | 'count';
export type ShapeGrid = number[];
export type ClassificationPuzzle = {
  rule: GridRule;
  symbol: number;
  examples: ShapeGrid[];
  options: ShapeGrid[];
  answer: number[];
};
export const GRID_RULES: GridRule[] = [
  'fixed-columns',
  'top-rows',
  'corners',
  'block',
  'count',
];
export const RULE_POSITIONS: Record<Exclude<GridRule, 'count'>, number[]> = {
  'fixed-columns': [1, 2, 4, 5, 7, 8],
  'top-rows': [0, 1, 2, 3, 4, 5],
  corners: [0, 2, 6, 8],
  block: [1, 2, 7, 8],
};

export function gridFits(
  grid: ShapeGrid,
  rule: GridRule,
  symbol: number,
): boolean {
  if (rule === 'count')
    return [0, 2, 3, 4].some(
      shape => grid.filter(value => value === shape).length === 7,
    );
  const positions = RULE_POSITIONS[rule];
  if (rule === 'fixed-columns' || rule === 'corners')
    return positions.every(index => grid[index] === symbol);
  return positions.every(index => grid[index] === grid[positions[0]]);
}

function shuffle<T>(values: T[], random: () => number): T[] {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index--) {
    const other = Math.floor(random() * (index + 1));
    [result[index], result[other]] = [result[other], result[index]];
  }
  return result;
}

export function createClassificationPuzzle(
  advanced: boolean,
  random = Math.random,
  ruleOverride?: GridRule,
): ClassificationPuzzle {
  const rules: GridRule[] = advanced
    ? ['corners', 'block', 'count']
    : ['fixed-columns', 'top-rows'];
  const rule = ruleOverride ?? rules[Math.floor(random() * rules.length)];
  const shapes = shuffle([0, 2, 3, 4], random);
  const symbol = shapes[0];
  const goodGrid = (dominant: number): ShapeGrid => {
    const others = shuffle(
      shapes.filter(shape => shape !== dominant),
      random,
    );
    if (rule === 'count')
      return shuffle(
        [...Array(7).fill(dominant), ...others.slice(0, 2)],
        random,
      );
    const positions = RULE_POSITIONS[rule];
    let offset = 0;
    return Array.from({ length: 9 }, (_, index) =>
      positions.includes(index) ? dominant : others[offset++ % others.length],
    );
  };
  const fixedSymbol = rule === 'fixed-columns' || rule === 'corners';
  const examples = [
    goodGrid(symbol),
    goodGrid(fixedSymbol ? symbol : shapes[1]),
  ];
  const correct = [
    goodGrid(fixedSymbol ? symbol : shapes[2]),
    goodGrid(fixedSymbol ? symbol : shapes[3]),
  ];
  const bad = correct.map(grid => {
    const copy = [...grid];
    if (rule === 'count') {
      const dominant = shapes.find(
        shape => copy.filter(value => value === shape).length === 7,
      )!;
      const index = copy.indexOf(dominant);
      copy[index] = shapes.find(shape => shape !== dominant)!;
    } else {
      const positions = RULE_POSITIONS[rule];
      const index = positions[Math.floor(random() * positions.length)];
      const other = copy.findIndex(
        (shape, cell) => !positions.includes(cell) && shape !== copy[index],
      );
      [copy[index], copy[other]] = [copy[other], copy[index]];
    }
    return copy;
  });
  const options = shuffle([...correct, ...bad], random);
  const answer = options.flatMap((grid, index) =>
    gridFits(grid, rule, symbol) ? [index] : [],
  );
  return { rule, symbol, examples, options, answer };
}

export function classificationExplanation(
  puzzle: ClassificationPuzzle,
): string {
  switch (puzzle.rule) {
    case 'fixed-columns':
      return 'The same shape occupies every cell in the second and third columns, just as in both examples.';
    case 'top-rows':
      return 'One repeated shape fills the top two rows. The repeated shape may differ between grids.';
    case 'corners':
      return 'The same shape appears in all four corners, matching both examples.';
    case 'block':
      return 'The four cells at the top-right and bottom-right contain one repeated shape. Its identity may differ between grids.';
    case 'count':
      return 'Exactly seven of the nine cells contain the same shape. Positions and shape identity can vary.';
  }
}

export function isClassificationResponse(value: unknown): value is number[] {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    new Set(value).size === 2 &&
    value.every(index => Number.isInteger(index) && index >= 0 && index < 4)
  );
}
export function isClassificationAnswer(
  puzzle: ClassificationPuzzle,
  response: number[],
): boolean {
  return (
    isClassificationResponse(response) &&
    puzzle.answer.every(index => response.includes(index))
  );
}
export function isClassificationPuzzle(
  value: unknown,
): value is ClassificationPuzzle {
  if (!value || typeof value !== 'object') return false;
  const puzzle = value as ClassificationPuzzle;
  const validGrid = (grid: ShapeGrid) =>
    Array.isArray(grid) &&
    grid.length === 9 &&
    grid.every(shape => [0, 2, 3, 4].includes(shape));
  return (
    GRID_RULES.includes(puzzle.rule) &&
    [0, 2, 3, 4].includes(puzzle.symbol) &&
    Array.isArray(puzzle.examples) &&
    puzzle.examples.length === 2 &&
    puzzle.examples.every(validGrid) &&
    Array.isArray(puzzle.options) &&
    puzzle.options.length === 4 &&
    puzzle.options.every(validGrid) &&
    isClassificationResponse(puzzle.answer) &&
    puzzle.examples.every(grid => gridFits(grid, puzzle.rule, puzzle.symbol)) &&
    puzzle.options.every(
      (grid, index) =>
        gridFits(grid, puzzle.rule, puzzle.symbol) ===
        puzzle.answer.includes(index),
    )
  );
}
