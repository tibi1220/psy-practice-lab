export const SHAPE_NAMES = ['Circle', 'Star', 'Cross', 'Triangle', 'Square'];
export type ShapePalette = 'colored' | 'gray' | 'black';
export type DeductiveLevel = 'easy' | 'hard' | 'extra-hard' | 'adaptive';
export type Puzzle = {
  size: 4 | 5;
  cells: (number | null)[];
  target: number;
  answer: number;
  rationale?: string;
  palette?: ShapePalette;
};

// Transcribed from the five practice grids in the supplied gapChallenge PDF.
export const EXAMPLE_PUZZLES: Puzzle[] = [
  {
    size: 4,
    cells: [
      3,
      null,
      2,
      null,
      null,
      null,
      null,
      null,
      0,
      3,
      1,
      2,
      2,
      null,
      3,
      0,
    ],
    target: 6,
    answer: 0,
    rationale:
      'Column 3 already contains a cross, star, and triangle. Only the circle is missing.',
  },
  {
    size: 4,
    cells: [
      0,
      null,
      null,
      null,
      1,
      null,
      2,
      0,
      null,
      1,
      0,
      3,
      null,
      null,
      null,
      null,
    ],
    target: 12,
    answer: 3,
    rationale:
      'Column 1 needs a cross and triangle. Row 3 already has a triangle, so its first cell must be a cross. That leaves the triangle for the question mark.',
  },
  {
    size: 4,
    cells: [
      null,
      2,
      null,
      1,
      null,
      null,
      null,
      null,
      1,
      null,
      3,
      null,
      null,
      null,
      2,
      null,
    ],
    target: 2,
    answer: 0,
    rationale:
      'Column 3 needs a star and circle. Row 1 already has a star, so the question mark must be a circle.',
  },
  {
    size: 5,
    cells: [
      2,
      null,
      null,
      null,
      4,
      null,
      0,
      null,
      1,
      null,
      4,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      3,
      null,
      null,
      null,
      null,
      null,
      null,
    ],
    target: 13,
    answer: 2,
    rationale:
      'Column 4 needs a circle, cross, and square. Rows 1 and 3 already have squares, so the square goes in row 5. Row 1 already has a cross, leaving the cross for the question mark in row 3.',
  },
  {
    size: 5,
    cells: [
      null,
      0,
      null,
      null,
      null,
      null,
      null,
      3,
      0,
      2,
      4,
      2,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      4,
      3,
      null,
    ],
    target: 16,
    answer: 3,
    rationale:
      'Row 2 needs a square and star. Column 1 already has a square, so row 2, column 2 must be a square. Column 2 now needs a star and triangle. Row 5 already has a triangle, leaving the triangle for the question mark.',
  },
];

export function candidates(
  cells: (number | null)[],
  size: number,
  index: number,
) {
  const row = Math.floor(index / size);
  const column = index % size;
  return Array.from({ length: size }, (_, value) => value).filter(
    value =>
      !Array.from({ length: size }, (_, offset) => offset).some(
        offset =>
          cells[row * size + offset] === value ||
          cells[offset * size + column] === value,
      ),
  );
}

function completeCells(
  cells: (number | null)[],
  size: number,
): number[] | null {
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
export function targetAnswers(
  puzzle: Pick<Puzzle, 'cells' | 'size' | 'target'>,
) {
  const { cells, size, target } = puzzle;
  if (cells.length !== size * size || cells[target] !== null) return [];
  for (let index = 0; index < cells.length; index++) {
    const value = cells[index];
    if (value !== null) {
      const without = [...cells];
      without[index] = null;
      if (
        !Number.isInteger(value) ||
        !candidates(without, size, index).includes(value)
      )
        return [];
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

export function createPuzzle(
  size: 4 | 5,
  difficulty: 'easy' | 'hard',
  random = Math.random,
): Puzzle {
  const values = Array.from({ length: size }, (_, index) => index);
  const rows = shuffle(values, random);
  const columns = shuffle(values, random);
  const shapes = shuffle(values, random);
  const cells: (number | null)[] = rows.flatMap(row =>
    columns.map(column => shapes[(row + column) % size]),
  );
  const target = Math.floor(random() * cells.length);
  const answer = cells[target]!;
  cells[target] = null;
  const minimumClues =
    difficulty === 'easy' ? size * size - size - 2 : size + 1;
  let clues = cells.length - 1;
  for (const index of shuffle(
    Array.from({ length: cells.length }, (_, i) => i),
    random,
  )) {
    if (index === target || clues <= minimumClues) continue;
    const previous = cells[index];
    cells[index] = null;
    if (targetAnswers({ cells, size, target }).length === 1) clues--;
    else cells[index] = previous;
  }
  return { size, cells, target, answer };
}

export function createPracticePuzzle(
  level: DeductiveLevel,
  completed: { puzzle: Puzzle; selected: number }[],
  random = Math.random,
): Puzzle {
  const recent = completed.slice(-5);
  const correct = recent.filter(
    answer => answer.selected === answer.puzzle.answer,
  );
  const advanced =
    level === 'hard' ||
    level === 'extra-hard' ||
    (level === 'adaptive' && correct.length >= 4);
  const monochrome =
    level === 'extra-hard' ||
    (level === 'adaptive' &&
      advanced &&
      correct.filter(answer => answer.puzzle.size === 5).length >= 4);
  const puzzle = createPuzzle(
    advanced ? 5 : 4,
    advanced ? 'hard' : 'easy',
    random,
  );
  if (monochrome) {
    const monochromeRounds = completed.filter(
      answer =>
        answer.puzzle.palette === 'gray' || answer.puzzle.palette === 'black',
    ).length;
    puzzle.palette = monochromeRounds % 2 === 0 ? 'gray' : 'black';
  }
  return puzzle;
}

export type DeductionStep = {
  index: number;
  value: number;
  description: string;
  cells: (number | null)[];
};
export type SolvingGuide = { steps: DeductionStep[]; shortest: boolean };

// Find the shortest chain of visible single-cell deductions, stopping at the
// target. A bounded search keeps sparse 5×5 history entries responsive.
export function deductionMoves(
  cells: (number | null)[],
  size: number,
  t?: (message: string, values?: Record<string, unknown>) => string,
): Omit<DeductionStep, 'cells'>[] {
  const moves: Omit<DeductionStep, 'cells'>[] = [];
  const possibilities = cells.map((value, index) =>
    value === null ? candidates(cells, size, index) : [],
  );
  if (
    cells.some(
      (value, index) => value === null && possibilities[index].length === 0,
    )
  )
    return [];
  const location = (index: number) =>
    t
      ? t('deductiveReasoning.messages.rowIndexColumnIndex2', {
          index: Math.floor(index / size) + 1,
          index2: (index % size) + 1,
        })
      : `row ${Math.floor(index / size) + 1}, column ${(index % size) + 1}`;
  possibilities.forEach((values, index) => {
    if (values.length !== 1) return;
    const row = Math.floor(index / size),
      column = index % size;
    const excluded = [
      ...new Set(
        cells.filter(
          (value, cell) =>
            value !== null &&
            (Math.floor(cell / size) === row || cell % size === column),
        ),
      ),
    ];
    moves.push({
      index,
      value: values[0],
      description: t
        ? t(
            'deductiveReasoning.messages.checkLocationItsRowAndColumnAlreadyContainItems',
            {
              location: location(index),
              items: excluded
                .map(value => t(SHAPE_NAMES[value!].toLowerCase()))
                .join(', '),
              toLowerCase: SHAPE_NAMES[values[0]].toLowerCase(),
            },
          )
        : `Check ${location(index)}. Its row and column already contain ${excluded.map(value => SHAPE_NAMES[value!].toLowerCase()).join(', ')}. Only ${SHAPE_NAMES[values[0]].toLowerCase()} remains.`,
    });
  });
  for (const axis of ['row', 'column'] as const) {
    for (let unit = 0; unit < size; unit++) {
      const indices = Array.from({ length: size }, (_, offset) =>
        axis === 'row' ? unit * size + offset : offset * size + unit,
      );
      for (let value = 0; value < size; value++) {
        if (indices.some(index => cells[index] === value)) continue;
        const places = indices.filter(index =>
          possibilities[index].includes(value),
        );
        if (
          places.length === 1 &&
          !moves.some(move => move.index === places[0] && move.value === value)
        )
          moves.push({
            index: places[0],
            value,
            description: t
              ? t(
                  'deductiveReasoning.messages.axisUnitStillNeedsATolowercaseEveryOther',
                  {
                    axis: axis === 'row' ? 'Row' : 'Column',
                    unit: unit + 1,
                    toLowerCase: SHAPE_NAMES[value].toLowerCase(),
                    axis2: axis,
                    location: location(places[0]),
                  },
                )
              : `${axis === 'row' ? 'Row' : 'Column'} ${unit + 1} still needs a ${SHAPE_NAMES[value].toLowerCase()}. Every other blank in that ${axis} is blocked by that shape in its crossing row or column. Place it at ${location(places[0])}.`,
          });
      }
    }
  }
  return moves;
}

export function createSolvingGuide(
  puzzle: Puzzle,
  t?: (message: string, values?: Record<string, unknown>) => string,
): SolvingGuide {
  const answers = targetAnswers(puzzle);
  if (answers.length !== 1 || answers[0] !== puzzle.answer)
    return { steps: [], shortest: false };
  type State = { cells: (number | null)[]; steps: DeductionStep[] };
  const queue: State[] = [{ cells: [...puzzle.cells], steps: [] }];
  const seen = new Set([JSON.stringify(puzzle.cells)]);
  let best = queue[0];
  let cursor = 0;
  let truncated = false;
  while (cursor < queue.length && cursor < 2500) {
    const state = queue[cursor++];
    if (state.steps.length > best.steps.length) best = state;
    const moves = deductionMoves(state.cells, puzzle.size, t);
    const target = moves.find(
      move => move.index === puzzle.target && move.value === puzzle.answer,
    );
    if (target) {
      const cells = [...state.cells];
      cells[target.index] = target.value;
      return {
        steps: [...state.steps, { ...target, cells }],
        shortest: !truncated,
      };
    }
    for (const move of moves) {
      const cells = [...state.cells];
      cells[move.index] = move.value;
      const key = JSON.stringify(cells);
      if (seen.has(key)) continue;
      seen.add(key);
      if (queue.length < 5000)
        queue.push({ cells, steps: [...state.steps, { ...move, cells }] });
      else truncated = true;
    }
  }
  // Continue a useful chain if the shortest-path search hit its size limit.
  while (true) {
    const moves = deductionMoves(best.cells, puzzle.size, t);
    const move = moves.find(item => item.index === puzzle.target) ?? moves[0];
    if (!move) break;
    const cells = [...best.cells];
    cells[move.index] = move.value;
    best = { cells, steps: [...best.steps, { ...move, cells }] };
    if (move.index === puzzle.target)
      return { steps: best.steps, shortest: false };
  }
  // Some valid puzzles need more than singles. Test only the remaining target
  // candidates against the row/column constraints, rather than filling all blanks.
  const options = candidates(best.cells, puzzle.size, puzzle.target);
  const rejected = options.filter(value => value !== puzzle.answer);
  const rejection = (value: number) => {
    const trial = [...best.cells];
    trial[puzzle.target] = value;
    let failures = 0;
    let firstFailure = '';
    const location = (index: number) =>
      `R${Math.floor(index / puzzle.size) + 1}C${(index % puzzle.size) + 1}`;
    const search = (cells: (number | null)[], path: string[]): void => {
      let index = -1;
      let choices: number[] = [];
      for (let cell = 0; cell < cells.length; cell++) {
        if (cells[cell] !== null) continue;
        const possible = candidates(cells, puzzle.size, cell);
        if (possible.length === 0) {
          failures++;
          if (!firstFailure)
            firstFailure = t
              ? t(
                  'deductiveReasoning.messages.pathLocationHasNoLegalShapeBecauseIts',
                  {
                    path: path.length
                      ? t
                        ? t('deductiveReasoning.messages.itemsThen', {
                            items: path.join('; '),
                          })
                        : `${path.join('; ')}; then `
                      : '',
                    location: location(cell),
                  },
                )
              : `${path.length ? `${path.join('; ')}; then ` : ''}${location(cell)} has no legal shape because its row and column exclude every shape`;
          return;
        }
        if (index === -1 || possible.length < choices.length) {
          index = cell;
          choices = possible;
        }
      }
      if (index === -1) return;
      for (const choice of choices) {
        const next = [...cells];
        next[index] = choice;
        search(next, [
          ...path,
          `${location(index)} = ${SHAPE_NAMES[choice].toLowerCase()}${choices.length === 1 ? ' (forced)' : ' (trial)'}`,
        ]);
      }
    };
    search(trial, []);
    return t
      ? t(
          'deductiveReasoning.messages.assumeTolowercaseAtTheTargetFailuresLeadsToA',
          {
            toLowerCase: SHAPE_NAMES[value].toLowerCase(),
            failures:
              failures === 1
                ? 'Following the forced placements'
                : t
                  ? t(
                      'deductiveReasoning.messages.allFailuresPossiblePlacementBranches',
                      {
                        failures: failures,
                      },
                    )
                  : `All ${failures} possible placement branches`,
            failures2:
              failures === 1 ? 'The contradiction' : 'One example branch',
            firstFailure: firstFailure,
          },
        )
      : `Assume ${SHAPE_NAMES[value].toLowerCase()} at the target. ${failures === 1 ? 'Following the forced placements' : `All ${failures} possible placement branches`} leads to a contradiction. ${failures === 1 ? 'The contradiction' : 'One example branch'}: ${firstFailure}.`;
  };
  const cells = [...best.cells];
  cells[puzzle.target] = puzzle.answer;
  const description = t
    ? t(
        'deductiveReasoning.messages.theTargetStillAllowsItemsItems2OnlyTolowercaseHas',
        {
          items: options
            .map(value => t(SHAPE_NAMES[value].toLowerCase()))
            .join(` ${t('or')} `),
          items2: rejected.map(rejection).join(' '),
          toLowerCase: SHAPE_NAMES[puzzle.answer].toLowerCase(),
        },
      )
    : `The target still allows ${options.map(value => SHAPE_NAMES[value].toLowerCase()).join(' or ')}. ${rejected.map(rejection).join(' ')} Only ${SHAPE_NAMES[puzzle.answer].toLowerCase()} has a valid completion. You can leave the other blanks unresolved.`;
  return {
    steps: [
      ...best.steps,
      { index: puzzle.target, value: puzzle.answer, cells, description },
    ],
    shortest: false,
  };
}
