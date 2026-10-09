import { useEffect, useReducer, useRef, useState } from "react";
import { advanceMemoryRound, initialRoundState, spatialAnswer, spatialExplanation } from "../lib/working-memory";
import type { Dot, MemoryResponse, MemoryTask, Pattern, Segment, SpatialTask } from "../lib/working-memory";
import { practicePrimary, practiceSecondary } from "./ReasoningPractice";

export function DotField({ dots, highlighted, selected = [], choose, label = "Dot positions" }: { dots: Dot[]; highlighted?: number; selected?: number[]; choose?: (index: number) => void; label?: string }) {
  return <svg viewBox="0 0 600 400" role="group" aria-label={label} className="mx-auto block w-full max-w-3xl rounded-3xl border border-white/10 bg-slate-900">
    {dots.map((dot, index) => {
      const position = selected.indexOf(index), active = highlighted === index;
      return <g key={index} role={choose ? "button" : "img"} tabIndex={choose ? 0 : undefined} aria-label={`Dot ${index + 1}${active ? ": highlighted" : position !== -1 ? `: selection ${position + 1}` : ""}`} onClick={() => choose?.(index)} onKeyDown={event => { if (choose && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); choose(index); } }} className={choose ? "cursor-pointer focus-visible:outline-2 focus-visible:outline-emerald-300" : ""}>
        <circle cx={dot.x * 6} cy={dot.y * 4} r="28" fill="transparent" />
        <circle cx={dot.x * 6} cy={dot.y * 4} r={active ? 18 : 14} fill={active || position !== -1 ? "#6ee7b7" : "#94a3b8"} stroke={active ? "#d1fae5" : "transparent"} strokeWidth="5" />
        {position !== -1 && <text x={dot.x * 6} y={dot.y * 4 + 1} textAnchor="middle" dominantBaseline="central" fill="#020617" fontSize="18" fontWeight="800">{position + 1}</text>}
      </g>;
    })}
  </svg>;
}
function PatternFigure({ pattern, label }: { pattern: Pattern; label: string }) {
  return <svg role="img" aria-label={`${label}: ${pattern.cells.flatMap((filled, index) => filled ? [`R${Math.floor(index / pattern.columns) + 1}C${index % pattern.columns + 1}`] : []).join(", ")}`} viewBox={`0 0 ${pattern.columns * 40} ${pattern.rows * 40}`} className="mx-auto w-full max-w-52">
    {pattern.cells.map((filled, index) => <rect key={index} x={index % pattern.columns * 40 + (filled ? 7 : 17)} y={Math.floor(index / pattern.columns) * 40 + (filled ? 7 : 17)} width={filled ? 26 : 6} height={filled ? 26 : 6} rx={filled ? 3 : 1} fill={filled ? "#e2e8f0" : "#64748b"} />)}
  </svg>;
}
function LineFigure({ segments, label }: { segments: Segment[]; label: string }) {
  return <svg role="img" aria-label={`${label}: ${segments.map(segment => `line ${segment[0] + 1} to ${segment[1] + 1}`).join(", ") || "no lines"}`} viewBox="0 0 120 120" className="mx-auto w-full max-w-44 rounded-xl bg-slate-900">
    {segments.map(([first, second], index) => <line key={index} x1={20 + first % 3 * 40} y1={20 + Math.floor(first / 3) * 40} x2={20 + second % 3 * 40} y2={20 + Math.floor(second / 3) * 40} stroke="#e2e8f0" strokeWidth="4" strokeLinecap="round" />)}
    {Array.from({ length: 9 }, (_, index) => <circle key={index} cx={20 + index % 3 * 40} cy={20 + Math.floor(index / 3) * 40} r="3" fill="#94a3b8" />)}
  </svg>;
}
export function SpatialQuestion({ task, answer, explanation = false }: { task: SpatialTask; answer?: (value: boolean) => void; explanation?: boolean }) {
  const prompt = task.kind === "symmetry" ? "Is it symmetrical?" : task.kind === "rotation" ? "Rotated but identical?" : "Is the figure equation correct?";
  return <div className="mx-auto max-w-2xl">
    <h2 className="mb-5 text-center text-xl font-bold">{prompt}</h2>
    {task.kind === "equation" ? <div className="rounded-3xl border border-white/10 bg-white/5 p-4"><div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3"><LineFigure segments={task.left} label="First figure" /><span className="text-3xl font-bold">{task.operation === "add" ? "+" : "−"}</span><LineFigure segments={task.right} label="Second figure" /></div><div className="mx-auto mt-4 flex max-w-56 items-center gap-3"><span className="text-3xl font-bold">=</span><LineFigure segments={task.result} label="Result figure" /></div></div> : <div className={`grid grid-cols-2 gap-6 rounded-3xl border border-white/10 bg-white/5 p-5 ${task.kind === "symmetry" ? "divide-x divide-slate-500" : ""}`}><div><PatternFigure pattern={task.left} label="Left pattern" /></div><div className={task.kind === "symmetry" ? "pl-6" : ""}><PatternFigure pattern={task.right} label="Right pattern" /></div></div>}
    {answer && <div className="mt-5 flex justify-center gap-3"><button type="button" className={practicePrimary} onClick={() => answer(true)}>Yes</button><button type="button" className={practiceSecondary} onClick={() => answer(false)}>No</button></div>}
    {explanation && <p className="mt-4 text-sm leading-6 text-slate-300">{spatialExplanation(task)}</p>}
  </div>;
}

export function WorkingMemoryRound({ task, flashSeconds, spatialSeconds, submit }: { task: MemoryTask; flashSeconds: number; spatialSeconds: number; submit: (response: MemoryResponse) => void }) {
  const [state, dispatch] = useReducer((current: typeof initialRoundState, action: Parameters<typeof advanceMemoryRound>[1]) => advanceMemoryRound(current, action, task), initialRoundState);
  const [remaining, setRemaining] = useState(spatialSeconds);
  const stageStarted = useRef(0);
  const locked = useRef(false);
  useEffect(() => {
    stageStarted.current = performance.now();
    if (state.phase === "recall") return;
    const duration = state.phase === "flash" ? flashSeconds : state.phase === "spatial" ? spatialSeconds : 0.35;
    const timer = window.setInterval(() => {
      const elapsed = (performance.now() - stageStarted.current) / 1000;
      setRemaining(Math.max(0, duration - elapsed));
      if (elapsed < duration) return;
      window.clearInterval(timer);
      if (state.phase === "flash") { setRemaining(spatialSeconds); dispatch({ type: "flash-end" }); }
      else if (state.phase === "gap") dispatch({ type: "gap-end" });
      else dispatch({ type: "judge", response: null, seconds: duration });
    }, 50);
    return () => window.clearInterval(timer);
  }, [state.phase, state.cursor, flashSeconds, spatialSeconds]);
  if (state.phase === "spatial") return <><p role="timer" aria-label="Spatial question time remaining" className="mb-4 text-center font-mono text-emerald-300">{Math.min(spatialSeconds, Math.ceil(remaining))} s to answer · keep the dots in mind</p><SpatialQuestion task={task.spatial[state.cursor]} answer={response => { const elapsed = (performance.now() - stageStarted.current) / 1000; dispatch({ type: "judge", response: elapsed >= spatialSeconds ? null : response, seconds: Math.min(spatialSeconds, elapsed) }); }} /><p className="mt-4 text-center text-sm text-slate-400">Remember the dot sequence while you solve this question.</p></>;
  if (state.phase === "gap") return <div role="status" className="grid min-h-80 place-items-center text-slate-400">Get ready for the next dot…</div>;
  const recalling = state.phase === "recall";
  return <>
    <h2 role="status" className="mb-4 text-center text-xl font-bold">{recalling ? "Where did the dots appear, and in what order?" : `Remember dot ${state.cursor + 1} of ${task.sequence.length}`}</h2>
    <DotField dots={task.dots} highlighted={recalling ? undefined : task.sequence[state.cursor]} selected={recalling ? state.recalled : []} choose={recalling ? index => dispatch({ type: "select", index }) : undefined} />
    {recalling ? <><p role="status" className="my-4 text-center text-sm text-slate-300">{state.recalled.length} of {task.sequence.length} selected. Tap a selected dot to remove it and all later selections.</p><div className="flex flex-wrap justify-center gap-3"><button type="button" className={practiceSecondary} disabled={state.recalled.length === 0} onClick={() => dispatch({ type: "undo" })}>Undo last</button><button type="button" className={practiceSecondary} disabled={state.recalled.length === 0} onClick={() => dispatch({ type: "clear" })}>Clear selection</button><button type="button" className={practicePrimary} disabled={state.recalled.length !== task.sequence.length} onClick={() => { if (locked.current) return; locked.current = true; submit({ recalled: state.recalled, judgments: state.judgments }); }}>Submit sequence</button></div></> : <p className="mt-4 text-center text-sm text-slate-400">Remember the highlighted position. A spatial question follows automatically.</p>}
  </>;
}

export function WorkingMemoryReview({ task, response }: { task: MemoryTask; response: MemoryResponse }) {
  return <><div className="grid gap-4 sm:grid-cols-2"><div><h3 className="mb-2 text-center font-bold">Correct sequence</h3><DotField dots={task.dots} selected={task.sequence} /></div><div><h3 className="mb-2 text-center font-bold">Your sequence</h3><DotField dots={task.dots} selected={response.recalled} /></div></div>
    <p className="mt-3 text-center text-sm text-slate-400">Numbers show the order, starting with 1.</p>
    {task.spatial.map((question, index) => <details key={index} className="mt-4 rounded-xl border border-white/10 p-4"><summary className="cursor-pointer">Spatial question {index + 1} · {response.judgments[index]?.response == null ? "Not answered" : response.judgments[index].response === spatialAnswer(question) ? "Correct" : "Incorrect"}</summary><div className="mt-4"><SpatialQuestion task={question} explanation /></div></details>)}
  </>;
}
