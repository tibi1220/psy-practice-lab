import { useMemo } from "react";
import { completePuzzle, SHAPE_NAMES } from "../lib/deductive-reasoning";
import type { Puzzle, ShapePalette } from "../lib/deductive-reasoning";

export function DeductiveShape({ value, className = "", palette = "colored" }: { value: number; className?: string; palette?: ShapePalette }) {
  const fill = palette === "gray" ? "#9ca3af" : palette === "black" ? "#000000" : undefined;
  return <svg viewBox="0 0 64 64" aria-hidden="true" className={`aspect-square h-auto w-3/5 max-w-14 shrink-0 ${className}`}>
    {value === 0 && <circle cx="32" cy="32" r="23" fill={fill ?? "#c084fc"} />}
    {value === 1 && <path d="M32 5 40 23 60 25 45 39 49 59 32 49 15 59 19 39 4 25 24 23Z" fill={fill ?? "#22d3ee"} />}
    {value === 2 && <path d="M22 6H42V22H58V42H42V58H22V42H6V22H22Z" fill={fill ?? "#fb923c"} />}
    {value === 3 && <path d="M32 6 60 56H4Z" fill={fill ?? "#a3e635"} />}
    {value === 4 && <rect x="8" y="8" width="48" height="48" rx="3" fill={fill ?? "#f472b6"} />}
  </svg>;
}

export function DeductiveBoard({ puzzle, notes = {}, selectedCell, onSelectCell, reveal = false, showSolution = false }: {
  puzzle: Puzzle;
  notes?: Record<number, number>;
  selectedCell?: number | null;
  onSelectCell?: (index: number) => void;
  reveal?: boolean;
  showSolution?: boolean;
}) {
  const solution = useMemo(() => showSolution ? completePuzzle(puzzle) : null, [puzzle, showSolution]);
  const revealTarget = reveal || showSolution;
  return <div className="mx-auto grid w-full max-w-sm gap-1.5" style={{ gridTemplateColumns: `repeat(${puzzle.size}, minmax(0, 1fr))` }} aria-label={`${puzzle.size} by ${puzzle.size} shape grid`}>
    {puzzle.cells.map((given, index) => {
      const target = index === puzzle.target;
      const filled = given === null && (showSolution || (target && reveal));
      const value = solution?.[index] ?? (target ? (revealTarget ? puzzle.answer : null) : given ?? notes[index] ?? null);
      const editable = !showSolution && !target && given === null && !!onSelectCell;
      const label = `Row ${Math.floor(index / puzzle.size) + 1}, column ${index % puzzle.size + 1}: ${target && !revealTarget ? "question mark" : value === null ? "empty" : SHAPE_NAMES[value]}${filled ? " (solution)" : given === null && !target && value !== null ? " (note)" : ""}`;
      return <button key={index} type="button" aria-label={label} aria-pressed={editable ? selectedCell === index : undefined} disabled={!editable}
        onClick={() => onSelectCell?.(index)}
        className={`flex aspect-square items-center justify-center rounded-xl border-2 text-4xl font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300 ${target ? "border-emerald-300 bg-emerald-300/10 text-emerald-200" : selectedCell === index ? "border-white bg-white/10" : filled ? "border-white/30 bg-white/[0.04]" : "border-white/10 bg-white/[0.04]"} ${filled ? "border-dashed" : given === null && !target ? "opacity-70" : ""}`}>
        {value === null ? (target ? "?" : "") : <span className={`flex h-full w-full items-center justify-center rounded-lg ${puzzle.palette === "black" ? "bg-slate-200" : ""}`}><DeductiveShape value={value} palette={puzzle.palette} className={filled ? "opacity-50" : ""} /></span>}
      </button>;
    })}
  </div>;
}

export function ShapeChoices({ size, onChoose, label, palette = "colored", feedback }: { size: number; onChoose: (value: number) => void; label: string; palette?: ShapePalette; feedback?: { selected: number; correct: boolean } | null }) {
  return <div aria-label={label} className="mx-auto mt-5 flex max-w-lg justify-center gap-2">
    {SHAPE_NAMES.slice(0, size).map((name, value) => <button key={name} type="button" disabled={!!feedback} onClick={() => onChoose(value)} aria-label={`${label}: ${name}${feedback?.selected === value ? feedback.correct ? " · Correct" : " · Incorrect" : ""}`} className={`flex min-h-16 min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl border-2 py-2 transition focus-visible:outline-2 focus-visible:outline-emerald-300 ${feedback?.selected === value ? feedback.correct ? "border-emerald-300 bg-emerald-300/25 ring-2 ring-emerald-300" : "border-rose-400 bg-rose-400/25 ring-2 ring-rose-400" : "border-white/15 bg-white/5 enabled:hover:bg-white/15"}`}>
      <span className={`flex w-full items-center justify-center rounded-lg ${palette === "black" ? "bg-slate-200 py-1" : ""}`}><DeductiveShape value={value} palette={palette} /></span><span className="text-xs text-slate-300">{name}</span>
    </button>)}
  </div>;
}
