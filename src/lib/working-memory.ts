export type Dot = { x: number; y: number };
export type Pattern = { rows: number; columns: number; cells: boolean[] };
export type Segment = [number, number];
export type SpatialTask =
  | { kind: 'symmetry'; left: Pattern; right: Pattern }
  | { kind: 'rotation'; left: Pattern; right: Pattern }
  | {
      kind: 'equation';
      left: Segment[];
      right: Segment[];
      result: Segment[];
      operation: 'add' | 'subtract';
    };
export type MemoryTask = {
  dots: Dot[];
  sequence: number[];
  spatial: SpatialTask[];
  difficulty?: number;
};
export type Judgment = { response: boolean | null; seconds: number };
export type MemoryResponse = { recalled: number[]; judgments: Judgment[] };
export type RoundState = {
  phase: 'flash' | 'spatial' | 'gap' | 'recall';
  cursor: number;
  recalled: number[];
  judgments: Judgment[];
};
export type RoundAction =
  | { type: 'flash-end' }
  | { type: 'gap-end' }
  | { type: 'judge'; response: boolean | null; seconds: number }
  | { type: 'select'; index: number }
  | { type: 'undo' }
  | { type: 'clear' };
export const initialRoundState: RoundState = {
  phase: 'flash',
  cursor: 0,
  recalled: [],
  judgments: [],
};

export function advanceMemoryRound(
  state: RoundState,
  action: RoundAction,
  task: MemoryTask,
): RoundState {
  if (action.type === 'flash-end' && state.phase === 'flash')
    return { ...state, phase: 'spatial' };
  if (action.type === 'judge' && state.phase === 'spatial')
    return {
      ...state,
      phase: state.cursor + 1 === task.sequence.length ? 'recall' : 'gap',
      judgments: [
        ...state.judgments,
        { response: action.response, seconds: action.seconds },
      ],
    };
  if (action.type === 'gap-end' && state.phase === 'gap')
    return { ...state, cursor: state.cursor + 1, phase: 'flash' };
  if (state.phase !== 'recall') return state;
  if (action.type === 'clear') return { ...state, recalled: [] };
  if (action.type === 'undo')
    return { ...state, recalled: state.recalled.slice(0, -1) };
  if (
    action.type === 'select' &&
    Number.isInteger(action.index) &&
    action.index >= 0 &&
    action.index < task.dots.length
  ) {
    const existing = state.recalled.indexOf(action.index);
    if (existing !== -1)
      return { ...state, recalled: state.recalled.slice(0, existing) };
    if (state.recalled.length < task.sequence.length)
      return { ...state, recalled: [...state.recalled, action.index] };
  }
  return state;
}

function shuffle<T>(values: T[], random: () => number): T[] {
  const copy = [...values];
  for (let index = copy.length - 1; index > 0; index--) {
    const other = Math.floor(random() * (index + 1));
    [copy[index], copy[other]] = [copy[other], copy[index]];
  }
  return copy;
}
export function rotatePattern(pattern: Pattern): Pattern {
  const cells = Array<boolean>(pattern.cells.length);
  for (let row = 0; row < pattern.rows; row++)
    for (let column = 0; column < pattern.columns; column++)
      cells[column * pattern.rows + pattern.rows - 1 - row] =
        pattern.cells[row * pattern.columns + column];
  return { rows: pattern.columns, columns: pattern.rows, cells };
}
export function mirrorPattern(pattern: Pattern): Pattern {
  return {
    ...pattern,
    cells: pattern.cells.map(
      (_, index) =>
        pattern.cells[
          Math.floor(index / pattern.columns) * pattern.columns +
            pattern.columns -
            1 -
            (index % pattern.columns)
        ],
    ),
  };
}
const samePattern = (left: Pattern, right: Pattern) =>
  left.rows === right.rows &&
  left.columns === right.columns &&
  left.cells.every((value, index) => value === right.cells[index]);
const segmentKey = ([first, second]: Segment) =>
  `${Math.min(first, second)}-${Math.max(first, second)}`;
export function combineSegments(
  left: Segment[],
  right: Segment[],
  operation: 'add' | 'subtract',
): Segment[] {
  const rightKeys = new Set(right.map(segmentKey));
  const combined =
    operation === 'subtract'
      ? left.filter(segment => !rightKeys.has(segmentKey(segment)))
      : [...left, ...right];
  return [
    ...new Map(
      combined.map(segment => [
        segmentKey(segment),
        [Math.min(...segment), Math.max(...segment)] as Segment,
      ]),
    ).values(),
  ];
}
export function spatialAnswer(task: SpatialTask): boolean {
  if (task.kind === 'symmetry')
    return samePattern(mirrorPattern(task.left), task.right);
  if (task.kind === 'rotation') {
    let pattern = task.left;
    for (let rotation = 0; rotation < 4; rotation++) {
      if (samePattern(pattern, task.right)) return true;
      pattern = rotatePattern(pattern);
    }
    return false;
  }
  const expected = combineSegments(task.left, task.right, task.operation)
    .map(segmentKey)
    .sort();
  const actual = [...new Set(task.result.map(segmentKey))].sort();
  return (
    expected.length === actual.length &&
    expected.every((value, index) => value === actual[index])
  );
}
export function spatialExplanation(
  task: SpatialTask,
  t?: (message: string, values?: Record<string, unknown>) => string,
): string {
  const yes = spatialAnswer(task);
  if (task.kind === 'symmetry')
    return yes
      ? 'Yes. The right pattern is the left pattern reflected across the vertical divider.'
      : 'No. At least one square differs from the reflection across the vertical divider.';
  if (task.kind === 'rotation')
    return yes
      ? 'Yes. A quarter-turn rotation (0°, 90°, 180°, or 270°) makes the patterns identical.'
      : 'No. No quarter-turn rotation makes the patterns identical. A reflection alone does not count.';
  if (t)
    return t('workingMemory.messages.answerOperationResult', {
      answer: yes ? 'Yes' : 'No',
      operation:
        task.operation === 'add'
          ? 'Addition combines the lines from both figures; an overlapping line appears once.'
          : "Subtraction removes the second figure's lines from the first figure.",
      result: yes
        ? 'The result matches.'
        : 'The shown result has a missing or extra line.',
    });
  return `${yes ? 'Yes' : 'No'}. ${task.operation === 'add' ? 'Addition combines the lines from both figures; an overlapping line appears once.' : "Subtraction removes the second figure's lines from the first figure."} ${yes ? 'The result matches.' : 'The shown result has a missing or extra line.'}`;
}
const allSegments: Segment[] = [];
for (let first = 0; first < 9; first++)
  for (let second = first + 1; second < 9; second++) {
    if (
      Math.abs(Math.floor(first / 3) - Math.floor(second / 3)) <= 1 &&
      Math.abs((first % 3) - (second % 3)) <= 1
    )
      allSegments.push([first, second]);
  }
export function createSpatialTask(
  kind: SpatialTask['kind'],
  random = Math.random,
  difficulty = 0,
): SpatialTask {
  const yes = random() < 0.5;
  if (kind === 'equation') {
    const pool = shuffle(allSegments, random);
    const operation = random() < 0.5 ? 'add' : 'subtract';
    const count = difficulty ? 6 + difficulty : 3 + Math.floor(random() * 3);
    const left = pool.slice(0, count);
    const right =
      operation === 'subtract'
        ? shuffle(left, random).slice(
            0,
            difficulty ? Math.max(3, count - 3) : 2,
          )
        : pool.slice(3, difficulty ? count + 5 : 7);
    const result = combineSegments(left, right, operation);
    if (!yes) {
      const extra = pool.find(
        segment =>
          !result.some(
            existing => segmentKey(existing) === segmentKey(segment),
          ),
      )!;
      if (difficulty && result.length)
        result.splice(Math.floor(random() * result.length), 1);
      result.push(extra);
    }
    return { kind, left, right, result, operation };
  }
  const left: Pattern = {
    rows:
      kind === 'symmetry'
        ? Math.min(8, 6 + difficulty)
        : Math.min(8, 5 + difficulty),
    columns:
      kind === 'symmetry'
        ? Math.min(6, 4 + difficulty)
        : Math.min(8, 5 + difficulty),
    cells: [],
  };
  left.cells = Array.from(
    { length: left.rows * left.columns },
    () => random() < 0.45,
  );
  if (difficulty) {
    left.cells[0] = true;
    left.cells[left.cells.length - 1] = false;
  }
  let right = kind === 'symmetry' ? mirrorPattern(left) : left;
  if (kind === 'rotation')
    for (
      let turn = 0, turns = 1 + Math.floor(random() * 3);
      turn < turns;
      turn++
    )
      right = rotatePattern(right);
  right = { ...right, cells: [...right.cells] };
  if (!yes) {
    if (!difficulty) {
      const index = Math.floor(random() * right.cells.length);
      right.cells[index] = !right.cells[index];
    } else {
      // Keep occupancy counts identical. A count-only shortcut cannot answer.
      const filled = shuffle(
        right.cells.flatMap((value, index) => (value ? [index] : [])),
        random,
      );
      const empty = shuffle(
        right.cells.flatMap((value, index) => (!value ? [index] : [])),
        random,
      );
      outer: for (const first of filled)
        for (const second of empty) {
          const cells = [...right.cells];
          cells[first] = false;
          cells[second] = true;
          const candidate = { ...right, cells };
          if (!spatialAnswer({ kind, left, right: candidate })) {
            right = candidate;
            break outer;
          }
        }
    }
  }
  return { kind, left, right };
}
export const MEMORY_LENGTHS = [3, 4, 5, 6, 8];
export function memoryDifficulty(
  completed: number,
  level: 'adaptive' | 'easy' | 'medium' | 'hard',
  successful = 0,
) {
  if (level === 'easy') return 0;
  if (level === 'medium') return 1;
  return Math.min(
    4,
    level === 'hard'
      ? 2 + Math.floor(completed / 2)
      : Math.max(
          Math.floor(completed / 2),
          successful >= 2 ? 1 + Math.floor(successful / 2) : 0,
        ),
  );
}
export function memoryTiming(
  difficulty: number,
  flashSeconds: number,
  spatialSeconds: number,
) {
  const factor = 1 - 0.1 * difficulty;
  return {
    flashSeconds: Math.max(0.5, Math.round(flashSeconds * factor * 100) / 100),
    spatialSeconds: Math.max(3, Math.round(spatialSeconds * factor * 10) / 10),
  };
}
export function createMemoryTask(
  length: number,
  random = Math.random,
  offset = 0,
  difficulty = 0,
): MemoryTask {
  const dots = Array.from({ length: 16 }, (_, index) => ({
    x: 10 + (index % 4) * 26 + (random() - 0.5) * 8,
    y: 12 + Math.floor(index / 4) * 25 + (random() - 0.5) * 8,
  }));
  const sequence = shuffle(
    Array.from({ length: dots.length }, (_, index) => index),
    random,
  ).slice(0, Math.max(3, Math.min(8, length)));
  const kinds: SpatialTask['kind'][] = ['symmetry', 'rotation', 'equation'];
  return {
    dots,
    sequence,
    difficulty,
    spatial: sequence.map((_, index) =>
      createSpatialTask(
        kinds[(index + offset) % kinds.length],
        random,
        difficulty,
      ),
    ),
  };
}
export function memoryScore(task: MemoryTask, response: MemoryResponse) {
  const recalled = task.sequence.filter(
    (value, index) => response.recalled[index] === value,
  ).length;
  const spatial = task.spatial.filter(
    (question, index) =>
      response.judgments[index]?.response === spatialAnswer(question),
  ).length;
  return {
    recalled,
    spatial,
    perfectRecall: recalled === task.sequence.length,
  };
}
export function isMemoryTask(value: unknown): value is MemoryTask {
  if (!value || typeof value !== 'object') return false;
  const task = value as MemoryTask;
  if (
    task.difficulty !== undefined &&
    (!Number.isInteger(task.difficulty) ||
      task.difficulty < 0 ||
      task.difficulty > 4)
  )
    return false;
  const validPattern = (pattern: Pattern) =>
    pattern &&
    Number.isInteger(pattern.rows) &&
    Number.isInteger(pattern.columns) &&
    pattern.rows >= 1 &&
    pattern.rows <= 8 &&
    pattern.columns >= 1 &&
    pattern.columns <= 8 &&
    Array.isArray(pattern.cells) &&
    pattern.cells.length === pattern.rows * pattern.columns &&
    pattern.cells.every(cell => typeof cell === 'boolean');
  const validSegments = (segments: Segment[]) =>
    Array.isArray(segments) &&
    segments.length <= 20 &&
    segments.every(
      segment =>
        Array.isArray(segment) &&
        segment.length === 2 &&
        segment.every(
          point => Number.isInteger(point) && point >= 0 && point < 9,
        ) &&
        segment[0] !== segment[1],
    );
  return (
    Array.isArray(task.dots) &&
    task.dots.length === 16 &&
    task.dots.every(
      dot =>
        dot &&
        Number.isFinite(dot.x) &&
        Number.isFinite(dot.y) &&
        dot.x >= 5 &&
        dot.x <= 95 &&
        dot.y >= 5 &&
        dot.y <= 95,
    ) &&
    Array.isArray(task.sequence) &&
    task.sequence.length >= 3 &&
    task.sequence.length <= 8 &&
    new Set(task.sequence).size === task.sequence.length &&
    task.sequence.every(
      index => Number.isInteger(index) && index >= 0 && index < 16,
    ) &&
    Array.isArray(task.spatial) &&
    task.spatial.length === task.sequence.length &&
    task.spatial.every(
      question =>
        question &&
        (question.kind === 'equation'
          ? ['add', 'subtract'].includes(question.operation) &&
            validSegments(question.left) &&
            validSegments(question.right) &&
            validSegments(question.result)
          : ['symmetry', 'rotation'].includes(question.kind) &&
            validPattern(question.left) &&
            validPattern(question.right)),
    )
  );
}
export function isMemoryResponse(
  task: MemoryTask,
  value: unknown,
): value is MemoryResponse {
  if (!value || typeof value !== 'object') return false;
  const response = value as MemoryResponse;
  return (
    Array.isArray(response.recalled) &&
    response.recalled.length <= task.sequence.length &&
    new Set(response.recalled).size === response.recalled.length &&
    response.recalled.every(
      index => Number.isInteger(index) && index >= 0 && index < 16,
    ) &&
    Array.isArray(response.judgments) &&
    response.judgments.length <= task.sequence.length &&
    response.judgments.every(
      judgment =>
        judgment &&
        (typeof judgment.response === 'boolean' ||
          judgment.response === null) &&
        Number.isFinite(judgment.seconds) &&
        judgment.seconds >= 0,
    )
  );
}
