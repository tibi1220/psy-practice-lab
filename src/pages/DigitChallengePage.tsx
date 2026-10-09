import { useRef, useState } from "react";
import ReasoningPractice, { practicePrimary, practiceSecondary } from "../components/ReasoningPractice";
import type { PracticeConfig } from "../components/ReasoningPractice";
import { GuidedDemoModal } from "../components/GuidedDemoModal";
import { createDigitPuzzle, digitSolutions, DIGIT_TEMPLATES, evaluateDigits, formatDigitEquation, isDigitAnswer, isDigitPuzzle, isDigitResponse } from "../lib/digit-challenge";
import type { DigitPuzzle } from "../lib/digit-challenge";

function DigitEquation({ puzzle, digits }: { puzzle: DigitPuzzle; digits: number[] }) {
  return <p className="rounded-2xl border border-white/10 bg-white/5 p-5 text-center font-mono text-xl">{formatDigitEquation(puzzle, digits)}</p>;
}

function DigitQuestion({ puzzle, submit }: { puzzle: DigitPuzzle; submit: (digits: number[]) => void }) {
  const [digits, setDigits] = useState<(number | null)[]>(Array(DIGIT_TEMPLATES[puzzle.template].slots).fill(null));
  const [activeSlot, setActiveSlot] = useState(0);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  const complete = digits.every(digit => digit !== null);
  const duplicates = new Set(digits.filter(digit => digit !== null)).size !== digits.filter(digit => digit !== null).length;
  const putDigit = (digit: number | null, slot = activeSlot) => {
    const next = [...digits]; next[slot] = digit; setDigits(next);
    if (digit !== null) {
      const empty = next.findIndex((value, index) => index > slot && value === null);
      const nextSlot = empty === -1 ? next.findIndex(value => value === null) : empty;
      if (nextSlot !== -1) { setActiveSlot(nextSlot); inputs.current[nextSlot]?.focus(); }
    }
  };
  return <div className="mx-auto max-w-xl">
    <p className="mb-6 text-center text-slate-300">Fill every blank with a digit from 1 to 9. Use each digit only once.</p>
    <div role="group" aria-label="Equation" className="flex flex-wrap items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 p-4 font-mono text-2xl">
      {DIGIT_TEMPLATES[puzzle.template].tokens.map((token, index) => typeof token === "number" ? <input key={index} ref={element => { inputs.current[token] = element; }} aria-label={`Digit ${token + 1}`} type="text" inputMode="numeric" autoComplete="off" maxLength={1} value={digits[token] ?? ""} onFocus={() => setActiveSlot(token)} onChange={event => { const value = event.currentTarget.value; if (/^[1-9]?$/.test(value)) putDigit(value === "" ? null : Number(value), token); }} className={`h-14 w-12 rounded-xl border-2 bg-slate-950 text-center outline-none focus:border-emerald-300 ${activeSlot === token ? "border-emerald-300" : "border-white/20"}`} /> : <span key={index}>{token}</span>)}
      <span>= {puzzle.result}</span>
    </div>
    <p aria-live="polite" className="my-4 min-h-6 text-center text-sm text-slate-400">{duplicates ? "Each digit can be used only once. Edit a duplicate or clear the equation." : `Editing digit ${activeSlot + 1}. Tap a blank to choose another position.`}</p>
    <div aria-label="Digit keypad" className="mx-auto grid max-w-xs grid-cols-3 gap-3">
      {Array.from({ length: 9 }, (_, index) => index + 1).map(digit => <button key={digit} type="button" disabled={digits.some((value, slot) => value === digit && slot !== activeSlot)} onClick={() => putDigit(digit)} className="min-h-14 rounded-xl border border-white/15 bg-white/5 font-mono text-2xl hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-emerald-300 disabled:opacity-25">{digit}</button>)}
    </div>
    <div className="mt-5 flex flex-wrap justify-center gap-2"><button type="button" className={practiceSecondary} onClick={() => putDigit(null)}>Erase digit</button><button type="button" className={practiceSecondary} onClick={() => { setDigits(digits.map(() => null)); setActiveSlot(0); inputs.current[0]?.focus(); }}>Clear all</button><button type="button" className={practicePrimary} disabled={!complete || duplicates} onClick={() => submit(digits as number[])}>Submit answer</button></div>
  </div>;
}

function DigitReview({ puzzle, response }: { puzzle: DigitPuzzle; response: number[] }) {
  const solutions = digitSolutions(puzzle);
  return <div className="space-y-4">
    <p className="text-sm text-slate-300">Your answer evaluates to {evaluateDigits(puzzle.template, response)}. Required result: {puzzle.result}.</p>
    <DigitEquation puzzle={puzzle} digits={response} />
    <p className="text-sm leading-6 text-slate-400">{puzzle.template === "sumProduct" || puzzle.template === "productDifference" ? "Multiply inside the parentheses first, then perform addition or subtraction." : "Work through addition and subtraction from left to right."} Any solution using distinct digits from 1 to 9 is accepted.</p>
    <h3 className="font-bold">{solutions.length} valid solutions{solutions.length > 6 ? " · first six shown" : ""}</h3>
    <ul className="space-y-2 font-mono text-sm text-emerald-200">{solutions.slice(0,6).map(solution => <li key={solution.join()}>{formatDigitEquation(puzzle, solution)}</li>)}</ul>
  </div>;
}

function DigitDemo() {
  const [message, setMessage] = useState("Try entering 9 and 2, or 8 and 1.");
  const puzzle: DigitPuzzle = { template: "difference", result: 7 };
  return <GuidedDemoModal title="Digit challenge walkthrough" theme="emerald" introduction="Build a correct equation from distinct digits. Demo answers are not saved." steps={[
    { title: "Fill the blanks", description: "You know the result. Choose digits 1 through 9 for the blanks, using each digit at most once.", visual: <DigitEquation puzzle={puzzle} digits={[9,2]} /> },
    { title: "Multiply first", description: "Parentheses show which multiplication to do before addition or subtraction. More than one arrangement may be correct.", visual: <DigitEquation puzzle={{ template: "sumProduct", result: 46 }} digits={[6,8,5]} /> },
    { title: "Try an equation", description: "Type digits or tap the keypad. Select a blank to edit it; use Clear all to start again. Submit when every blank is filled.", visual: <div className="w-full"><DigitQuestion puzzle={puzzle} submit={digits => setMessage(isDigitAnswer(puzzle, digits) ? "Correct! Both 9 − 2 and 8 − 1 make 7." : "Try again: the first digit minus the second must equal 7.")} /><p role="status" className="mt-4 text-center text-emerald-200">{message}</p></div> },
  ]} />;
}

const config: PracticeConfig<DigitPuzzle, number[]> = {
  basePath: "/digit-challenge", title: "Digit challenge", headline: "Make the equation work.",
  description: "Find distinct digits that make an equation true. Practice addition, subtraction, and multiplication inspired by digitChallenge.",
  difficultyLabels: ["Easy · two or three digits", "Hard · four digits and multiplication"],
  instructions: [
    { title: "Use distinct digits", description: "Fill each blank with a digit from 1 to 9. A digit may appear only once per equation." },
    { title: "Follow the operations", description: "Multiply inside parentheses first. Perform remaining addition and subtraction from left to right." },
    { title: "Edit your equation", description: "Type into a blank or use the keypad. Erase a digit or clear all to change your approach." },
    { title: "Submit any valid answer", description: "There can be several correct answers. Submit when all blanks are filled; review solutions after finishing." },
  ],
  createPuzzle: createDigitPuzzle, isPuzzle: isDigitPuzzle, isResponse: isDigitResponse, isCorrect: isDigitAnswer,
  Question: DigitQuestion,
  renderReview: (puzzle, response) => <DigitReview puzzle={puzzle} response={response} />,
  demo: <DigitDemo />,
};
export default function DigitChallengePage() { return <ReasoningPractice config={config} />; }
