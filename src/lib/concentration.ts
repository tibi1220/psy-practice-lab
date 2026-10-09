export const CONCENTRATION_GLYPHS = ["e", "nine", "mirrored-e", "f", "closed-e", "broken-e"] as const;
export type ConcentrationGlyph = typeof CONCENTRATION_GLYPHS[number];
export type ConcentrationPuzzle = { glyph: ConcentrationGlyph; rotation: number; dots: { x: number; y: number }[]; difficulty: number };
export const CONCENTRATION_PATHS: Record<ConcentrationGlyph, string> = {
  e: "M142 65H78V155H142M78 110H142",
  nine: "M78 110V65H142V155H78M78 110H142",
  "mirrored-e": "M78 65H142V155H78M142 110H78",
  f: "M142 65H78V155M78 110H142",
  "closed-e": "M142 65H78V155H142M78 110H142M142 65V110",
  "broken-e": "M142 65H78V101M78 119V155H142M78 110H142",
};
export const concentrationAnswer = (puzzle: ConcentrationPuzzle) => puzzle.glyph === "e" && puzzle.rotation === 0 && puzzle.dots.length === 3;
export function concentrationExplanation(puzzle: ConcentrationPuzzle): string {
  const symbol = puzzle.glyph === "e" && puzzle.rotation === 0;
  const count = puzzle.dots.length;
  return `${concentrationAnswer(puzzle) ? "Correct" : "Incorrect"}: ${symbol ? "the symbol is an upright E" : "the symbol is not an upright, complete E"}, and it has ${count} dots. Both conditions must hold: an upright E and exactly three dots. Dots can appear above, below, or beside the symbol.`;
}
export function concentrationDifficulty(completed: number, level: "adaptive" | "easy" | "hard") {
  return level === "easy" ? 0 : level === "hard" ? Math.min(2, 1 + Math.floor(completed / 15)) : Math.min(2, Math.floor(completed / 15));
}
function shuffle<T>(items: T[], random: () => number) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index--) { const other = Math.floor(random() * (index + 1)); [copy[index], copy[other]] = [copy[other], copy[index]]; }
  return copy;
}
export function createConcentrationPuzzle(advanced: boolean, random = Math.random, difficulty = advanced ? 1 : 0): ConcentrationPuzzle {
  const stage = Math.max(0, Math.min(2, difficulty));
  const target = random() < 0.5;
  const wrongSymbol = !target && random() < 0.65;
  const pool: ConcentrationGlyph[] = stage === 0 ? ["nine", "mirrored-e", "f"] : stage === 1 ? ["nine", "closed-e", "mirrored-e", "f"] : ["nine", "closed-e", "broken-e"];
  const glyph = wrongSymbol ? pool[Math.floor(random() * pool.length)] : "e";
  const rotation = stage > 0 && wrongSymbol && random() < 0.15 ? [90, 180, 270][Math.floor(random() * 3)] : 0;
  const count = target || wrongSymbol && random() < 0.75 ? 3 : [2, 4, ...(stage === 2 ? [5] : [])][Math.floor(random() * (stage === 2 ? 3 : 2))];
  const slots = [80, 110, 140].flatMap(x => [{ x, y: 42 }, { x, y: 178 }]);
  if (stage > 0) slots.push(...[75, 110, 145].flatMap(y => [{ x: 52, y }, { x: 168, y }]));
  const dots = shuffle(slots, random).slice(0, count).map(dot => stage === 2 ? { x: dot.x + (random() - 0.5) * 8, y: dot.y + (random() - 0.5) * 8 } : dot);
  return { glyph, rotation, dots, difficulty: stage };
}
export function isConcentrationPuzzle(value: unknown): value is ConcentrationPuzzle {
  if (!value || typeof value !== "object") return false;
  const p = value as ConcentrationPuzzle;
  return CONCENTRATION_GLYPHS.includes(p.glyph) && [0, 90, 180, 270].includes(p.rotation) && Number.isInteger(p.difficulty) && p.difficulty >= 0 && p.difficulty <= 2 && Array.isArray(p.dots) && p.dots.length >= 2 && p.dots.length <= 5 && p.dots.every((dot, index) => dot && Number.isFinite(dot.x) && Number.isFinite(dot.y) && dot.x >= 40 && dot.x <= 180 && dot.y >= 30 && dot.y <= 190 && !(dot.x > 60 && dot.x < 160 && dot.y > 52 && dot.y < 168) && p.dots.every((other, otherIndex) => otherIndex === index || other && Math.hypot(dot.x - other.x, dot.y - other.y) >= 15));
}
export function concentrationKey(event: { key: string; repeat: boolean; altKey: boolean; ctrlKey: boolean; metaKey: boolean; shiftKey?: boolean; targetTag?: string; editable?: boolean }): boolean | null {
  if (event.repeat || event.altKey || event.ctrlKey || event.metaKey || event.editable || ["INPUT", "TEXTAREA", "SELECT"].includes(event.targetTag ?? "")) return null;
  return event.key.toLowerCase() === "a" ? false : event.key.toLowerCase() === "d" ? true : null;
}
