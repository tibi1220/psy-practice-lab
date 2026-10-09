import { useCallback, useEffect, useRef, useState } from "react";
import { DeductiveBoard, ShapeChoices } from "../components/DeductiveBoard";
import { GuidedDemoModal } from "../components/GuidedDemoModal";
import { InstructionList, TestPageShell, TestPanel, TestSetupLayout } from "../components/TestPage";
import { ValidatedNumberInput } from "../components/ValidatedNumberInput";
import { useTestRoute } from "../hooks/useTestRoute";
import { createLocalId } from "../lib/create-local-id";
import { createPuzzle, EXAMPLE_PUZZLES, SHAPE_NAMES } from "../lib/deductive-reasoning";
import type { Puzzle } from "../lib/deductive-reasoning";

type Mode = "examples" | "rounds" | "timed";
type Level = "easy" | "hard" | "adaptive";
type Answer = { puzzle: Puzzle; selected: number; seconds: number };
type Session = {
  id: string; completedAt: string; mode: Mode; level: Level;
  durationSeconds: number; answers: Answer[];
};
const STORAGE_KEY = "psy-deductive-reasoning-sessions";
const primary = "min-h-12 rounded-full bg-emerald-300 px-6 font-bold text-slate-950 hover:bg-emerald-200 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-300";
const secondary = "min-h-12 rounded-full border border-white/15 px-5 font-semibold hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-emerald-300";
const field = "mt-2 min-h-12 w-full rounded-xl border border-white/10 bg-slate-950 px-4 text-white focus:border-emerald-300";

function readHistory(): Session[] {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    if (!Array.isArray(stored)) return [];
    return stored.filter((session): session is Session =>
      !!session && typeof session.id === "string" && typeof session.completedAt === "string" &&
      ["examples", "rounds", "timed"].includes(session.mode) && ["easy", "hard", "adaptive"].includes(session.level) &&
      Number.isFinite(session.durationSeconds) && Array.isArray(session.answers) && session.answers.every((answer: Answer) =>
        answer && Number.isFinite(answer.seconds) && Number.isInteger(answer.selected) &&
        answer.puzzle && [4, 5].includes(answer.puzzle.size) && Array.isArray(answer.puzzle.cells) &&
        answer.puzzle.cells.length === answer.puzzle.size ** 2 &&
        answer.puzzle.cells.every(value => value === null || (Number.isInteger(value) && value >= 0 && value < answer.puzzle.size)) &&
        Number.isInteger(answer.puzzle.target) && answer.puzzle.target >= 0 && answer.puzzle.target < answer.puzzle.cells.length &&
        Number.isInteger(answer.puzzle.answer) && answer.puzzle.answer >= 0 && answer.puzzle.answer < answer.puzzle.size &&
        answer.selected >= 0 && answer.selected < answer.puzzle.size,
      ),
    ).slice(0, 100);
  } catch { return []; }
}

function Summary({ session }: { session: Session }) {
  const correct = session.answers.filter(answer => answer.selected === answer.puzzle.answer).length;
  return <p className="mt-3 font-mono text-emerald-300">
    {correct} / {session.answers.length} correct · {session.answers.length ? Math.round(correct / session.answers.length * 100) : 0}% · {session.durationSeconds.toFixed(1)} s
  </p>;
}

function PuzzleSolution({ puzzle }: { puzzle: Puzzle }) {
  const [fullView, setFullView] = useState(true);
  return <>
    <div role="group" aria-label="Solution display" className="mb-4 flex flex-wrap justify-center gap-2">
      <button type="button" aria-pressed={!fullView} className={`${secondary} ${!fullView ? "border-emerald-300 bg-emerald-300/10 text-emerald-200" : ""}`} onClick={() => setFullView(false)}>Solution view</button>
      <button type="button" aria-pressed={fullView} className={`${secondary} ${fullView ? "border-emerald-300 bg-emerald-300/10 text-emerald-200" : ""}`} onClick={() => setFullView(true)}>Full view</button>
    </div>
    <DeductiveBoard puzzle={puzzle} reveal showSolution={fullView} />
    <p className="mt-3 text-xs leading-5 text-slate-400">{fullView ? "One valid completed grid. Added symbols are semi-transparent with dashed cell borders; other completions may also be valid." : "Original clues with the correct shape in the question-mark cell."}</p>
  </>;
}

function AnswerReview({ answers }: { answers: Answer[] }) {
  return <div className="mt-6 grid gap-4 md:grid-cols-2">
    {answers.map((answer, index) => <details key={index} className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <summary className="cursor-pointer font-semibold">Question {index + 1} · {answer.selected === answer.puzzle.answer ? "Correct" : "Incorrect"} · {answer.seconds.toFixed(1)} s</summary>
      <p className="my-4 text-sm text-slate-300">Your answer: {SHAPE_NAMES[answer.selected]}. Correct answer: {SHAPE_NAMES[answer.puzzle.answer]}.</p>
      <PuzzleSolution puzzle={answer.puzzle} />
      {answer.puzzle.rationale && <p className="mt-4 text-sm leading-6 text-slate-400">{answer.puzzle.rationale}</p>}
    </details>)}
  </div>;
}

function DeductiveDemo() {
  const example = EXAMPLE_PUZZLES[0];
  const [choice, setChoice] = useState<number | null>(null);
  return <GuidedDemoModal title="Deductive reasoning walkthrough" theme="emerald"
    introduction="Find the missing shape using the row and column rules. Demo answers are not saved."
    steps={[
      { title: "One of each shape", description: "Every row and column contains each shape exactly once. There are no smaller box rules.", visual: <DeductiveBoard puzzle={example} /> },
      { title: "Look down the target column", description: "Column 3 already has a cross, star, and triangle. Only the circle is missing. You do not need to solve every blank.", visual: <DeductiveBoard puzzle={example} reveal /> },
      { title: "Try an answer", description: "During a test, the answer buttons submit immediately. To make notes, select an empty cell first; then the buttons place a note instead.", visual: <div className="w-full"><DeductiveBoard puzzle={example} /><ShapeChoices size={4} label="Demo answer" onChoose={setChoice} /><p aria-live="polite" className="mt-4 text-center text-emerald-200">{choice === null ? "Choose the missing shape." : choice === example.answer ? "Correct! The missing shape is a circle." : "Try again: which shape is missing from column 3?"}</p></div> },
    ]} />;
}

export default function DeductiveReasoningPage() {
  const [view, setView] = useState<"setup" | "test" | "result">("setup");
  const [mode, setMode] = useState<Mode>("examples");
  const [level, setLevel] = useState<Level>("adaptive");
  const [roundCount, setRoundCount] = useState(20);
  const [minutes, setMinutes] = useState(6);
  const [puzzle, setPuzzle] = useState<Puzzle>(EXAMPLE_PUZZLES[0]);
  const [notes, setNotes] = useState<Record<number, number>>({});
  const [selectedCell, setSelectedCell] = useState<number | null>(null);
  const [remaining, setRemaining] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [session, setSession] = useState<Session | null>(null);
  const [history, setHistory] = useState<Session[]>(readHistory);
  const [storageError, setStorageError] = useState(false);
  const activeRef = useRef(false);
  const answersRef = useRef<Answer[]>([]);
  const startedRef = useRef(0);
  const questionStartedRef = useRef(0);
  const deadlineRef = useRef(0);
  const returnToSetup = useCallback(() => {
    activeRef.current = false;
    setView("setup");
    setNotes({});
    setSelectedCell(null);
  }, []);
  const { beginTestRoute, completeTestRoute, returnToSetupRoute } = useTestRoute({
    basePath: "/deductive-reasoning", view, onReturnToSetup: returnToSetup,
  });

  const finish = useCallback(() => {
    if (!activeRef.current) return;
    activeRef.current = false;
    const completed: Session = {
      id: createLocalId(), completedAt: new Date().toISOString(), mode, level,
      durationSeconds: (Math.min(performance.now(), deadlineRef.current) - startedRef.current) / 1000,
      answers: [...answersRef.current],
    };
    const updated = [completed, ...history].slice(0, 100);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)); }
    catch { setStorageError(true); }
    setHistory(updated);
    setSession(completed);
    setView("result");
    completeTestRoute();
  }, [mode, level, history, completeTestRoute]);

  useEffect(() => {
    if (view !== "test" || mode !== "timed") return;
    const timer = window.setInterval(() => {
      const timeLeft = Math.max(0, deadlineRef.current - performance.now());
      setRemaining(Math.ceil(timeLeft / 1000));
      if (timeLeft === 0) finish();
    }, 200);
    return () => window.clearInterval(timer);
  }, [view, mode, finish]);

  const nextPuzzle = (index: number, completed: Answer[]) => {
    if (mode === "examples") return EXAMPLE_PUZZLES[index];
    // Adaptive practice advances after four correct answers in the last five.
    const recent = completed.slice(-5);
    const advanced = level === "hard" || (level === "adaptive" && recent.filter(answer => answer.selected === answer.puzzle.answer).length >= 4);
    return createPuzzle(advanced ? 5 : 4, advanced ? "hard" : "easy");
  };

  const start = () => {
    const first = nextPuzzle(0, []);
    const now = performance.now();
    startedRef.current = now;
    questionStartedRef.current = now;
    deadlineRef.current = mode === "timed" ? now + minutes * 60_000 : Infinity;
    answersRef.current = [];
    activeRef.current = true;
    setAnswers([]);
    setPuzzle(first);
    setNotes({});
    setSelectedCell(null);
    setRemaining(minutes * 60);
    setSession(null);
    setView("test");
    beginTestRoute();
  };

  const choose = (value: number) => {
    if (!activeRef.current) return;
    const now = performance.now();
    if (now >= deadlineRef.current) { finish(); return; }
    if (selectedCell !== null) {
      setNotes(current => ({ ...current, [selectedCell]: value }));
      return;
    }
    const completed = [...answersRef.current, { puzzle, selected: value, seconds: (now - questionStartedRef.current) / 1000 }];
    answersRef.current = completed;
    setAnswers(completed);
    const total = mode === "examples" ? EXAMPLE_PUZZLES.length : roundCount;
    if (mode !== "timed" && completed.length >= total) { finish(); return; }
    setPuzzle(nextPuzzle(completed.length, completed));
    setNotes({});
    setSelectedCell(null);
    questionStartedRef.current = performance.now();
  };

  if (view === "test") return <main className="min-h-dvh bg-slate-950 px-4 py-6 text-white">
    <div className="mx-auto max-w-2xl">
      <header className="mb-6 flex items-center justify-between gap-4">
        <div><p className="font-mono text-sm text-emerald-300">Question {answers.length + 1}{mode === "timed" ? "" : ` of ${mode === "examples" ? 5 : roundCount}`}</p><h1 className="mt-1 text-xl font-bold">Find the missing shape</h1></div>
        {mode === "timed" && <p role="timer" aria-label="Time remaining" className="font-mono text-2xl">{Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, "0")}</p>}
      </header>
      <DeductiveBoard puzzle={puzzle} notes={notes} selectedCell={selectedCell} onSelectCell={index => setSelectedCell(current => current === index ? null : index)} />
      <p aria-live="polite" className="mt-5 text-center text-sm text-slate-300">{selectedCell === null ? "Choose a shape below to submit your answer." : `Note for row ${Math.floor(selectedCell / puzzle.size) + 1}, column ${selectedCell % puzzle.size + 1}.`}</p>
      <ShapeChoices size={puzzle.size} label={selectedCell === null ? "Answer" : "Place note"} onChoose={choose} />
      {selectedCell !== null && <div className="mt-4 flex justify-center gap-3"><button type="button" className={secondary} onClick={() => setSelectedCell(null)}>Return to answering</button><button type="button" className={secondary} onClick={() => setNotes(current => { const next = { ...current }; delete next[selectedCell]; return next; })}>Erase note</button></div>}
      <div className="mt-4 flex justify-center">
        <button type="button" disabled={Object.keys(notes).length === 0} className={`${secondary} disabled:cursor-not-allowed disabled:opacity-40`} onClick={() => { setNotes({}); setSelectedCell(null); }}>Clear all marked cells</button>
      </div>
      <p className="mt-5 text-center text-sm leading-6 text-slate-500">No repeated shape in any row or column. Tap an empty cell to make a note. Notes are optional and are not graded.</p>
      <div className="mt-6 flex justify-between gap-3"><button type="button" className={secondary} onClick={returnToSetupRoute}>Cancel session</button><button type="button" className={secondary} onClick={finish}>Finish session</button></div>
    </div>
  </main>;

  return <TestPageShell accent="emerald">
    {view === "setup" ? <TestSetupLayout accent="emerald" eyebrow="Deductive reasoning" title="Find the missing shape."
      description={<p>Use row and column rules to solve 4×4 and 5×5 shape grids, inspired by the gapChallenge practice tasks.</p>}
      actions={<><button type="button" className={primary} onClick={start}>Start test</button><DeductiveDemo /></>}>
      <div className="space-y-4">
        <TestPanel title="Test settings">
          <label className="block text-sm font-semibold">Practice mode<select className={field} value={mode} onChange={event => setMode(event.target.value as Mode)}><option value="examples">Five PDF examples · untimed</option><option value="rounds">Randomized questions · untimed</option><option value="timed">Timed · unlimited questions</option></select></label>
          {mode !== "examples" && <label className="mt-5 block text-sm font-semibold">Difficulty<select className={field} value={level} onChange={event => setLevel(event.target.value as Level)}><option value="easy">Easy · 4×4</option><option value="hard">Hard · 5×5</option><option value="adaptive">Adaptive · 4×4 to 5×5</option></select></label>}
          {mode === "rounds" && <label className="mt-5 block text-sm font-semibold">Number of questions<ValidatedNumberInput className={field} value={roundCount} min={1} max={100} normalize={Math.round} onValueChange={setRoundCount} /></label>}
          {mode === "timed" && <label className="mt-5 block text-sm font-semibold">Test length (minutes)<ValidatedNumberInput className={field} value={minutes} min={1} max={30} normalize={Math.round} onValueChange={setMinutes} /><span className="mt-2 block font-normal text-slate-500">Choose your practice duration. Answer as many questions as you can.</span></label>}
        </TestPanel>
        <TestPanel title="Instructions"><InstructionList accent="emerald" items={[
          { title: "Apply the rule", description: "Each shape appears exactly once in each row and column. There are no box rules." },
          { title: "Find the target", description: "Solve only the question-mark cell. Some other blanks may have several possibilities." },
          { title: "Make notes", description: "Select a blank, then choose a shape to place a note. Clear all marked cells to reset your notes. Return to answering before submitting." },
          { title: "Submit and continue", description: "An answer button submits immediately and opens the next question. Review answers after finishing." },
        ]} /></TestPanel>
      </div>
    </TestSetupLayout> : session && <section className="py-10">
      <p className="font-mono text-sm uppercase tracking-widest text-emerald-300">Session complete</p>
      <h1 className="mt-4 text-4xl font-black">Deductive reasoning results</h1>
      <Summary session={session} />
      <p className="mt-3 text-slate-400">{session.mode === "examples" ? "PDF examples" : `${session.level} randomized practice`} · Average answer time: {session.answers.length ? (session.answers.reduce((sum, answer) => sum + answer.seconds, 0) / session.answers.length).toFixed(1) : "0.0"} s</p>
      <button type="button" className={`${primary} mt-6`} onClick={returnToSetupRoute}>Change settings</button>
      <AnswerReview answers={session.answers} />
    </section>}
    <section className="border-t border-white/10 py-10">
      <h2 className="text-2xl font-bold">Deductive reasoning history</h2>
      <p className="mt-2 text-sm text-slate-500">Saved on this device · up to 100 sessions</p>
      {storageError && <p role="status" className="mt-3 text-amber-300">Browser storage is unavailable. This result is available until you leave the page.</p>}
      {history.length === 0 ? <p className="mt-6 text-slate-400">Complete a session to see your results here.</p> : history.map(saved => <details key={saved.id} className="mt-4 rounded-2xl border border-white/10 p-5"><summary className="cursor-pointer">{new Date(saved.completedAt).toLocaleString()} · {saved.mode === "examples" ? "PDF examples" : `${saved.mode} · ${saved.level}`}</summary><Summary session={saved} /><AnswerReview answers={saved.answers} /></details>)}
    </section>
  </TestPageShell>;
}
