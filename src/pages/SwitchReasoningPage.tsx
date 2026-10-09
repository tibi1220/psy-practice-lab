import { useCallback, useEffect, useRef, useState } from "react";
import { SwitchBoard } from "../components/SwitchBoard";
import { GuidedDemoModal } from "../components/GuidedDemoModal";
import { InstructionList, TestPageShell, TestPanel, TestSetupLayout } from "../components/TestPage";
import { ValidatedNumberInput } from "../components/ValidatedNumberInput";
import { useTestRoute } from "../hooks/useTestRoute";
import { createLocalId } from "../lib/create-local-id";
import { createSwitchPuzzle, SWITCH_EXAMPLES, formatCode, isSwitchPuzzle } from "../lib/switch-reasoning";
import type { SwitchPuzzle } from "../lib/switch-reasoning";

type Mode = "rounds" | "timed";
type Level = "easy" | "hard" | "adaptive";
type Answer = { puzzle: SwitchPuzzle; selected: number; seconds: number };
type Session = {
  id: string; completedAt: string; mode: Mode | "examples"; level: Level;
  durationSeconds: number; answers: Answer[];
};
const STORAGE_KEY = "psy-switch-reasoning-sessions";
const primary = "min-h-12 rounded-full bg-cyan-300 px-6 font-bold text-slate-950 hover:bg-cyan-200 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-300";
const secondary = "min-h-12 rounded-full border border-white/15 px-5 font-semibold hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-cyan-300";
const field = "mt-2 min-h-12 w-full rounded-xl border border-white/10 bg-slate-950 px-4 text-white focus:border-cyan-300";

function readHistory(): Session[] {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    if (!Array.isArray(stored)) return [];
    return stored.filter((session): session is Session =>
      !!session && typeof session.id === "string" && typeof session.completedAt === "string" &&
      ["examples", "rounds", "timed"].includes(session.mode) && ["easy", "hard", "adaptive"].includes(session.level) &&
      Number.isFinite(session.durationSeconds) && Array.isArray(session.answers) && session.answers.every((answer: Answer) =>
        answer && Number.isFinite(answer.seconds) && Number.isInteger(answer.selected) &&
        isSwitchPuzzle(answer.puzzle) && answer.selected >= 0 && answer.selected < answer.puzzle.options.length,
      ),
    ).slice(0, 100);
  } catch { return []; }
}

function Summary({ session }: { session: Session }) {
  const correct = session.answers.filter(answer => answer.selected === answer.puzzle.answer).length;
  return <p className="mt-3 font-mono text-cyan-300">
    {correct} / {session.answers.length} correct · {session.answers.length ? Math.round(correct / session.answers.length * 100) : 0}% · {session.durationSeconds.toFixed(1)} s
  </p>;
}

function AnswerReview({ answers }: { answers: Answer[] }) {
  return <div className="mt-6 grid gap-4 md:grid-cols-2">
    {answers.map((answer, index) => <details key={index} className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <summary className="cursor-pointer font-semibold">Question {index + 1} · {answer.selected === answer.puzzle.answer ? "Correct" : "Incorrect"} · {answer.seconds.toFixed(1)} s</summary>
      <p className="my-4 text-sm text-slate-300">Your answer: {formatCode(answer.puzzle.options[answer.selected])}. Correct answer: {formatCode(answer.puzzle.options[answer.puzzle.answer])}.</p>
      <SwitchBoard puzzle={answer.puzzle} selected={answer.selected} reveal />
    </details>)}
  </div>;
}

function SwitchDemo() {
  const example = SWITCH_EXAMPLES[0];
  const [choice, setChoice] = useState<number | null>(null);
  return <GuidedDemoModal title="Switch reasoning walkthrough" theme="cyan"
    introduction="Follow the shapes through the codes. Demo answers are not saved."
    steps={[
      { title: "Read positions, not destinations", description: "Each digit tells you which input position supplies the next output shape. Code 1-2-4-3 keeps the first two shapes and swaps the last two.", visual: <SwitchBoard puzzle={example} reveal /> },
      { title: "Apply fixed codes first", description: "With two stages, the first code is given. Its output becomes the input for the code you must choose. Positions are counted again from that intermediate sequence.", visual: <SwitchBoard puzzle={SWITCH_EXAMPLES[3]} reveal /> },
      { title: "Try a code", description: "Choose the code that changes the input into the shown output. During a test, selecting a code submits immediately and opens the next question.", visual: <div className="w-full"><SwitchBoard puzzle={example} onChoose={setChoice} /><p aria-live="polite" className="mt-4 text-center text-cyan-200">{choice === null ? "Choose a code." : choice === example.answer ? "Correct! 1-2-4-3 swaps the cross and star." : "Try again: the first two shapes stay in place; the last two swap."}</p></div> },
    ]} />;
}

export default function SwitchReasoningPage() {
  const [view, setView] = useState<"setup" | "test" | "result">("setup");
  const [mode, setMode] = useState<Mode>("timed");
  const [level, setLevel] = useState<Level>("adaptive");
  const [roundCount, setRoundCount] = useState(20);
  const [minutes, setMinutes] = useState(6);
  const [puzzle, setPuzzle] = useState<SwitchPuzzle>(SWITCH_EXAMPLES[0]);
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
  }, []);
  const { beginTestRoute, completeTestRoute, returnToSetupRoute } = useTestRoute({
    basePath: "/switch-reasoning", view, onReturnToSetup: returnToSetup,
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

  const nextPuzzle = (completed: Answer[]) => {
    // Adaptive practice advances after four correct answers in the last five.
    const recent = completed.slice(-5);
    const advanced = level === "hard" || (level === "adaptive" && recent.filter(answer => answer.selected === answer.puzzle.answer).length >= 4);
    return createSwitchPuzzle(advanced ? 2 : 1);
  };

  const start = () => {
    const first = nextPuzzle([]);
    const now = performance.now();
    startedRef.current = now;
    questionStartedRef.current = now;
    deadlineRef.current = mode === "timed" ? now + minutes * 60_000 : Infinity;
    answersRef.current = [];
    activeRef.current = true;
    setAnswers([]);
    setPuzzle(first);
    setRemaining(minutes * 60);
    setSession(null);
    setView("test");
    beginTestRoute();
  };

  const choose = (value: number) => {
    if (!activeRef.current) return;
    const now = performance.now();
    if (now >= deadlineRef.current) { finish(); return; }
    const completed = [...answersRef.current, { puzzle, selected: value, seconds: (now - questionStartedRef.current) / 1000 }];
    answersRef.current = completed;
    setAnswers(completed);
    const total = roundCount;
    if (mode !== "timed" && completed.length >= total) { finish(); return; }
    setPuzzle(nextPuzzle(completed));
    questionStartedRef.current = performance.now();
  };

  if (view === "test") return <main className="min-h-dvh bg-slate-950 px-4 py-6 text-white">
    <div className="mx-auto max-w-2xl">
      <header className="mb-6 flex items-center justify-between gap-4">
        <div><p className="font-mono text-sm text-cyan-300">Question {answers.length + 1}{mode === "timed" ? "" : ` of ${roundCount}`}</p><h1 className="mt-1 text-xl font-bold">Find the matching code</h1></div>
        {mode === "timed" && <p role="timer" aria-label="Time remaining" className="font-mono text-2xl">{Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, "0")}</p>}
      </header>
      <SwitchBoard puzzle={puzzle} onChoose={choose} />
      <p className="mt-5 text-center text-sm leading-6 text-slate-400">Each digit selects a position from the current input. Apply any fixed code first, then choose the code that gives the final output.</p>
      <div className="mt-6 flex justify-between gap-3"><button type="button" className={secondary} onClick={returnToSetupRoute}>Cancel session</button><button type="button" className={secondary} onClick={finish}>Finish session</button></div>
    </div>
  </main>;

  return <TestPageShell accent="cyan">
    {view === "setup" ? <TestSetupLayout accent="cyan" eyebrow="Switch reasoning" title="Find the matching code."
      description={<p>Trace shapes through numerical codes to match an input sequence to its output, inspired by the switchChallenge practice tasks.</p>}
      actions={<><button type="button" className={primary} onClick={start}>Start test</button><SwitchDemo /></>}>
      <div className="space-y-4">
        <TestPanel title="Test settings">
          <label className="block text-sm font-semibold">Practice mode<select className={field} value={mode} onChange={event => setMode(event.target.value as Mode)}><option value="rounds">Randomized questions · untimed</option><option value="timed">Timed · unlimited questions</option></select></label>
          <label className="mt-5 block text-sm font-semibold">Difficulty<select className={field} value={level} onChange={event => setLevel(event.target.value as Level)}><option value="easy">Easy · one stage</option><option value="hard">Hard · two stages</option><option value="adaptive">Adaptive · one to two stages</option></select></label>
          {mode === "rounds" && <label className="mt-5 block text-sm font-semibold">Number of questions<ValidatedNumberInput className={field} value={roundCount} min={1} max={100} normalize={Math.round} onValueChange={setRoundCount} /></label>}
          {mode === "timed" && <label className="mt-5 block text-sm font-semibold">Test length (minutes)<ValidatedNumberInput className={field} value={minutes} min={1} max={30} normalize={Math.round} onValueChange={setMinutes} /><span className="mt-2 block font-normal text-slate-500">Choose your practice duration. Answer as many questions as you can.</span></label>}
        </TestPanel>
        <TestPanel title="Instructions"><InstructionList accent="cyan" items={[
          { title: "Number the input", description: "Read the four input positions from left to right as 1, 2, 3, and 4." },
          { title: "Read the code", description: "The first digit chooses the shape for output position 1, the second chooses position 2, and so on." },
          { title: "Chain the stages", description: "Apply the fixed code first when shown. Use that new order as the input for the next code." },
          { title: "Submit and continue", description: "An answer button submits immediately and opens the next question. Review answers after finishing." },
        ]} /></TestPanel>
      </div>
    </TestSetupLayout> : session && <section className="py-10">
      <p className="font-mono text-sm uppercase tracking-widest text-cyan-300">Session complete</p>
      <h1 className="mt-4 text-4xl font-black">Switch reasoning results</h1>
      <Summary session={session} />
      <p className="mt-3 text-slate-400">{session.mode === "examples" ? "PDF examples" : `${session.level} randomized practice`} · Average answer time: {session.answers.length ? (session.answers.reduce((sum, answer) => sum + answer.seconds, 0) / session.answers.length).toFixed(1) : "0.0"} s</p>
      <button type="button" className={`${primary} mt-6`} onClick={returnToSetupRoute}>Change settings</button>
      <AnswerReview answers={session.answers} />
    </section>}
    <section className="border-t border-white/10 py-10">
      <h2 className="text-2xl font-bold">Switch reasoning history</h2>
      <p className="mt-2 text-sm text-slate-500">Saved on this device · up to 100 sessions</p>
      {storageError && <p role="status" className="mt-3 text-amber-300">Browser storage is unavailable. This result is available until you leave the page.</p>}
      {history.length === 0 ? <p className="mt-6 text-slate-400">Complete a session to see your results here.</p> : history.map(saved => <details key={saved.id} className="mt-4 rounded-2xl border border-white/10 p-5"><summary className="cursor-pointer">{new Date(saved.completedAt).toLocaleString()} · {saved.mode === "examples" ? "PDF examples" : `${saved.mode} · ${saved.level}`}</summary><Summary session={saved} /><AnswerReview answers={saved.answers} /></details>)}
    </section>
  </TestPageShell>;
}
