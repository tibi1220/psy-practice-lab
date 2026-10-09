export type OddRule = "rotation" | "lines" | "containment" | "alternating" | "sides";
export type OddObject = { rotation: number; filled: boolean; lines: number; contained: boolean; sides: number };
export type OddPuzzle = { rule: OddRule; objects: OddObject[]; answer: number; start: number; step: number };
const baseObject = (): OddObject => ({ rotation: 0, filled: true, lines: 1, contained: true, sides: 4 });
export const ODD_RULES: OddRule[] = ["rotation", "lines", "containment", "alternating", "sides"];

export function objectFits(puzzle: OddPuzzle, index: number): boolean {
  const item = puzzle.objects[index];
  switch (puzzle.rule) {
    case "rotation": return item.rotation === (puzzle.start + puzzle.step * index) % 4;
    case "lines": return item.lines === ((index + puzzle.start) % 3 === 2 ? 2 : 1);
    case "containment": return item.contained;
    case "alternating": return item.filled === ((index + puzzle.start) % 2 === 0);
    case "sides": return item.sides === 4;
  }
}

export function createOddPuzzle(advanced: boolean, random = Math.random, ruleOverride?: OddRule): OddPuzzle {
  const rules: OddRule[] = advanced ? ["lines", "containment", "rotation"] : ["rotation", "alternating", "sides"];
  const rule = ruleOverride ?? rules[Math.floor(random() * rules.length)];
  const start = Math.floor(random() * (rule === "rotation" ? 4 : rule === "lines" ? 3 : 2));
  const step = random() < 0.5 ? 1 : 3;
  const answer = Math.floor(random() * 9);
  const objects = Array.from({ length: 9 }, (_, index) => {
    const item = baseObject();
    item.rotation = (start + step * index) % 4;
    item.lines = (index + start) % 3 === 2 ? 2 : 1;
    item.filled = (index + start) % 2 === 0;
    return item;
  });
  const odd = objects[answer];
  if (rule === "rotation") odd.rotation = (odd.rotation + 2) % 4;
  if (rule === "lines") odd.lines = odd.lines === 1 ? 2 : 1;
  if (rule === "containment") odd.contained = false;
  if (rule === "alternating") odd.filled = !odd.filled;
  if (rule === "sides") odd.sides = 3;
  return { rule, objects, answer, start, step };
}

export function oddExplanation(puzzle: OddPuzzle): string {
  switch (puzzle.rule) {
    case "rotation": return `Each triangle rotates 90 degrees ${puzzle.step === 1 ? "clockwise" : "counterclockwise"}. Object ${puzzle.answer + 1} points in the wrong direction.`;
    case "lines": return "The line counts repeat 1, 1, 2 (possibly starting partway through the cycle). The selected object has the wrong number of lines.";
    case "containment": return "Each small shape must fit entirely inside its outer shape. The selected rectangle crosses the outer boundary.";
    case "alternating": return "Filled and outlined stars alternate. The selected star breaks that pattern.";
    case "sides": return "Every object should have four sides. The selected object is a triangle with three sides.";
  }
}

export function isOddPuzzle(value: unknown): value is OddPuzzle {
  if (!value || typeof value !== "object") return false;
  const puzzle = value as OddPuzzle;
  return ODD_RULES.includes(puzzle.rule) && Number.isInteger(puzzle.start) && puzzle.start >= 0 && puzzle.start < 4 &&
    [1,3].includes(puzzle.step) && Number.isInteger(puzzle.answer) && puzzle.answer >= 0 && puzzle.answer < 9 &&
    Array.isArray(puzzle.objects) && puzzle.objects.length === 9 && puzzle.objects.every(item =>
      item && Number.isInteger(item.rotation) && item.rotation >= 0 && item.rotation < 4 && typeof item.filled === "boolean" &&
      [1,2].includes(item.lines) && typeof item.contained === "boolean" && [3,4].includes(item.sides),
    ) && puzzle.objects.every((_, index) => objectFits(puzzle, index) === (index !== puzzle.answer));
}
