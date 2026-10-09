export const DIGIT_TEMPLATES = {
  difference: { slots: 2, tokens: [0, "−", 1] },
  sumDifference: { slots: 3, tokens: [0, "+", 1, "−", 2] },
  alternating: { slots: 4, tokens: [0, "−", 1, "+", 2, "−", 3] },
  sumProduct: { slots: 3, tokens: [0, "+", "(", 1, "×", 2, ")"] },
  productDifference: { slots: 4, tokens: ["(", 0, "×", 1, ")", "−", 2, "−", 3] },
} as const;
export type DigitTemplate = keyof typeof DIGIT_TEMPLATES;
export type DigitPuzzle = { template: DigitTemplate; result: number };

export function evaluateDigits(template: DigitTemplate, digits: number[]): number {
  const [a,b,c,d] = digits;
  switch (template) {
    case "difference": return a - b;
    case "sumDifference": return a + b - c;
    case "alternating": return a - b + c - d;
    case "sumProduct": return a + b * c;
    case "productDifference": return a * b - c - d;
  }
}

export function isDigitResponse(puzzle: DigitPuzzle, value: unknown): value is number[] {
  return Array.isArray(value) && value.length === DIGIT_TEMPLATES[puzzle.template].slots &&
    new Set(value).size === value.length && value.every(digit => Number.isInteger(digit) && digit >= 1 && digit <= 9);
}

export function isDigitAnswer(puzzle: DigitPuzzle, digits: number[]): boolean {
  return isDigitResponse(puzzle, digits) && evaluateDigits(puzzle.template, digits) === puzzle.result;
}

export function digitSolutions(puzzle: DigitPuzzle): number[][] {
  const solutions: number[][] = [];
  const visit = (digits: number[]) => {
    if (digits.length === DIGIT_TEMPLATES[puzzle.template].slots) {
      if (evaluateDigits(puzzle.template, digits) === puzzle.result) solutions.push(digits);
      return;
    }
    for (let digit = 1; digit <= 9; digit++) {
      if (!digits.includes(digit)) visit([...digits, digit]);
    }
  };
  visit([]);
  return solutions;
}

export function createDigitPuzzle(advanced: boolean, random = Math.random): DigitPuzzle {
  const templates: DigitTemplate[] = advanced ? ["alternating", "sumProduct", "productDifference"] : ["difference", "sumDifference"];
  const template = templates[Math.floor(random() * templates.length)];
  const digits = Array.from({ length: 9 }, (_, index) => index + 1);
  for (let index = digits.length - 1; index > 0; index--) {
    const other = Math.floor(random() * (index + 1));
    [digits[index], digits[other]] = [digits[other], digits[index]];
  }
  // Order larger digits first so subtraction stays positive, even for a
  // deterministic random source. Generation always starts from a valid answer.
  const chosen = digits.slice(0, DIGIT_TEMPLATES[template].slots).sort((a,b) => b - a);
  let response = chosen;
  if (template === "alternating") response = [chosen[0], chosen[2], chosen[1], chosen[3]];
  return { template, result: evaluateDigits(template, response) };
}

export function formatDigitEquation(puzzle: DigitPuzzle, digits: number[]): string {
  return `${DIGIT_TEMPLATES[puzzle.template].tokens.map(token => typeof token === "number" ? digits[token] : token).join(" ")} = ${puzzle.result}`;
}

export function isDigitPuzzle(value: unknown): value is DigitPuzzle {
  if (!value || typeof value !== "object") return false;
  const puzzle = value as DigitPuzzle;
  return Object.prototype.hasOwnProperty.call(DIGIT_TEMPLATES, puzzle.template) && Number.isInteger(puzzle.result) && puzzle.result > 0 && puzzle.result <= 90 && digitSolutions(puzzle).length > 0;
}
