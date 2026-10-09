export type OddRule = "rotation" | "lines" | "containment" | "alternating" | "sides" | "broken-line" | "symbol-count" | "angular" | "rotation-pairs";
export type OddObject = { rotation: number; filled: boolean; lines: number; contained: boolean; sides: number; gap?: number; circles?: number; squares?: number; innerRotation?: number };
export type OddPuzzle = { rule: OddRule; objects: OddObject[]; answer: number; start: number; step: number; difficulty?: number };
const baseObject = (): OddObject => ({ rotation: 0, filled: true, lines: 1, contained: true, sides: 4 });
export const ODD_RULES: OddRule[] = ["rotation", "lines", "containment", "alternating", "sides", "broken-line", "symbol-count", "angular", "rotation-pairs"];
export const oddDifficulty = (completed: number, level: "adaptive" | "easy" | "hard") => level === "easy" ? 0 : Math.min(2, (level === "hard" ? 1 : 0) + Math.floor(completed / 6));

export function objectFits(puzzle: OddPuzzle, index: number): boolean {
  const item = puzzle.objects[index];
  switch (puzzle.rule) {
    case "rotation": return item.rotation === (puzzle.start + puzzle.step * index) % 4;
    case "lines": return item.lines === ((index + puzzle.start) % 3 === 2 ? 2 : 1);
    case "containment": return item.contained;
    case "alternating": return item.filled === ((index + puzzle.start) % 2 === 0);
    case "sides": return item.sides === 4;
    case "broken-line": return item.gap === (puzzle.start + puzzle.step * index) % 5;
    case "symbol-count": return item.circles === (item.squares ?? 0) + (puzzle.difficulty === 2 ? 2 : 1);
    case "angular": return item.sides >= 3;
    case "rotation-pairs": return item.innerRotation === (item.rotation + puzzle.step) % 4;
  }
}

export function createOddPuzzle(advanced: boolean, random = Math.random, ruleOverride?: OddRule, difficulty = advanced ? 1 : 0): OddPuzzle {
  const rules: OddRule[] = difficulty === 2 ? ["broken-line", "symbol-count", "rotation-pairs"] : difficulty === 1 ? ["lines", "containment", "broken-line", "symbol-count", "rotation-pairs"] : ["rotation", "alternating", "sides", "angular"];
  const rule = ruleOverride ?? rules[Math.floor(random() * rules.length)];
  const start = Math.floor(random() * (rule === "rotation" ? 4 : rule === "lines" ? 3 : 2));
  const step = rule === "broken-line" ? difficulty === 2 ? 3 : 1 : random() < 0.5 ? 1 : 3;
  const answer = Math.floor(random() * 9);
  const objects = Array.from({ length: 9 }, (_, index) => {
    const item = baseObject();
    item.rotation = (start + step * index) % 4;
    item.lines = (index + start) % 3 === 2 ? 2 : 1;
    item.filled = (index + start) % 2 === 0;
    if (rule === "broken-line") item.gap = (start + step * index) % 5;
    if (rule === "symbol-count") { item.squares = 1 + Math.floor(random() * 3); item.circles = item.squares + (difficulty === 2 ? 2 : 1); }
    if (rule === "angular") { item.sides = [3, 4, 5, 6, 8][Math.floor(random() * 5)]; item.rotation = Math.floor(random() * 4); }
    if (rule === "rotation-pairs") { item.rotation = Math.floor(random() * 4); item.innerRotation = (item.rotation + step) % 4; }
    return item;
  });
  const odd = objects[answer];
  if (rule === "rotation") odd.rotation = (odd.rotation + 2) % 4;
  if (rule === "lines") odd.lines = odd.lines === 1 ? 2 : 1;
  if (rule === "containment") odd.contained = false;
  if (rule === "alternating") odd.filled = !odd.filled;
  if (rule === "sides") odd.sides = 3;
  if (rule === "broken-line") odd.gap = difficulty === 2 ? ((odd.gap ?? 0) + 1) % 5 : -1;
  if (rule === "symbol-count") odd.circles = (odd.squares ?? 1) + (difficulty === 2 ? 1 : 2);
  if (rule === "angular") odd.sides = 0;
  if (rule === "rotation-pairs") odd.innerRotation = ((odd.innerRotation ?? 0) + 2) % 4;
  return { rule, objects, answer, start, step, difficulty };
}

export function oddExplanation(puzzle: OddPuzzle): string {
  switch (puzzle.rule) {
    case "rotation": return `Each triangle rotates 90 degrees ${puzzle.step === 1 ? "clockwise" : "counterclockwise"}. Object ${puzzle.answer + 1} points in the wrong direction.`;
    case "lines": return "The line counts repeat 1, 1, 2 (possibly starting partway through the cycle). The selected object has the wrong number of lines.";
    case "containment": return "Each small shape must fit entirely inside its outer shape. The selected rectangle crosses the outer boundary.";
    case "alternating": return "Filled and outlined stars alternate. The selected star breaks that pattern.";
    case "sides": return "Every object should have four sides. The selected object is a triangle with three sides.";
    case "angular": return `Eight shapes have only straight edges, regardless of their orientation, fill, or number of sides. Object ${puzzle.answer + 1} has a curved boundary.`;
    case "broken-line": return `Number the five strokes from top to bottom. The gap moves ${puzzle.step} ${puzzle.step === 1 ? "position" : "positions"} down in each successive object, wrapping to the top after position 5. Expected gap positions: ${puzzle.objects.map((_, i) => (puzzle.start + puzzle.step * i) % 5 + 1).join(" → ")}. Object ${puzzle.answer + 1} ${puzzle.objects[puzzle.answer].gap === -1 ? "has no gap" : "has its gap in the wrong position"}.`;
    case "symbol-count": return `Ignore placement and count each shape type. Every correct object has ${puzzle.difficulty === 2 ? "two more circles" : "one more circle"} than squares. Object ${puzzle.answer + 1} has ${puzzle.objects[puzzle.answer].circles} circles and ${puzzle.objects[puzzle.answer].squares} squares, breaking that relationship.`;
    case "rotation-pairs": return `Within each object, the smaller T is rotated 90° ${puzzle.step === 1 ? "clockwise" : "counterclockwise"} relative to the larger T. The pairs themselves can face any direction. Object ${puzzle.answer + 1} reverses that relationship.`;
  }
}

export function isOddPuzzle(value: unknown): value is OddPuzzle {
  if (!value || typeof value !== "object") return false;
  const puzzle = value as OddPuzzle;
  return ODD_RULES.includes(puzzle.rule) && (puzzle.difficulty === undefined || [0, 1, 2].includes(puzzle.difficulty)) && Number.isInteger(puzzle.start) && puzzle.start >= 0 && puzzle.start < 4 &&
    [1,3].includes(puzzle.step) && Number.isInteger(puzzle.answer) && puzzle.answer >= 0 && puzzle.answer < 9 &&
    Array.isArray(puzzle.objects) && puzzle.objects.length === 9 && puzzle.objects.every(item =>
      item && Number.isInteger(item.rotation) && item.rotation >= 0 && item.rotation < 4 && typeof item.filled === "boolean" &&
      [1,2].includes(item.lines) && typeof item.contained === "boolean" && [0,3,4,5,6,8].includes(item.sides) &&
      (puzzle.rule !== "broken-line" || Number.isInteger(item.gap) && item.gap! >= -1 && item.gap! < 5) &&
      (puzzle.rule !== "symbol-count" || Number.isInteger(item.squares) && item.squares! >= 1 && item.squares! <= 3 && Number.isInteger(item.circles) && item.circles! >= 1 && item.circles! <= 5) &&
      (puzzle.rule !== "rotation-pairs" || Number.isInteger(item.innerRotation) && item.innerRotation! >= 0 && item.innerRotation! < 4),
    ) && puzzle.objects.every((_, index) => objectFits(puzzle, index) === (index !== puzzle.answer));
}
