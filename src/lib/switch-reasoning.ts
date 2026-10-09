export type Code = [number, number, number, number];
export type SwitchPuzzle = {
  input: Code;
  output: Code;
  fixedCodes: Code[];
  options: Code[];
  answer: number;
};

export const formatCode = (code: Code) => code.join("-");

// Each digit selects a position in the current input, rather than a destination.
export function applyCode(input: Code, code: Code): Code {
  return code.map(position => input[position - 1]) as Code;
}

export function applyChain(input: Code, codes: Code[]): Code {
  return codes.reduce(applyCode, input);
}

export function matchingOptions(puzzle: SwitchPuzzle): number[] {
  const intermediate = applyChain(puzzle.input, puzzle.fixedCodes);
  return puzzle.options.flatMap((code, index) =>
    applyCode(intermediate, code).every((shape, position) => shape === puzzle.output[position]) ? [index] : [],
  );
}

// Shape IDs share the app's circle, star, cross, and triangle symbols.
export const SWITCH_EXAMPLES: SwitchPuzzle[] = [
  { input: [3,0,2,1], output: [3,0,1,2], fixedCodes: [], options: [[1,2,4,3],[2,1,3,4],[1,2,3,4]], answer: 0 },
  { input: [2,0,3,1], output: [3,1,0,2], fixedCodes: [], options: [[3,4,2,1],[3,2,1,4],[1,3,2,4]], answer: 0 },
  { input: [0,1,2,3], output: [3,0,1,2], fixedCodes: [], options: [[2,1,4,3],[3,1,2,4],[4,1,2,3]], answer: 2 },
  { input: [2,3,1,0], output: [0,2,1,3], fixedCodes: [[2,1,4,3]], options: [[2,4,1,3],[3,2,4,1],[4,2,3,1]], answer: 1 },
  { input: [1,3,0,2], output: [2,3,1,0], fixedCodes: [[4,2,3,1]], options: [[1,2,4,3],[2,3,1,4],[1,4,3,2]], answer: 0 },
];

function permutations(values: number[]): number[][] {
  if (values.length === 0) return [[]];
  return values.flatMap(value => permutations(values.filter(other => other !== value)).map(rest => [value, ...rest]));
}
export const ALL_CODES = permutations([1,2,3,4]) as Code[];

function shuffle<T>(values: T[], random: () => number): T[] {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index--) {
    const other = Math.floor(random() * (index + 1));
    [result[index], result[other]] = [result[other], result[index]];
  }
  return result;
}

export function createSwitchPuzzle(stages: 1 | 2, random = Math.random): SwitchPuzzle {
  const input = shuffle([0,1,2,3], random) as Code;
  const nonIdentity = ALL_CODES.filter(code => formatCode(code) !== "1-2-3-4");
  const fixedCodes = stages === 2 ? [shuffle(nonIdentity, random)[0]] : [];
  const correct = shuffle(nonIdentity, random)[0];
  const distractors = shuffle(ALL_CODES.filter(code => formatCode(code) !== formatCode(correct)), random).slice(0, 2);
  const options = shuffle([correct, ...distractors], random);
  return {
    input, fixedCodes, options,
    output: applyChain(input, [...fixedCodes, correct]),
    answer: options.indexOf(correct),
  };
}

function isSequence(value: unknown, minimum: number): value is Code {
  return Array.isArray(value) && value.length === 4 && new Set(value).size === 4 &&
    value.every(item => Number.isInteger(item) && item >= minimum && item < minimum + 4);
}

export function isSwitchPuzzle(value: unknown): value is SwitchPuzzle {
  if (!value || typeof value !== "object") return false;
  const puzzle = value as SwitchPuzzle;
  return isSequence(puzzle.input, 0) && isSequence(puzzle.output, 0) &&
    Array.isArray(puzzle.fixedCodes) && puzzle.fixedCodes.length <= 1 && puzzle.fixedCodes.every(code => isSequence(code, 1)) &&
    Array.isArray(puzzle.options) && puzzle.options.length === 3 && puzzle.options.every(code => isSequence(code, 1)) &&
    new Set(puzzle.options.map(formatCode)).size === 3 && Number.isInteger(puzzle.answer) &&
    matchingOptions(puzzle).length === 1 && matchingOptions(puzzle)[0] === puzzle.answer;
}
