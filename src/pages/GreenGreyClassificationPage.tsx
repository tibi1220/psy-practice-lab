import { useState } from "react";
import { GuidedDemoModal } from "../components/GuidedDemoModal";
import ReasoningPractice, { practicePrimary, practiceSecondary } from "../components/ReasoningPractice";
import type { PracticeConfig } from "../components/ReasoningPractice";
import { classifyGreenGrey, createGreenGreyPuzzle, greenGreyExplanation, isGreenGreyAnswer, isGreenGreyPuzzle, isGreenGreyResponse } from "../lib/green-grey";
import type { CharacterGrid, GreenGreyPuzzle, Group } from "../lib/green-grey";

const names = ["A", "B", "C", "D"];
const groupStyles = { green: "border-emerald-300 bg-emerald-300/15 text-emerald-200", grey: "border-slate-300 bg-slate-300/15 text-slate-200" };

function DiamondGrid({ grid }: { grid: CharacterGrid }) {
  return <svg viewBox="0 0 160 150" role="img" aria-label={`Diamond grid, rows before rotation: ${grid.slice(0, 3).join(", ")}; ${grid.slice(3, 6).join(", ")}; ${grid.slice(6).join(", ")}`} className="mx-auto block w-full max-w-44">
    {grid.map((value, index) => {
      const row = Math.floor(index / 3), column = index % 3;
      const x = 80 + (column - row) * 25, y = 25 + (column + row) * 25;
      return <g key={index}><rect x={x - 16} y={y - 16} width="32" height="32" rx="2" transform={`rotate(45 ${x} ${y})`} fill="#0f172a" stroke="#64748b" strokeWidth="1" /><text x={x} y={y} textAnchor="middle" dominantBaseline="central" fill="#f8fafc" fontSize="19" fontWeight="700" fontFamily="ui-monospace, monospace">{value}</text></g>;
    })}
  </svg>;
}

function GreenGreyBoard({ puzzle, selected, choose, reveal = false }: { puzzle: GreenGreyPuzzle; selected?: (Group | null)[]; choose?: (index: number, group: Group) => void; reveal?: boolean }) {
  return <div className="mx-auto max-w-6xl">
    <h2 className="mb-3 text-center font-bold">Discover what separates the green and grey groups</h2>
    <div role="group" aria-label="Six labelled examples" className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
      {puzzle.examples.map((example, index) => <div key={index} role="group" aria-label={`Example ${index + 1}: ${example.group}`} className={`rounded-2xl border p-2 ${groupStyles[example.group]}`}>
        <p className="mb-1 text-center text-sm font-bold">{example.group === "green" ? "Green" : "Grey"} · {index + 1}</p><DiamondGrid grid={example.grid} />
      </div>)}
    </div>
    <h2 className="mb-3 mt-6 text-center font-bold">Classify all four grids</h2>
    <div role="group" aria-label="Four grids to classify" className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {puzzle.options.map((grid, index) => {
        const correct = classifyGreenGrey(puzzle, grid)!;
        return <div key={index} role="group" aria-label={`Grid ${names[index]}`} className="rounded-2xl border border-white/10 bg-white/5 p-2 sm:p-3">
          <p className="mb-1 text-center font-mono font-bold">{names[index]}</p><DiamondGrid grid={grid} />
          {choose && <div role="group" aria-label={`Classify grid ${names[index]}`} className="mt-2 grid grid-cols-2 gap-1">{(["green", "grey"] as Group[]).map(group => <button key={group} type="button" aria-label={`Grid ${names[index]}: ${group}`} aria-pressed={selected?.[index] === group} onClick={() => choose(index, group)} className={`min-h-11 rounded-xl border text-sm font-bold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300 ${selected?.[index] === group ? groupStyles[group] : "border-white/15 text-slate-300 hover:bg-white/10"}`}>{group === "green" ? "Green" : "Grey"}</button>)}</div>}
          {reveal && <div className="mt-2 text-center text-sm"><p className={`rounded-lg border px-2 py-1 font-bold ${groupStyles[correct]}`}>Correct: {correct === "green" ? "Green" : "Grey"}</p>{selected?.[index] && <p className={`mt-2 ${selected[index] === correct ? "text-emerald-200" : "text-rose-300"}`}>You chose {selected[index]} · {selected[index] === correct ? "Correct" : "Incorrect"}</p>}</div>}
        </div>;
      })}
    </div>
    {reveal && <p className="mt-5 rounded-xl border border-emerald-300/20 bg-emerald-300/10 p-4 text-sm leading-6 text-slate-200">{greenGreyExplanation(puzzle)}</p>}
  </div>;
}

function GreenGreyQuestion({ puzzle, submit }: { puzzle: GreenGreyPuzzle; submit: (response: Group[]) => void }) {
  const [selected, setSelected] = useState<(Group | null)[]>([null, null, null, null]);
  const completed = selected.filter(Boolean).length;
  return <><GreenGreyBoard puzzle={puzzle} selected={selected} choose={(index, group) => setSelected(current => current.map((value, cell) => cell === index ? group : value))} />
    <p role="status" className="my-4 text-center text-sm text-slate-400">{completed} of 4 classified. You can change any choice before submitting.</p>
    <div className="flex flex-wrap justify-center gap-3"><button type="button" className={practiceSecondary} disabled={completed === 0} onClick={() => setSelected([null, null, null, null])}>Clear classifications</button><button type="button" className={practicePrimary} disabled={completed !== 4} onClick={() => { if (isGreenGreyResponse(selected)) submit(selected); }}>Submit answer</button></div>
  </>;
}

const demoPuzzle = createGreenGreyPuzzle(true, () => 0.42, "row-sums");
function GreenGreyDemo() {
  const [message, setMessage] = useState("Compare the top and bottom three cells.");
  return <GuidedDemoModal title="Green/grey classification walkthrough" theme="emerald" introduction="Infer a rule from six labelled examples, then classify four new grids. Demo answers are not saved." steps={[
    { title: "Compare both groups", description: "Three examples are green and three are grey, in mixed order. The same hidden rule separates both groups. Characters remain upright inside the diamond grids.", visual: <GreenGreyBoard puzzle={demoPuzzle} /> },
    { title: "Discover the rule", description: "Here, compare the sums of the top three and bottom three cells. Ignore the three cells across the middle. Other rules use total sums, number ranges, matching corners, letter counts, or repeated characters such as 7 and Z.", visual: <GreenGreyBoard puzzle={demoPuzzle} reveal /> },
    { title: "Classify all four", description: "Choose Green or Grey for every grid. Change your selections or clear them before submitting. A question is correct when all four classifications are correct.", visual: <div className="w-full"><GreenGreyQuestion puzzle={demoPuzzle} submit={response => setMessage(isGreenGreyAnswer(demoPuzzle, response) ? "Correct! All four classifications match the rule." : "Try again: green has the larger sum at the bottom; grey has the larger sum at the top.")} /><p role="status" className="mt-4 text-center text-emerald-200">{message}</p></div> },
  ]} />;
}

const config: PracticeConfig<GreenGreyPuzzle, Group[]> = {
  basePath: "/green-grey-classification", title: "Inductive Reasoning — Green/Grey Classification", headline: "Discover the rule. Classify the grids.",
  description: "Compare six diamond grids from the green and grey groups, then classify four new grids using the hidden rule.",
  difficultyLabels: ["Easy · ranges, comparisons, and repetitions", "Hard · sums, corners, and letter patterns"],
  instructions: [
    { title: "Study six examples", description: "Three green and three grey examples appear in mixed order. Find the rule that separates the groups." },
    { title: "Look for relationships", description: "Check number ranges, even and odd counts, top and bottom comparisons, matching corners, repeated letters or digits, sums, and letter positions. Unrelated cells may be distractors." },
    { title: "Classify four grids", description: "Choose Green or Grey for each unlabelled grid. You may change choices or clear all classifications before submitting." },
    { title: "Submit and review", description: "All four classifications must be correct to score the question. After the test, review each grid and the rule explanation." },
  ],
  createPuzzle: createGreenGreyPuzzle, isPuzzle: isGreenGreyPuzzle, isResponse: (_puzzle, response): response is Group[] => isGreenGreyResponse(response), isCorrect: isGreenGreyAnswer,
  Question: GreenGreyQuestion, renderReview: (puzzle, response) => <GreenGreyBoard puzzle={puzzle} selected={response} reveal />, demo: <GreenGreyDemo />,
};
export default function GreenGreyClassificationPage() { return <ReasoningPractice config={config} />; }
