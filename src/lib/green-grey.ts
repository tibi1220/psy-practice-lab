export type Group = "green" | "grey";
export type CharacterGrid = string[];
export type GreenGreyRule = "parity" | "matching" | "occurrences" | "row-sums" | "column-sums" | "letter-positions" |
  "total-sum" | "endpoints" | "below-above-five" | "letter-parity" | "region-ranges" |
  "sevens" | "number-ranges" | "equal-corners" | "repeated-letters" | "four-zs";
export type GreenGreyPuzzle = {
  rule: GreenGreyRule;
  target: string;
  positions: number[];
  examples: { grid: CharacterGrid; group: Group }[];
  options: CharacterGrid[];
};
export const GREEN_GREY_RULES: GreenGreyRule[] = ["parity", "matching", "occurrences", "row-sums", "column-sums", "letter-positions",
  "total-sum", "endpoints", "below-above-five", "letter-parity", "region-ranges", "sevens", "number-ranges", "equal-corners", "repeated-letters", "four-zs"];
export const EASY_GREEN_GREY_RULES: GreenGreyRule[] = ["parity", "matching", "occurrences", "endpoints", "below-above-five", "number-ranges", "sevens", "four-zs"];
export const HARD_GREEN_GREY_RULES: GreenGreyRule[] = ["row-sums", "column-sums", "letter-positions", "total-sum", "letter-parity", "region-ranges", "equal-corners", "repeated-letters"];
// Row-major coordinates before rotation: upper three, lower three, left three, right three.
export const DIAMOND_REGIONS = { top: [0, 1, 3], bottom: [5, 7, 8], left: [3, 6, 7], right: [1, 2, 5] };
const pairs = [[0, 8], [2, 6], [1, 7], [3, 5]];
const letterPatterns = [[0, 4, 8], [2, 4, 6]];
const letters = Array.from("ABCDEFGHIJKLMNOPQRSTUVWXYZ");
const isNumber = (value: string) => /^[1-9]$/.test(value);
const isLetter = (value: string) => /^[A-Z]$/.test(value);
const sum = (grid: CharacterGrid, indices: number[]) => indices.reduce((total, index) => total + Number(grid[index]), 0);

export function classifyGreenGrey(puzzle: Pick<GreenGreyPuzzle, "rule" | "target" | "positions">, grid: CharacterGrid): Group | null {
  switch (puzzle.rule) {
    case "total-sum": {
      const numbers = grid.filter(isNumber);
      if (numbers.length === 0) return null;
      const total = numbers.reduce((result, value) => result + Number(value), 0);
      return total < 10 ? "green" : total > 10 ? "grey" : null;
    }
    case "endpoints": {
      if (!isNumber(grid[0]) || !isNumber(grid[8])) return null;
      return Number(grid[0]) < Number(grid[8]) ? "green" : Number(grid[0]) > Number(grid[8]) ? "grey" : null;
    }
    case "below-above-five":
    case "number-ranges": {
      if (!grid.every(isNumber)) return null;
      if (grid.every(value => Number(value) < 5)) return "green";
      return grid.every(value => Number(value) >= (puzzle.rule === "number-ranges" ? 5 : 6)) ? "grey" : null;
    }
    case "letter-parity": return grid.filter(isLetter).length % 2 === 1 ? "green" : "grey";
    case "region-ranges": {
      const low = (indices: number[]) => indices.every(index => isNumber(grid[index]) && Number(grid[index]) <= 5);
      const high = (indices: number[]) => indices.every(index => isNumber(grid[index]) && Number(grid[index]) >= 6);
      return low(DIAMOND_REGIONS.top) && high(DIAMOND_REGIONS.bottom) ? "green" : high(DIAMOND_REGIONS.top) && low(DIAMOND_REGIONS.bottom) ? "grey" : null;
    }
    case "sevens": return grid.filter(value => value === "7").length >= 3 ? "green" : "grey";
    case "four-zs": return grid.filter(value => value === "Z").length >= 4 ? "green" : "grey";
    case "equal-corners": return [0, 2, 6, 8].every(index => grid[index] === grid[0]) ? "grey" : "green";
    case "repeated-letters": return letters.some(letter => grid.filter(value => value === letter).length >= 5) ? "green" : "grey";
    case "parity":
      if (grid.every(value => isNumber(value) && Number(value) % 2 === 0)) return "green";
      return grid.every(value => isNumber(value) && Number(value) % 2 === 1) ? "grey" : null;
    case "matching": return grid[puzzle.positions[0]] === grid[puzzle.positions[1]] ? "green" : "grey";
    case "occurrences": {
      const count = grid.filter(value => value === puzzle.target).length;
      return count === 3 ? "green" : count === 1 ? "grey" : null;
    }
    case "row-sums":
    case "column-sums": {
      const first = puzzle.rule === "row-sums" ? DIAMOND_REGIONS.top : DIAMOND_REGIONS.left;
      const second = puzzle.rule === "row-sums" ? DIAMOND_REGIONS.bottom : DIAMOND_REGIONS.right;
      if (![...first, ...second].every(index => isNumber(grid[index]))) return null;
      const difference = sum(grid, second) - sum(grid, first);
      return difference > 0 ? "green" : difference < 0 ? "grey" : null;
    }
    case "letter-positions": {
      const letterIndices = grid.flatMap((value, index) => isLetter(value) ? [index] : []);
      if (letterIndices.length !== 3) return null;
      if (puzzle.positions.every(index => letterIndices.includes(index))) return "green";
      return puzzle.positions.every(index => !letterIndices.includes(index)) ? "grey" : null;
    }
  }
}

function shuffle<T>(values: T[], random: () => number): T[] {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index--) {
    const other = Math.floor(random() * (index + 1));
    [result[index], result[other]] = [result[other], result[index]];
  }
  return result;
}

export function createGreenGreyPuzzle(advanced: boolean, random = Math.random, ruleOverride?: GreenGreyRule): GreenGreyPuzzle {
  const rules = advanced ? HARD_GREEN_GREY_RULES : EASY_GREEN_GREY_RULES;
  const pick = <T,>(values: T[]): T => values[Math.floor(random() * values.length)];
  const rule = ruleOverride ?? pick(rules);
  const target = pick(letters);
  const positions = [...(rule === "matching" ? pick(pairs) : rule === "letter-positions" ? pick(letterPatterns) : [])];
  const numeric = () => String(1 + Math.floor(random() * 9));
  const character = () => pick([...letters, "1", "2", "3", "4", "5", "6", "7", "8", "9"]);
  const makeGrid = (group: Group): CharacterGrid => {
    const grid = Array.from({ length: 9 }, character);
    const randomIndices = () => shuffle(Array.from({ length: 9 }, (_, index) => index), random);
    const repeat = (value: string, count: number) => {
      const indices = randomIndices().slice(0, count);
      grid.forEach((_, index) => { grid[index] = indices.includes(index) ? value : pick([...letters, "1", "2", "3", "4", "5", "6", "7", "8", "9"].filter(other => other !== value)); });
    };
    switch (rule) {
      case "total-sum": {
        const count = pick([2, 3, 4]);
        const indices = randomIndices().slice(0, count);
        grid.forEach((_, index) => { grid[index] = pick(letters); });
        indices.forEach(index => { grid[index] = "1"; });
        const total = group === "green" ? count + Math.floor(random() * (10 - count)) : 11 + Math.floor(random() * (Math.min(9 * count, 24) - 10));
        let remaining = total - count;
        for (const index of indices) {
          const added = Math.min(8, remaining);
          grid[index] = String(1 + added); remaining -= added;
        }
        break;
      }
      case "endpoints": {
        const first = 1 + Math.floor(random() * 8);
        const second = first + 1 + Math.floor(random() * (9 - first));
        grid[0] = String(group === "green" ? first : second);
        grid[8] = String(group === "green" ? second : first);
        break;
      }
      case "below-above-five":
      case "number-ranges": return grid.map(() => pick(group === "green" ? ["1", "2", "3", "4"] : rule === "number-ranges" ? ["5", "6", "7", "8", "9"] : ["6", "7", "8", "9"]));
      case "letter-parity": {
        const count = pick(group === "green" ? [1, 3, 5, 7] : [2, 4, 6, 8]);
        const indices = randomIndices().slice(0, count);
        grid.forEach((_, index) => { grid[index] = indices.includes(index) ? pick(letters) : numeric(); });
        break;
      }
      case "region-ranges": {
        const low = group === "green" ? DIAMOND_REGIONS.top : DIAMOND_REGIONS.bottom;
        const high = group === "green" ? DIAMOND_REGIONS.bottom : DIAMOND_REGIONS.top;
        low.forEach(index => { grid[index] = pick(["1", "2", "3", "4", "5"]); });
        high.forEach(index => { grid[index] = pick(["6", "7", "8", "9"]); });
        break;
      }
      case "sevens": repeat("7", pick(group === "green" ? [3, 4, 5, 6] : [0, 1, 2])); break;
      case "four-zs": repeat("Z", pick(group === "green" ? [4, 5, 6, 7] : [0, 1, 2, 3])); break;
      case "equal-corners": {
        const value = character();
        [0, 2, 6, 8].forEach(index => { grid[index] = value; });
        if (group === "green") grid[pick([0, 2, 6, 8])] = pick([...letters, "1", "2", "3", "4", "5", "6", "7", "8", "9"].filter(other => other !== value));
        break;
      }
      case "repeated-letters": {
        if (group === "green") repeat(target, pick([5, 6, 7, 8]));
        else {
          const others = shuffle(letters.filter(letter => letter !== target), random);
          const count = pick([0, 1, 2, 3, 4]);
          grid.forEach((_, index) => { grid[index] = index < count ? target : index % 2 === 0 ? numeric() : others[index]; });
          return shuffle(grid, random);
        }
        break;
      }
      case "parity": return grid.map(() => pick(group === "green" ? ["2", "4", "6", "8"] : ["1", "3", "5", "7", "9"]));
      case "matching": {
        grid[positions[0]] = character();
        grid[positions[1]] = group === "green" ? grid[positions[0]] : pick([...letters, "1", "2", "3", "4", "5", "6", "7", "8", "9"].filter(value => value !== grid[positions[0]]));
        break;
      }
      case "occurrences": {
        const indices = shuffle(Array.from({ length: 9 }, (_, index) => index), random).slice(0, group === "green" ? 3 : 1);
        grid.forEach((value, index) => { grid[index] = indices.includes(index) ? target : value === target ? pick(letters.filter(letter => letter !== target)) : value; });
        break;
      }
      case "row-sums":
      case "column-sums": {
        const first = rule === "row-sums" ? DIAMOND_REGIONS.top : DIAMOND_REGIONS.left;
        const second = rule === "row-sums" ? DIAMOND_REGIONS.bottom : DIAMOND_REGIONS.right;
        first.forEach(index => { grid[index] = numeric(); });
        second.forEach(index => { grid[index] = numeric(); });
        // Repair ties and reverse the regions when needed, preserving varied overlapping values.
        if (sum(grid, first) === sum(grid, second)) grid[first[0]] = grid[first[0]] === "9" ? "8" : String(Number(grid[first[0]]) + 1);
        if ((sum(grid, second) > sum(grid, first)) !== (group === "green")) first.forEach((index, offset) => { [grid[index], grid[second[offset]]] = [grid[second[offset]], grid[index]]; });
        break;
      }
      case "letter-positions": {
        const indices = group === "green" ? positions : shuffle(Array.from({ length: 9 }, (_, index) => index).filter(index => !positions.includes(index)), random).slice(0, 3);
        grid.forEach((_, index) => { grid[index] = indices.includes(index) ? pick(letters) : numeric(); });
        break;
      }
    }
    return grid;
  };
  const examples = shuffle((["green", "green", "green", "grey", "grey", "grey"] as Group[]).map(group => ({ grid: makeGrid(group), group })), random);
  if (examples.slice(0, 3).every(example => example.group === examples[0].group)) [examples[1], examples[4]] = [examples[4], examples[1]];
  const options = shuffle((["green", "green", "grey", "grey"] as Group[]).map(makeGrid), random);
  return { rule, target, positions, examples, options };
}

const positionNames = ["top", "upper-right", "right", "upper-left", "centre", "lower-right", "left", "lower-left", "bottom"];
export function greenGreyExplanation(puzzle: GreenGreyPuzzle): string {
  switch (puzzle.rule) {
    case "total-sum": return "In green grids, the sum of all numbers is below 10. In grey grids, it is greater than 10. Ignore letters; no grid totals exactly 10.";
    case "endpoints": return "In green grids, the topmost number is smaller than the bottommost number. In grey grids, the topmost number is larger. Other cells are distractors.";
    case "below-above-five": return "Green grids contain only numbers less than 5 (1–4). Grey grids contain only numbers greater than 5 (6–9). Neither group contains 5.";
    case "number-ranges": return "Every number in a green grid is in the range 1–4. Every number in a grey grid is in the range 5–9.";
    case "letter-parity": return "Green grids contain an odd number of letters. Grey grids contain an even number of letters. Count letters, ignoring their identities and positions.";
    case "region-ranges": return "In green grids, the top three numbers are in the range 1–5 and the bottom three are in the range 6–9. Grey grids reverse these ranges. The middle three cells are distractors.";
    case "sevens": return "Green grids contain at least three 7s. Grey grids contain fewer than three 7s. Their positions do not matter.";
    case "four-zs": return "Green grids contain at least four Zs. Grey grids contain fewer than four Zs. Their positions do not matter.";
    case "equal-corners": return "In grey grids, all four corner values (top, right, bottom, and left) are equal. In green grids, the four corners are not all equal. Other cells are distractors.";
    case "repeated-letters": return "Green grids contain at least five copies of one letter. Grey grids have no letter repeated five or more times. Ignore numbers and positions.";
    case "parity": return "Green grids contain only even numbers. Grey grids contain only odd numbers.";
    case "matching": return `In green grids, the ${positionNames[puzzle.positions[0]]} and ${positionNames[puzzle.positions[1]]} cells match. In grey grids they differ. Other cells are distractors.`;
    case "occurrences": return `Green grids contain exactly three ${puzzle.target}s. Grey grids contain exactly one. Their positions do not matter.`;
    case "row-sums": return "In green grids, the bottom three cells have a larger sum than the top three cells. In grey grids, the top three have a larger sum. The three cells across the middle are distractors.";
    case "column-sums": return "In green grids, the rightmost three cells have a larger sum than the leftmost three cells. In grey grids, the leftmost three have a larger sum. The three cells down the middle are distractors.";
    case "letter-positions": return `Green grids have letters in the ${puzzle.positions.map(index => positionNames[index]).join(", ")} cells and numbers elsewhere. Grey grids have numbers in those cells and three letters elsewhere.`;
  }
}
export function isGreenGreyResponse(value: unknown): value is Group[] {
  return Array.isArray(value) && value.length === 4 && value.every(group => group === "green" || group === "grey");
}
export function isGreenGreyAnswer(puzzle: GreenGreyPuzzle, response: Group[]): boolean {
  return isGreenGreyResponse(response) && puzzle.options.every((grid, index) => classifyGreenGrey(puzzle, grid) === response[index]);
}
export function isGreenGreyPuzzle(value: unknown): value is GreenGreyPuzzle {
  if (!value || typeof value !== "object") return false;
  const puzzle = value as GreenGreyPuzzle;
  const validGrid = (grid: unknown): grid is CharacterGrid => Array.isArray(grid) && grid.length === 9 && grid.every(character => typeof character === "string" && /^[A-Z1-9]$/.test(character));
  if (!GREEN_GREY_RULES.includes(puzzle.rule) || !letters.includes(puzzle.target) || !Array.isArray(puzzle.positions)) return false;
  const allowed = puzzle.rule === "matching" ? pairs : puzzle.rule === "letter-positions" ? letterPatterns : [[]];
  if (!allowed.some(pattern => pattern.length === puzzle.positions.length && pattern.every((position, index) => position === puzzle.positions[index]))) return false;
  return Array.isArray(puzzle.examples) && puzzle.examples.length === 6 && puzzle.examples.filter(example => example?.group === "green").length === 3 &&
    puzzle.examples.filter(example => example?.group === "grey").length === 3 && puzzle.examples.every(example => example && validGrid(example.grid) && classifyGreenGrey(puzzle, example.grid) === example.group) &&
    Array.isArray(puzzle.options) && puzzle.options.length === 4 && puzzle.options.every(grid => validGrid(grid) && classifyGreenGrey(puzzle, grid) !== null);
}
