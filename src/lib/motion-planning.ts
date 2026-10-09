export type Position = { x: number; y: number };
export type MotionPiece = Position & { width: number; height: number; name: string; color: string };
export type MotionPuzzle = { difficulty?: number; columns: number; rows: number; target: Position; pieces: MotionPiece[]; walls: (Position & { width: number; height: number })[] };
export type MotionMove = { piece: number; to: Position };
export type MotionResponse = { moves: MotionMove[]; skipped: boolean };
export type MotionState = Position[];
const directions = [[1, 0], [0, 1], [-1, 0], [0, -1]];
const same = (a: Position, b: Position) => a.x === b.x && a.y === b.y;
const positionKey = (point: Position) => `${point.x},${point.y}`;
export const initialMotionState = (puzzle: MotionPuzzle): MotionState => puzzle.pieces.map(({ x, y }) => ({ x, y }));
export const motionSolved = (puzzle: MotionPuzzle, state: MotionState) => same(state[0], puzzle.target);

// The target is a floor marking. Blocks can cover it; pieces never rotate or overlap.
export function motionPlacements(puzzle: MotionPuzzle, state: MotionState, piece: number): Map<string, Position[]> {
  const shape = puzzle.pieces[piece];
  if (!shape || !state[piece]) return new Map();
  const occupied = new Set<number>();
  const occupy = (rect: Position & { width: number; height: number }) => {
    for (let y = rect.y; y < rect.y + rect.height; y++) for (let x = rect.x; x < rect.x + rect.width; x++) occupied.add(y * puzzle.columns + x);
  };
  puzzle.walls.forEach(occupy);
  puzzle.pieces.forEach((other, index) => { if (index !== piece) occupy({ ...other, ...state[index] }); });
  const fits = (point: Position) => {
    if (point.x < 0 || point.y < 0 || point.x + shape.width > puzzle.columns || point.y + shape.height > puzzle.rows) return false;
    for (let y = point.y; y < point.y + shape.height; y++) for (let x = point.x; x < point.x + shape.width; x++) if (occupied.has(y * puzzle.columns + x)) return false;
    return true;
  };
  const start = state[piece];
  const paths = new Map<string, Position[]>([[positionKey(start), [start]]]);
  const queue = [start];
  for (let cursor = 0; cursor < queue.length; cursor++) {
    const point = queue[cursor];
    for (const [dx, dy] of directions) {
      const next = { x: point.x + dx, y: point.y + dy }, key = positionKey(next);
      if (paths.has(key) || !fits(next)) continue;
      paths.set(key, [...paths.get(positionKey(point))!, next]); queue.push(next);
    }
  }
  return paths;
}
export function motionPath(puzzle: MotionPuzzle, state: MotionState, move: MotionMove): Position[] | null {
  if (!Number.isInteger(move.piece) || move.piece < 0 || move.piece >= state.length || same(state[move.piece], move.to)) return null;
  return motionPlacements(puzzle, state, move.piece).get(positionKey(move.to)) ?? null;
}
export function applyMotionMove(puzzle: MotionPuzzle, state: MotionState, move: MotionMove): MotionState | null {
  if (!motionPath(puzzle, state, move)) return null;
  return state.map((point, index) => index === move.piece ? { ...move.to } : point);
}
export function replayMotion(puzzle: MotionPuzzle, moves: MotionMove[]): MotionState | null {
  let state = initialMotionState(puzzle);
  for (const move of moves) {
    if (motionSolved(puzzle, state)) return null;
    const next = applyMotionMove(puzzle, state, move);
    if (!next) return null;
    state = next;
  }
  return state;
}

// Breadth-first search counts a continuous placement of one piece as one move,
// regardless of its distance or turns. Every edge uses collision-checked paths.
export function solveMotion(puzzle: MotionPuzzle, start = initialMotionState(puzzle), limit = 30_000): MotionMove[] | null {
  if (motionSolved(puzzle, start)) return [];
  const key = (state: MotionState) => state.map(positionKey).join(";");
  const queue: { state: MotionState; parent: number; move: MotionMove | null }[] = [{ state: start, parent: -1, move: null }];
  const seen = new Set([key(start)]);
  const reconstruct = (index: number, finalMove: MotionMove) => {
    const result = [finalMove];
    while (queue[index].move) { result.push(queue[index].move!); index = queue[index].parent; }
    return result.reverse();
  };
  for (let cursor = 0; cursor < queue.length && cursor < limit; cursor++) {
    const state = queue[cursor].state;
    for (let piece = 0; piece < puzzle.pieces.length; piece++) {
      for (const path of motionPlacements(puzzle, state, piece).values()) {
        if (path.length === 1) continue;
        const to = path[path.length - 1], move = { piece, to };
        const next = state.map((point, index) => index === piece ? to : point);
        if (motionSolved(puzzle, next)) return reconstruct(cursor, move);
        const nextKey = key(next);
        if (seen.has(nextKey)) continue;
        // Never return an unproven optimum after reaching the search bound.
        if (queue.length >= limit) return null;
        seen.add(nextKey); queue.push({ state: next, parent: cursor, move });
      }
    }
  }
  return null;
}

const ball = (x: number, y: number): MotionPiece => ({ x, y, width: 1, height: 1, name: "Red ball", color: "#fb7185" });
const block = (x: number, y: number, width: number, height: number, name: string, color: string): MotionPiece => ({ x, y, width, height, name, color });
export const MOTION_TEMPLATES: MotionPuzzle[] = [
  // The introductory layout demonstrated in the video.
  { columns: 3, rows: 5, target: { x: 1, y: 4 }, walls: [], pieces: [ball(2, 0), block(0, 0, 1, 3, "Green block", "#86efac"), block(1, 1, 2, 1, "Purple block", "#c4b5fd")] },
  { columns: 4, rows: 5, target: { x: 2, y: 4 }, walls: [], pieces: [ball(3, 0), block(0, 0, 1, 3, "Green block", "#86efac"), block(1, 1, 3, 1, "Purple block", "#c4b5fd")] },
  // Fixed, bolted obstacles and a block covering the target, as in level two.
  { columns: 3, rows: 5, target: { x: 2, y: 2 }, walls: [{ x: 1, y: 0, width: 2, height: 2 }, { x: 1, y: 3, width: 2, height: 2 }], pieces: [ball(1, 2), block(2, 2, 1, 1, "Blue block", "#7dd3fc"), block(0, 0, 1, 1, "Green block", "#86efac"), block(0, 4, 1, 1, "Purple block", "#c4b5fd")] },
  { columns: 3, rows: 6, target: { x: 2, y: 3 }, walls: [{ x: 1, y: 0, width: 2, height: 3 }, { x: 1, y: 4, width: 2, height: 2 }], pieces: [ball(1, 3), block(2, 3, 1, 1, "Blue block", "#7dd3fc"), block(0, 0, 1, 2, "Green block", "#86efac"), block(0, 5, 1, 1, "Purple block", "#c4b5fd")] },
  { columns: 4, rows: 5, target: { x: 1, y: 1 }, walls: [{ x: 0, y: 3, width: 1, height: 2 }], pieces: [ball(2, 1), block(2, 2, 2, 1, "Green block", "#86efac"), block(2, 3, 2, 2, "Purple block", "#c4b5fd"), block(0, 1, 2, 2, "Blue block", "#7dd3fc")] },
  { columns: 4, rows: 5, target: { x: 0, y: 3 }, walls: [{ x: 0, y: 1, width: 1, height: 2 }], pieces: [ball(2, 1), block(1, 2, 1, 3, "Green block", "#86efac"), block(1, 0, 1, 2, "Purple block", "#c4b5fd"), block(2, 4, 2, 1, "Blue block", "#7dd3fc")] },
  { columns: 4, rows: 5, target: { x: 3, y: 1 }, walls: [{ x: 2, y: 3, width: 1, height: 2 }], pieces: [ball(0, 1), block(0, 3, 2, 2, "Green block", "#86efac"), block(0, 2, 2, 1, "Purple block", "#c4b5fd"), block(2, 0, 2, 2, "Blue block", "#7dd3fc")] },
  { columns: 4, rows: 5, target: { x: 1, y: 2 }, walls: [{ x: 1, y: 3, width: 1, height: 2 }], pieces: [ball(3, 4), block(2, 2, 1, 3, "Green block", "#86efac"), block(0, 1, 1, 2, "Purple block", "#c4b5fd"), block(1, 0, 2, 2, "Blue block", "#7dd3fc")] },
  { columns: 4, rows: 5, target: { x: 2, y: 0 }, walls: [{ x: 3, y: 0, width: 1, height: 1 }, { x: 3, y: 3, width: 1, height: 1 }], pieces: [ball(2, 3), block(0, 3, 2, 2, "Green block", "#86efac"), block(0, 0, 1, 3, "Purple block", "#c4b5fd"), block(2, 2, 2, 1, "Blue block", "#7dd3fc"), block(1, 1, 1, 2, "Amber block", "#fcd34d")] },
  { columns: 4, rows: 5, target: { x: 1, y: 2 }, walls: [{ x: 1, y: 1, width: 1, height: 1 }, { x: 0, y: 2, width: 1, height: 1 }], pieces: [ball(3, 0), block(1, 3, 2, 2, "Green block", "#86efac"), block(2, 0, 1, 3, "Purple block", "#c4b5fd"), block(0, 0, 2, 1, "Blue block", "#7dd3fc"), block(3, 2, 1, 2, "Amber block", "#fcd34d")] },
  { columns: 4, rows: 5, target: { x: 2, y: 4 }, walls: [{ x: 0, y: 4, width: 1, height: 1 }, { x: 2, y: 0, width: 1, height: 1 }], pieces: [ball(1, 2), block(1, 3, 2, 2, "Green block", "#86efac"), block(3, 2, 1, 3, "Purple block", "#c4b5fd"), block(2, 1, 2, 1, "Blue block", "#7dd3fc"), block(0, 1, 1, 2, "Amber block", "#fcd34d")] },
  { columns: 4, rows: 5, target: { x: 0, y: 1 }, walls: [{ x: 2, y: 0, width: 1, height: 1 }, { x: 1, y: 0, width: 1, height: 1 }], pieces: [ball(2, 4), block(2, 1, 2, 2, "Green block", "#86efac"), block(0, 1, 1, 3, "Purple block", "#c4b5fd"), block(0, 4, 2, 1, "Blue block", "#7dd3fc"), block(1, 2, 1, 2, "Amber block", "#fcd34d")] },
  { columns: 4, rows: 5, target: { x: 3, y: 1 }, walls: [{ x: 3, y: 3, width: 1, height: 1 }, { x: 0, y: 0, width: 1, height: 1 }], pieces: [ball(3, 4), block(1, 2, 2, 2, "Green block", "#86efac"), block(3, 0, 1, 3, "Purple block", "#c4b5fd"), block(1, 4, 2, 1, "Blue block", "#7dd3fc"), block(0, 2, 1, 2, "Amber block", "#fcd34d")] },
  { columns: 4, rows: 5, target: { x: 0, y: 0 }, walls: [{ x: 3, y: 0, width: 1, height: 1 }, { x: 1, y: 2, width: 1, height: 1 }], pieces: [ball(2, 0), block(2, 3, 2, 2, "Green block", "#86efac"), block(0, 0, 1, 3, "Purple block", "#c4b5fd"), block(2, 1, 2, 1, "Blue block", "#7dd3fc"), block(1, 0, 1, 2, "Amber block", "#fcd34d")] },
  { columns: 4, rows: 5, target: { x: 1, y: 0 }, walls: [{ x: 0, y: 1, width: 1, height: 1 }, { x: 0, y: 0, width: 1, height: 1 }], pieces: [ball(2, 4), block(0, 3, 2, 2, "Green block", "#86efac"), block(2, 0, 1, 3, "Purple block", "#c4b5fd"), block(2, 3, 2, 1, "Blue block", "#7dd3fc"), block(3, 0, 1, 2, "Amber block", "#fcd34d")] },
];
export function motionDifficulty(completed: number, level: "adaptive" | "easy" | "hard" = "adaptive") {
  return level === "easy" ? 0 : Math.min(3, Math.max(level === "hard" ? 2 : 0, completed >= 7 ? 3 : completed >= 4 ? 2 : completed >= 2 ? 1 : 0));
}
export function createMotionPuzzle(advanced: boolean, random = Math.random, difficulty = advanced ? 1 : 0): MotionPuzzle {
  const stage = Math.max(0, Math.min(3, difficulty));
  const pool = stage === 0 ? MOTION_TEMPLATES.slice(0, 2) : stage === 1 ? MOTION_TEMPLATES.slice(2, 8) : stage === 2 ? MOTION_TEMPLATES.slice(8, 12) : MOTION_TEMPLATES.slice(12);
  const template = pool[Math.floor(random() * pool.length)];
  const flipX = random() < 0.5, flipY = random() < 0.5, transpose = random() < 0.5;
  const transform = <T extends Position & { width: number; height: number }>(rect: T): T => {
    const x = flipX ? template.columns - rect.x - rect.width : rect.x;
    const y = flipY ? template.rows - rect.y - rect.height : rect.y;
    return { ...rect, x: transpose ? y : x, y: transpose ? x : y, width: transpose ? rect.height : rect.width, height: transpose ? rect.width : rect.height };
  };
  const target = transform({ ...template.target, width: 1, height: 1 });
  return { difficulty: stage, columns: transpose ? template.rows : template.columns, rows: transpose ? template.columns : template.rows, target: { x: target.x, y: target.y }, pieces: template.pieces.map(transform), walls: template.walls.map(transform) };
}
export function isMotionPuzzle(value: unknown): value is MotionPuzzle {
  if (!value || typeof value !== "object") return false;
  const p = value as MotionPuzzle;
  if (p.difficulty !== undefined && (!Number.isInteger(p.difficulty) || p.difficulty < 0 || p.difficulty > 3)) return false;
  if (![p.rows, p.columns].every(n => Number.isInteger(n) && n >= 3 && n <= 7) || !p.target || !Number.isInteger(p.target.x) || !Number.isInteger(p.target.y) || p.target.x < 0 || p.target.x >= p.columns || p.target.y < 0 || p.target.y >= p.rows || !Array.isArray(p.pieces) || p.pieces.length < 2 || p.pieces.length > 6 || !Array.isArray(p.walls) || p.walls.length > 6) return false;
  const cells = new Set<number>();
  for (const rect of [...p.walls, ...p.pieces]) {
    if (!rect || ![rect.x, rect.y, rect.width, rect.height].every(Number.isInteger) || rect.x < 0 || rect.y < 0 || rect.width < 1 || rect.height < 1 || rect.x + rect.width > p.columns || rect.y + rect.height > p.rows) return false;
    for (let y = rect.y; y < rect.y + rect.height; y++) for (let x = rect.x; x < rect.x + rect.width; x++) { const cell = y * p.columns + x; if (cells.has(cell)) return false; cells.add(cell); }
  }
  if (p.walls.some(wall => p.target.x >= wall.x && p.target.x < wall.x + wall.width && p.target.y >= wall.y && p.target.y < wall.y + wall.height)) return false;
  return p.pieces[0].width === 1 && p.pieces[0].height === 1 && !motionSolved(p, initialMotionState(p)) && p.pieces.every(piece => typeof piece.name === "string" && piece.name.length <= 60 && /^#[0-9a-f]{6}$/i.test(piece.color));
}
export function isMotionResponse(puzzle: MotionPuzzle, value: unknown): value is MotionResponse {
  if (!value || typeof value !== "object") return false;
  const r = value as MotionResponse;
  if (typeof r.skipped !== "boolean" || !Array.isArray(r.moves) || r.moves.length > 500 || !r.moves.every(move => move && Number.isInteger(move.piece) && move.to && Number.isInteger(move.to.x) && Number.isInteger(move.to.y))) return false;
  const state = replayMotion(puzzle, r.moves);
  return state !== null && (r.skipped ? !motionSolved(puzzle, state) : motionSolved(puzzle, state));
}
export function isMotionCorrect(puzzle: MotionPuzzle, response: MotionResponse) {
  const state = replayMotion(puzzle, response.moves);
  return !response.skipped && state !== null && motionSolved(puzzle, state);
}

const solutionCache = new Map<string, MotionMove[] | null>();
export function optimalMotionSolution(puzzle: MotionPuzzle): MotionMove[] | null {
  const key = JSON.stringify(puzzle);
  if (!solutionCache.has(key)) {
    if (solutionCache.size >= 256) solutionCache.clear();
    solutionCache.set(key, solveMotion(puzzle));
  }
  return solutionCache.get(key)!;
}
