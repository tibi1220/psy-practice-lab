import { useState } from "react";
import ReasoningPractice from "../components/ReasoningPractice";
import type { PracticeConfig } from "../components/ReasoningPractice";
import { GuidedDemoModal } from "../components/GuidedDemoModal";
import { createOddPuzzle, isOddPuzzle, oddExplanation } from "../lib/odd-one-out";
import type { OddPuzzle } from "../lib/odd-one-out";

function OddSymbol({ puzzle, index }: { puzzle: OddPuzzle; index: number }) {
  const item = puzzle.objects[index];
  const color = "#e2e8f0";
  return <svg viewBox="0 0 100 100" aria-hidden="true" className="h-full w-full">
    {puzzle.rule === "rotation" && <path d="M50 15 80 80H20Z" fill={color} transform={`rotate(${item.rotation * 90} 50 50)`} />}
    {puzzle.rule === "lines" && <><rect x="15" y="10" width="70" height="80" rx="3" fill="#1e293b" stroke="#94a3b8" strokeWidth="2" />{item.lines === 1 ? <path d="M50 25V75" stroke={color} strokeWidth="4" /> : <path d="M40 25V75M60 25V75" stroke={color} strokeWidth="4" />}</>}
    {puzzle.rule === "containment" && <>
      {index % 3 === 0 ? <ellipse cx="47" cy="50" rx="35" ry="29" fill="none" stroke={color} strokeWidth="3" /> : index % 3 === 1 ? <rect x="15" y="15" width="65" height="70" fill="none" stroke={color} strokeWidth="3" /> : <path d="M50 10 90 85H10Z" fill="none" stroke={color} strokeWidth="3" />}
      <rect x={item.contained ? 38 : 72} y={index % 3 === 2 ? 57 : 40} width="24" height="18" fill={color} stroke="#0f172a" strokeWidth="2" />
    </>}
    {puzzle.rule === "alternating" && <path d="M50 8 61 35 91 38 68 58 75 89 50 73 25 89 32 58 9 38 39 35Z" fill={item.filled ? color : "none"} stroke={color} strokeWidth="3" />}
    {puzzle.rule === "sides" && <path d={item.sides === 3 ? "M50 15 80 80H20Z" : ["M20 20H80V80H20Z", "M30 20H70L85 80H15Z", "M30 20H85L70 80H15Z"][index % 3]} fill={item.filled ? color : "none"} stroke={color} strokeWidth="3" />}
  </svg>;
}

function OddBoard({ puzzle, submit, selected, reveal = false }: { puzzle: OddPuzzle; submit?: (index: number) => void; selected?: number; reveal?: boolean }) {
  return <div>
    <p className="mb-5 text-center text-slate-300">{reveal ? "The correct object is highlighted." : "Select the one object that does not fit the rule. Read in numbered order."}</p>
    <div role="group" aria-label="Nine objects in numbered order" className="grid grid-cols-3 gap-3 lg:grid-cols-9">
      {puzzle.objects.map((item, index) => <button key={index} type="button" disabled={!submit} onClick={() => submit?.(index)} aria-label={`Select object ${index + 1}: ${puzzle.rule === "rotation" ? `triangle pointing ${["up", "right", "down", "left"][item.rotation]}` : puzzle.rule === "lines" ? `box with ${item.lines} ${item.lines === 1 ? "line" : "lines"}` : puzzle.rule === "alternating" ? `${item.filled ? "filled" : "outlined"} star` : puzzle.rule === "sides" ? `${item.filled ? "filled" : "outlined"} ${item.sides === 3 ? "triangle" : "quadrilateral"}` : `rectangle ${item.contained ? "inside" : "crossing"} an outer shape`}`} className={`min-w-0 rounded-xl border-2 p-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300 ${reveal && index === puzzle.answer ? "border-emerald-300 bg-emerald-300/10" : reveal && index === selected ? "border-rose-300 bg-rose-300/10" : "border-white/10 bg-white/5 hover:border-white/30"}`}>
        <div className="aspect-square"><OddSymbol puzzle={puzzle} index={index} /></div><span className="font-mono text-sm text-slate-400">{index + 1}</span>
      </button>)}
    </div>
    {reveal && <p className="mt-5 text-sm leading-6 text-slate-300">{oddExplanation(puzzle)}</p>}
  </div>;
}

const demoPuzzle = createOddPuzzle(false, () => 0.5, "alternating");
function OddDemo() {
  const [message, setMessage] = useState("Choose the star that breaks the alternating pattern.");
  return <GuidedDemoModal title="Odd-one-out walkthrough" theme="emerald" introduction="Find the governing rule, then identify the exception. Demo answers are not saved." steps={[
    { title: "Compare all nine objects", description: "Read in numbered order. Look for a shared property or a repeating sequence: orientation, fill, line count, containment, or number of sides.", visual: <OddBoard puzzle={demoPuzzle} /> },
    { title: "Find the exception", description: "Here, filled and outlined stars should alternate. Only one star breaks the pattern.", visual: <OddBoard puzzle={demoPuzzle} reveal /> },
    { title: "Try a selection", description: "Select one object. In the real test, this submits immediately and takes you to the next question.", visual: <div className="w-full"><OddBoard puzzle={demoPuzzle} submit={index => setMessage(index === demoPuzzle.answer ? "Correct! Object 5 breaks the alternating fill pattern." : "Try again: look for two consecutive stars with the same fill.")} /><p role="status" className="mt-4 text-center text-emerald-200">{message}</p></div> },
  ]} />;
}
const config: PracticeConfig<OddPuzzle, number> = {
  basePath: "/odd-one-out", title: "Odd one out", headline: "Find the rule. Spot the exception.",
  description: "Find the object that breaks a shared rule among nine objects, inspired by the scales ix inductive reasoning tasks.",
  difficultyLabels: ["Easy · fill, rotation, and sides", "Hard · line counts, containment, and rotation"],
  instructions: [
    { title: "Read in order", description: "Use the numbered order from 1 to 9, even when the layout wraps on a smaller screen." },
    { title: "Infer the rule", description: "Compare shape properties and sequences. Look at orientation, fill, line count, containment, and sides." },
    { title: "Find one exception", description: "Eight objects fit the rule. Select the one object that does not." },
    { title: "Continue and review", description: "Selecting an object submits immediately. Review the correct object and rule after finishing." },
  ],
  createPuzzle: createOddPuzzle, isPuzzle: isOddPuzzle,
  isResponse: (_puzzle, value): value is number => typeof value === "number" && Number.isInteger(value) && value >= 0 && value < 9,
  isCorrect: (puzzle, response) => response === puzzle.answer,
  Question: OddBoard,
  renderReview: (puzzle, response) => <><p className="mb-4 text-sm text-slate-300">Your answer: object {response + 1}. Correct answer: object {puzzle.answer + 1}.</p><OddBoard puzzle={puzzle} selected={response} reveal /></>,
  demo: <OddDemo />,
};
export default function OddOneOutPage() { return <ReasoningPractice config={config} />; }
