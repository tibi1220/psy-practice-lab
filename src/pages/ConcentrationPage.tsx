import { useEffect, useRef, useState } from "react";
import { GuidedDemoModal } from "../components/GuidedDemoModal";
import ReasoningPractice, { practicePrimary, practiceSecondary } from "../components/ReasoningPractice";
import type { PracticeConfig } from "../components/ReasoningPractice";
import { CONCENTRATION_PATHS, concentrationAnswer, concentrationDifficulty, concentrationExplanation, concentrationKey, createConcentrationPuzzle, isConcentrationPuzzle } from "../lib/concentration";
import type { ConcentrationPuzzle } from "../lib/concentration";

function ConcentrationSymbol({ puzzle, compact = false }: { puzzle: ConcentrationPuzzle; compact?: boolean }) {
  const names = { e: "E", nine: "angular 9", "mirrored-e": "backwards E", f: "F", "closed-e": "E-like symbol with a closed upper section", "broken-e": "E-like symbol with a broken vertical stroke" };
  return <svg viewBox="0 0 220 220" role="img" aria-label={`${names[puzzle.glyph]}, rotated ${puzzle.rotation} degrees, with ${puzzle.dots.length} dots`} className={`mx-auto aspect-square w-full ${compact ? "max-w-52" : "max-w-72"} rounded-2xl border border-white/15 bg-slate-200`}>
    <path d={CONCENTRATION_PATHS[puzzle.glyph]} transform={`rotate(${puzzle.rotation} 110 110)`} stroke="#020617" strokeWidth={7} strokeLinecap="square" strokeLinejoin="miter" fill="none" />
    {puzzle.dots.map((dot, index) => <circle key={index} cx={dot.x} cy={dot.y} r={5.5} fill="#020617" />)}
  </svg>;
}
function ConcentrationQuestion({ puzzle, submit, compact = false }: { puzzle: ConcentrationPuzzle; submit: (response: boolean) => void; compact?: boolean }) {
  const locked = useRef(false);
  const callback = useRef(submit);
  // Keep one listener per displayed symbol, with no repeat-key submissions.
  useEffect(() => { callback.current = submit; }, [submit]);
  useEffect(() => {
    const handle = (event: KeyboardEvent) => {
      const target = event.target instanceof HTMLElement ? event.target : null;
      const answer = concentrationKey({ ...event, key: event.key, repeat: event.repeat, altKey: event.altKey, ctrlKey: event.ctrlKey, metaKey: event.metaKey, targetTag: target?.tagName, editable: target?.isContentEditable });
      if (answer === null || locked.current) return;
      event.preventDefault(); locked.current = true; callback.current(answer);
    };
    window.addEventListener("keydown", handle);
    return () => window.removeEventListener("keydown", handle);
  }, []);
  const answer = (response: boolean) => { if (locked.current) return; locked.current = true; callback.current(response); };
  return <div>
    <h2 className="mb-6 text-center text-lg font-semibold">Is this an upright E with exactly three dots?</h2>
    <ConcentrationSymbol puzzle={puzzle} compact={compact} />
    <div className="mt-6 flex justify-center gap-4"><button type="button" className={practiceSecondary} aria-keyshortcuts="A" onClick={() => answer(false)}>Incorrect <kbd className="ml-2 rounded border border-white/20 px-2 py-1 text-xs">A</kbd></button><button type="button" className={practicePrimary} aria-keyshortcuts="D" onClick={() => answer(true)}>Correct <kbd className="ml-2 rounded border border-slate-950/20 px-2 py-1 text-xs">D</kbd></button></div>
    <p className="mt-4 text-center text-sm text-slate-400">Check both the symbol and all the dots. Answering advances immediately.</p>
  </div>;
}
function PracticeTrial() {
  const [running, setRunning] = useState(false);
  const [remaining, setRemaining] = useState(30);
  const [puzzle, setPuzzle] = useState(() => createConcentrationPuzzle(false));
  const [answers, setAnswers] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [message, setMessage] = useState("");
  const deadline = useRef(0);
  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => {
      const seconds = Math.max(0, Math.ceil((deadline.current - performance.now()) / 1000));
      setRemaining(seconds); if (!seconds) setRunning(false);
    }, 100);
    return () => window.clearInterval(timer);
  }, [running]);
  const start = () => { deadline.current = performance.now() + 30_000; setRemaining(30); setAnswers(0); setCorrect(0); setMessage(""); setPuzzle(createConcentrationPuzzle(false)); setRunning(true); };
  const submit = (response: boolean) => {
    if (!running || performance.now() >= deadline.current) { setRunning(false); setRemaining(0); return; }
    const good = response === concentrationAnswer(puzzle);
    setMessage(`${good ? "Good answer." : "That answer was wrong."} ${concentrationExplanation(puzzle)}`);
    setAnswers(total => total + 1); if (good) setCorrect(total => total + 1);
    setPuzzle(createConcentrationPuzzle(answers >= 10));
  };
  return <div className="w-full">{running ? <><p role="timer" aria-label="Practice time remaining" className="mb-4 text-center font-mono text-emerald-300">{remaining} s · {correct}/{answers} correct</p><ConcentrationQuestion key={answers} puzzle={puzzle} submit={submit} compact /><p role="status" className="mt-4 text-center text-sm text-slate-300">{message}</p></> : <div className="text-center">{remaining === 0 && <p role="status" className="mb-5 font-mono text-emerald-300">Practice complete: {correct}/{answers} correct. Nothing has been saved.</p>}<button type="button" className={practicePrimary} onClick={start}>{remaining === 0 ? "Repeat 30-second practice" : "Start 30-second practice"}</button></div>}</div>;
}
const positive: ConcentrationPuzzle = { glyph: "e", rotation: 0, dots: [{ x: 110, y: 42 }, { x: 80, y: 178 }, { x: 140, y: 178 }], difficulty: 0 };
function ConcentrationDemo() {
  return <GuidedDemoModal title="Concentration walkthrough" theme="emerald" introduction="Classify the symbol quickly while checking both conditions. This practice trial does not affect saved results." steps={[
    { title: "Check the shape", description: "Only an upright, complete E matches. A 9, F, mirrored or rotated E, or a symbol with an extra or missing stroke does not match.", visual: <div className="w-full"><ConcentrationSymbol puzzle={{ ...positive, glyph: "nine" }} /><p className="mt-4 text-center text-rose-300">Incorrect: three dots, but the symbol is a 9.</p></div> },
    { title: "Count every dot", description: "An E is correct only when exactly three dots appear next to it. Count dots above, below, and on both sides; their arrangement does not matter.", visual: <div className="w-full"><ConcentrationSymbol puzzle={positive} /><p className="mt-4 text-center text-emerald-300">Correct: an upright E and three dots.</p></div> },
    { title: "Try 30 seconds", description: "Use A for Incorrect and D for Correct, or tap the buttons. A held key submits once. Feedback is shown in practice; the real test advances immediately and saves a review at the end.", visual: <PracticeTrial /> },
  ]} />;
}
const config: PracticeConfig<ConcentrationPuzzle, boolean> = {
  basePath: "/concentration", title: "Ability to concentrate", headline: "Check the shape. Count the dots.", defaultMinutes: 2,
  description: "Quickly decide whether each object is an upright E with exactly three dots. A two-minute concentration exercise inspired by scales e3+.",
  difficultyLabels: ["Easy · clear symbol differences", "Hard · close lookalikes and scattered dots"],
  adaptiveDescription: "Later rounds introduce closer symbol lookalikes and scattered dot positions after 15 and 30 answers. The rule stays the same. Hard mode starts with closer distractors; easy mode keeps clear differences.",
  createPuzzle: createConcentrationPuzzle,
  createProgressivePuzzle: context => createConcentrationPuzzle(false, Math.random, concentrationDifficulty(context.completed, context.level)),
  difficultyName: puzzle => ["Clear differences", "Close lookalikes", "Subtle differences"][puzzle.difficulty],
  instructions: [
    { title: "Check both conditions", description: "Choose Correct only for an upright, complete E with exactly three dots. Every other combination is Incorrect." },
    { title: "Count all surrounding dots", description: "Dots can appear above, below, or beside the symbol. A matching E with two, four, or five dots is Incorrect." },
    { title: "Respond quickly and accurately", description: "Press A for Incorrect and D for Correct, or tap the buttons. Each answer immediately displays a new object. Holding a key does not answer multiple objects." },
    { title: "Practice, then test", description: "The tutorial includes a 30-second practice trial with feedback. The test defaults to two minutes; only submitted answers are scored and saved." },
  ],
  isPuzzle: isConcentrationPuzzle, isResponse: (_puzzle, response): response is boolean => typeof response === "boolean",
  isCorrect: (puzzle, response) => response === concentrationAnswer(puzzle),
  Question: ConcentrationQuestion,
  renderReview: (puzzle, response) => <><p className="mb-4 text-sm text-slate-300">Your answer: {response ? "Correct" : "Incorrect"}. Expected: {concentrationAnswer(puzzle) ? "Correct" : "Incorrect"}.</p><ConcentrationSymbol puzzle={puzzle} /><p className="mt-4 text-sm leading-6 text-slate-300">{concentrationExplanation(puzzle)}</p></>,
  demo: <ConcentrationDemo />,
};
export default function ConcentrationPage() { return <ReasoningPractice config={config} />; }
