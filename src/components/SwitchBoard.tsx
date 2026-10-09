import { DeductiveShape } from "./DeductiveBoard";
import { SHAPE_NAMES } from "../lib/deductive-reasoning";
import { applyChain, applyCode, formatCode } from "../lib/switch-reasoning";
import type { Code, SwitchPuzzle } from "../lib/switch-reasoning";

function ShapeSequence({ shapes, label }: { shapes: Code; label: string }) {
  return <div role="group" aria-label={label}>
    <p className="mb-2 text-center text-xs font-semibold uppercase tracking-widest text-slate-400">{label}</p>
    <div className="grid grid-cols-4 gap-2">
      {shapes.map((shape, index) => <div key={index} role="img" aria-label={`Position ${index + 1}: ${SHAPE_NAMES[shape]}`} className="flex aspect-square items-center justify-center rounded-xl border border-white/10 bg-white/5"><DeductiveShape value={shape} /></div>)}
    </div>
  </div>;
}

export function SwitchBoard({ puzzle, onChoose, reveal = false, selected }: {
  puzzle: SwitchPuzzle;
  onChoose?: (index: number) => void;
  reveal?: boolean;
  selected?: number;
}) {
  const intermediate = applyChain(puzzle.input, puzzle.fixedCodes);
  return <div className="mx-auto w-full max-w-md">
    <ShapeSequence shapes={puzzle.input} label="Input" />
    {puzzle.fixedCodes.map((code, index) => <div key={index} className="my-3 text-center">
      <p aria-hidden="true" className="text-slate-500">↓</p>
      <p className="my-2 text-xs uppercase tracking-widest text-slate-400">Fixed code {index + 1}</p>
      <p className="inline-block rounded-xl border border-white/15 bg-white/10 px-6 py-3 font-mono text-2xl">{formatCode(code)}</p>
    </div>)}
    {reveal && puzzle.fixedCodes.length > 0 && <div className="my-4"><ShapeSequence shapes={intermediate} label="After fixed code" /></div>}
    <p aria-hidden="true" className="my-3 text-center text-slate-500">↓</p>
    <p className="mb-3 text-center text-sm font-semibold text-cyan-200">{reveal ? "Correct code highlighted" : "Choose the missing code"}</p>
    <div role="group" aria-label="Code choices" className="grid grid-cols-3 gap-2">
      {puzzle.options.map((code, index) => <button key={formatCode(code)} type="button" disabled={!onChoose} onClick={() => onChoose?.(index)} aria-label={`Code ${formatCode(code)}`} className={`min-h-14 rounded-xl border px-1 font-mono text-lg font-bold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 sm:text-2xl ${reveal && index === puzzle.answer ? "border-cyan-300 bg-cyan-300/15 text-cyan-200" : reveal && index === selected ? "border-rose-300 text-rose-200" : "border-white/15 bg-white/5 hover:bg-white/15"}`}>{formatCode(code)}</button>)}
    </div>
    <p aria-hidden="true" className="my-3 text-center text-slate-500">↓</p>
    <ShapeSequence shapes={puzzle.output} label="Output" />
    {reveal && <p className="mt-5 text-sm leading-6 text-slate-300">
      {puzzle.fixedCodes.length > 0 ? "Start from the sequence after the fixed code. " : "Start from the input sequence. "}
      {puzzle.options[puzzle.answer].map((position, index) => `${SHAPE_NAMES[intermediate[position - 1]]} moves from position ${position} to position ${index + 1}`).join("; ")}.
    </p>}
    {reveal && selected !== undefined && selected !== puzzle.answer && <p className="mt-3 text-sm leading-6 text-rose-200">Your code produces: {applyCode(intermediate, puzzle.options[selected]).map(shape => SHAPE_NAMES[shape]).join(", ")}.</p>}
  </div>;
}
