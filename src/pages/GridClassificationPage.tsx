import { useState } from "react";
import { DeductiveShape } from "../components/DeductiveBoard";
import { SHAPE_NAMES } from "../lib/deductive-reasoning";
import { GuidedDemoModal } from "../components/GuidedDemoModal";
import ReasoningPractice, { practicePrimary, practiceSecondary } from "../components/ReasoningPractice";
import type { PracticeConfig } from "../components/ReasoningPractice";
import { classificationExplanation, createClassificationPuzzle, isClassificationAnswer, isClassificationPuzzle, isClassificationResponse } from "../lib/grid-classification";
import type { ClassificationPuzzle, ShapeGrid } from "../lib/grid-classification";

const letters = ["A", "B", "C", "D"];
function GridSymbols({ grid }: { grid: ShapeGrid }) {
  return <div className="mx-auto grid w-full max-w-40 grid-cols-3 gap-1">{grid.map((shape, index) => <div key={index} role="img" aria-label={`Row ${Math.floor(index / 3) + 1}, column ${index % 3 + 1}: ${SHAPE_NAMES[shape]}`} className="flex aspect-square items-center justify-center rounded-md border border-white/10 bg-slate-950/60"><DeductiveShape value={shape} /></div>)}</div>;
}

function ClassificationBoard({ puzzle, selected = [], toggle, reveal = false }: { puzzle: ClassificationPuzzle; selected?: number[]; toggle?: (index: number) => void; reveal?: boolean }) {
  return <div className="mx-auto max-w-2xl">
    <h2 className="mb-3 text-center font-bold">Both examples follow the same rule</h2>
    <div className="grid grid-cols-2 gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">{puzzle.examples.map((grid, index) => <div key={index} role="group" aria-label={`Example ${index + 1}`}><p className="mb-2 text-center text-xs uppercase tracking-widest text-slate-400">Example {index + 1}</p><GridSymbols grid={grid} /></div>)}</div>
    <h2 className="mb-3 mt-5 text-center font-bold">Which two grids follow that rule?</h2>
    <div role="group" aria-label="Candidate grids" className="grid grid-cols-2 gap-3">
      {puzzle.options.map((grid, index) => <button key={index} type="button" disabled={!toggle} aria-label={`Grid ${letters[index]}`} aria-pressed={selected.includes(index)} onClick={() => toggle?.(index)} className={`rounded-2xl border-2 p-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300 ${reveal ? puzzle.answer.includes(index) ? "border-emerald-300 bg-emerald-300/10" : selected.includes(index) ? "border-rose-300 bg-rose-300/10" : "border-white/10 bg-white/5" : selected.includes(index) ? "border-emerald-300 bg-emerald-300/10" : "border-white/10 bg-white/5 hover:border-white/30"}`}>
        <p className="mb-2 font-mono font-bold">{letters[index]}{reveal && puzzle.answer.includes(index) ? " · Correct" : ""}</p><GridSymbols grid={grid} />
      </button>)}
    </div>
    {reveal && <p className="mt-5 text-sm leading-6 text-slate-300">{classificationExplanation(puzzle)}</p>}
  </div>;
}

function ClassificationQuestion({ puzzle, submit }: { puzzle: ClassificationPuzzle; submit: (response: number[]) => void }) {
  const [selected, setSelected] = useState<number[]>([]);
  const [message, setMessage] = useState("Select exactly two grids.");
  const toggle = (index: number) => {
    if (selected.includes(index)) { setSelected(selected.filter(value => value !== index)); setMessage("Select exactly two grids."); }
    else if (selected.length < 2) { setSelected([...selected, index]); setMessage("Select exactly two grids."); }
    else setMessage("Two grids are selected. Deselect one before choosing another.");
  };
  return <><ClassificationBoard puzzle={puzzle} selected={selected} toggle={toggle} /><p role="status" className="my-4 text-center text-sm text-slate-400">{message} ({selected.length} selected)</p><div className="flex justify-center gap-3"><button type="button" className={practiceSecondary} disabled={selected.length === 0} onClick={() => { setSelected([]); setMessage("Select exactly two grids."); }}>Clear selection</button><button type="button" className={practicePrimary} disabled={selected.length !== 2} onClick={() => submit(selected)}>Submit answer</button></div></>;
}

const demoPuzzle = createClassificationPuzzle(false, () => 0.5, "fixed-columns");
function ClassificationDemo() {
  const [message, setMessage] = useState("Look at the second and third columns.");
  return <GuidedDemoModal title="Grid classification walkthrough" theme="emerald" introduction="Discover the common rule in two examples, then select two matching grids. Demo answers are not saved." steps={[
    { title: "Compare the examples", description: "Both example grids follow the same rule. Check where shapes repeat, whether certain positions match, and how many times a shape appears.", visual: <ClassificationBoard puzzle={demoPuzzle} /> },
    { title: "Apply the rule", description: "Here the same shape fills the second and third columns. Exactly two candidate grids share that pattern.", visual: <ClassificationBoard puzzle={demoPuzzle} reveal /> },
    { title: "Select two grids", description: "Tap a grid to select or deselect it. Submit once exactly two are selected. A full answer is correct only if both choices match.", visual: <div className="w-full"><ClassificationQuestion puzzle={demoPuzzle} submit={response => setMessage(isClassificationAnswer(demoPuzzle, response) ? "Correct! Both grids match the examples' column pattern." : "Try again: the same shape must fill all six cells in columns 2 and 3.")} /><p role="status" className="mt-4 text-center text-emerald-200">{message}</p></div> },
  ]} />;
}

const config: PracticeConfig<ClassificationPuzzle, number[]> = {
  basePath: "/grid-classification", title: "Grid classification", headline: "Discover the shared rule.",
  description: "Infer the rule from two 3×3 example grids, then select the two matching grids. Practice inspired by scales clx inductive logical reasoning.",
  difficultyLabels: ["Easy · rows and columns", "Hard · corners, positions, and counts"],
  instructions: [
    { title: "Study both examples", description: "Find the rule shared by the two example grids. Shape identity may stay fixed or vary, depending on the rule." },
    { title: "Compare the candidates", description: "Check positions, repeated shapes, and counts against the examples." },
    { title: "Select exactly two", description: "There are always two matching grids. Tap a selected grid again to deselect it, or clear the whole selection." },
    { title: "Submit and review", description: "Submit your pair to continue. Both selections must be correct. Review the rule after finishing." },
  ],
  createPuzzle: createClassificationPuzzle, isPuzzle: isClassificationPuzzle,
  isResponse: (_puzzle, value): value is number[] => isClassificationResponse(value), isCorrect: isClassificationAnswer,
  Question: ClassificationQuestion,
  renderReview: (puzzle, response) => <><p className="mb-4 text-sm text-slate-300">Your answer: {response.map(index => letters[index]).join(" and ")}. Correct answer: {puzzle.answer.map(index => letters[index]).join(" and ")}.</p><ClassificationBoard puzzle={puzzle} selected={response} reveal /></>,
  demo: <ClassificationDemo />,
};
export default function GridClassificationPage() { return <ReasoningPractice config={config} />; }
