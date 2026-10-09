export const SHAPE_NAMES = ["Circle", "Star", "Cross", "Triangle", "Square"];
export type Puzzle = {
  size: 4 | 5;
  cells: (number | null)[];
  target: number;
  answer: number;
  rationale?: string;
};

// Transcribed from the five practice grids in the supplied gapChallenge PDF.
export const EXAMPLE_PUZZLES: Puzzle[] = [
  { size: 4, cells: [3,null,2,null, null,null,null,null, 0,3,1,2, 2,null,3,0], target: 6, answer: 0,
    rationale: "Column 3 already contains a cross, star, and triangle. Only the circle is missing." },
  { size: 4, cells: [0,null,null,null, 1,null,2,0, null,1,0,3, null,null,null,null], target: 12, answer: 3,
    rationale: "Column 1 needs a cross and triangle. Row 3 already has a triangle, so its first cell must be a cross. That leaves the triangle for the question mark." },
  { size: 4, cells: [null,2,null,1, null,null,null,null, 1,null,3,null, null,null,2,null], target: 2, answer: 0,
    rationale: "Column 3 needs a star and circle. Row 1 already has a star, so the question mark must be a circle." },
  { size: 5, cells: [2,null,null,null,4, null,0,null,1,null, 4,null,null,null,null, null,null,null,3,null, null,null,null,null,null], target: 13, answer: 2,
    rationale: "Column 4 needs a circle, cross, and square. Rows 1 and 3 already have squares, so the square goes in row 5. Row 1 already has a cross, leaving the cross for the question mark in row 3." },
  { size: 5, cells: [null,0,null,null,null, null,null,3,0,2, 4,2,null,null,null, null,null,null,null,null, null,null,4,3,null], target: 16, answer: 3,
    rationale: "Row 2 needs a square and star. Column 1 already has a square, so row 2, column 2 must be a square. Column 2 now needs a star and triangle. Row 5 already has a triangle, leaving the triangle for the question mark." },
];

export function candidates(cells: (number | null)[], size: number, index: number) {
  const row = Math.floor(index / size);
  const column = index % size;
  return Array.from({ length: size }, (_, value) => value).filter(value =>
    !Array.from({ length: size }, (_, offset) => offset).some(offset =>
      cells[row * size + offset] === value || cells[offset * size + column] === value,
    ),
  );
}

function completeCells(cells: (number | null)[], size: number): number[] | null {
  let index = -1;
  let options: number[] = [];
  for (let cell = 0; cell < cells.length; cell++) {
    if (cells[cell] !== null) continue;
    const possible = candidates(cells, size, cell);
    if (possible.length === 0) return null;
    if (index === -1 || possible.length < options.length) {
      index = cell;
      options = possible;
      if (options.length === 1) break;
    }
  }
  if (index === -1) return [...cells] as number[];
  for (const value of options) {
    cells[index] = value;
    const solved = completeCells(cells, size);
    cells[index] = null;
    if (solved) return solved;
  }
  return null;
}

// The whole grid may be ambiguous; only the target must have a unique answer.
export function targetAnswers(puzzle: Pick<Puzzle, "cells" | "size" | "target">) {
  const { cells, size, target } = puzzle;
  if (cells.length !== size * size || cells[target] !== null) return [];
  for (let index = 0; index < cells.length; index++) {
    const value = cells[index];
    if (value !== null) {
      const without = [...cells];
      without[index] = null;
      if (!Number.isInteger(value) || !candidates(without, size, index).includes(value)) return [];
    }
  }
  return candidates(cells, size, target).filter(value => {
    const trial = [...cells];
    trial[target] = value;
    return completeCells(trial, size) !== null;
  });
}

// Some non-target blanks are ambiguous. Return one valid completion consistent
// with every original clue and the correct target answer, without changing them.
export function completePuzzle(puzzle: Puzzle): number[] | null {
  if (!targetAnswers(puzzle).includes(puzzle.answer)) return null;
  const cells = [...puzzle.cells];
  cells[puzzle.target] = puzzle.answer;
  return completeCells(cells, puzzle.size);
}

function shuffle<T>(values: T[], random: () => number) {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index--) {
    const other = Math.floor(random() * (index + 1));
    [result[index], result[other]] = [result[other], result[index]];
  }
  return result;
}

export function createPuzzle(size: 4 | 5, difficulty: "easy" | "hard", random = Math.random): Puzzle {
  const values = Array.from({ length: size }, (_, index) => index);
  const rows = shuffle(values, random);
  const columns = shuffle(values, random);
  const shapes = shuffle(values, random);
  const cells: (number | null)[] = rows.flatMap(row => columns.map(column => shapes[(row + column) % size]));
  const target = Math.floor(random() * cells.length);
  const answer = cells[target]!;
  cells[target] = null;
  const minimumClues = difficulty === "easy" ? size * size - size - 2 : size + 1;
  let clues = cells.length - 1;
  for (const index of shuffle(Array.from({ length: cells.length }, (_, i) => i), random)) {
    if (index === target || clues <= minimumClues) continue;
    const previous = cells[index];
    cells[index] = null;
    if (targetAnswers({ cells, size, target }).length === 1) clues--;
    else cells[index] = previous;
  }
  return { size, cells, target, answer };
}
