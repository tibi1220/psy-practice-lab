import { useCallback, useEffect, useRef, useState } from "react";
import type { ComponentType, ReactNode } from "react";
import { useTestRoute } from "../hooks/useTestRoute";
import { createLocalId } from "../lib/create-local-id";
import { InstructionList, TestPageShell, TestPanel, TestSetupLayout } from "./TestPage";
import { ValidatedNumberInput } from "./ValidatedNumberInput";

export const practicePrimary = "min-h-12 rounded-full bg-emerald-300 px-6 font-bold text-slate-950 transition hover:bg-emerald-200 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-300 disabled:cursor-not-allowed disabled:opacity-40";
export const practiceSecondary = "min-h-12 rounded-full border border-white/15 px-5 font-semibold transition hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-300 disabled:cursor-not-allowed disabled:opacity-40";
const field = "mt-2 min-h-12 w-full rounded-xl border border-white/10 bg-slate-950 px-4 text-white focus:border-emerald-300";
type Mode = "timed" | "rounds";
type Level = "adaptive" | "easy" | "hard";
type Trial<P,R> = { puzzle: P; response: R; seconds: number; correct: boolean };
type Session<P,R> = { id: string; completedAt: string; mode: Mode; level: Level; durationSeconds: number; answers: Trial<P,R>[] };

export type PracticeConfig<P,R> = {
  basePath: string;
  title: string;
  headline: string;
  description: string;
  defaultMinutes?: number;
  difficultyLabels: [string, string];
  instructions: { title: string; description: string }[];
  createPuzzle: (advanced: boolean) => P;
  createProgressivePuzzle?: (context: { completed: number; level: Level }) => P;
  difficultyName?: (puzzle: P) => string;
  reviewSummary?: (puzzle: P, response: R) => string;
  adaptiveDescription?: string;
  isPuzzle: (value: unknown) => value is P;
  isResponse: (puzzle: P, response: unknown) => response is R;
  isCorrect: (puzzle: P, response: R) => boolean;
  Question: ComponentType<{ puzzle: P; submit: (response: R) => void }>;
  renderReview: (puzzle: P, response: R) => ReactNode;
  demo: ReactNode;
};

function readHistory<P,R>(config: PracticeConfig<P,R>): Session<P,R>[] {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(`psy${config.basePath}-sessions`) ?? "[]");
    if (!Array.isArray(stored)) return [];
    return stored.filter((session): session is Session<P,R> => {
      if (!session || typeof session.id !== "string" || !Number.isFinite(Date.parse(session.completedAt)) ||
        !["timed", "rounds"].includes(session.mode) || !["adaptive", "easy", "hard"].includes(session.level) ||
        !Number.isFinite(session.durationSeconds) || session.durationSeconds < 0 || !Array.isArray(session.answers)) return false;
      return session.answers.every((trial: Trial<P,R>) => trial && config.isPuzzle(trial.puzzle) &&
        config.isResponse(trial.puzzle, trial.response) && Number.isFinite(trial.seconds) && trial.seconds >= 0 &&
        trial.correct === config.isCorrect(trial.puzzle, trial.response));
    }).slice(0,100);
  } catch { return []; }
}

function ResultSummary<P,R>({ session }: { session: Session<P,R> }) {
  const correct = session.answers.filter(answer => answer.correct).length;
  const average = session.answers.length ? session.answers.reduce((sum, answer) => sum + answer.seconds, 0) / session.answers.length : 0;
  return <div className="mt-4 rounded-2xl border border-emerald-300/20 bg-emerald-300/10 p-5">
    <p className="font-mono text-xl font-bold text-emerald-300">{correct} / {session.answers.length} correct · {session.answers.length ? Math.round(correct / session.answers.length * 100) : 0}%</p>
    <p className="mt-2 text-sm text-slate-300">{session.durationSeconds.toFixed(1)} s total · {average.toFixed(1)} s per answer · {session.mode} · {session.level}</p>
  </div>;
}

export default function ReasoningPractice<P,R>({ config }: { config: PracticeConfig<P,R> }) {
  const Question = config.Question;
  const [view, setView] = useState<"setup" | "test" | "result">("setup");
  const [mode, setMode] = useState<Mode>("timed");
  const [level, setLevel] = useState<Level>("adaptive");
  const [minutes, setMinutes] = useState(config.defaultMinutes ?? 6);
  const [roundCount, setRoundCount] = useState(20);
  const [puzzle, setPuzzle] = useState<P | null>(null);
  const [advanced, setAdvanced] = useState(false);
  const [remaining, setRemaining] = useState(0);
  const [answers, setAnswers] = useState<Trial<P,R>[]>([]);
  const [session, setSession] = useState<Session<P,R> | null>(null);
  const [history, setHistory] = useState(() => readHistory(config));
  const [storageError, setStorageError] = useState(false);
  const active = useRef(false);
  const answersRef = useRef<Trial<P,R>[]>([]);
  const started = useRef(0);
  const questionStarted = useRef(0);
  const deadline = useRef(Infinity);
  const returnToSetup = useCallback(() => { active.current = false; setView("setup"); }, []);
  const { beginTestRoute, completeTestRoute, returnToSetupRoute } = useTestRoute({ basePath: config.basePath, view, onReturnToSetup: returnToSetup });

  const finish = useCallback(() => {
    if (!active.current) return;
    active.current = false;
    const completed: Session<P,R> = {
      id: createLocalId(), completedAt: new Date().toISOString(), mode, level,
      durationSeconds: (Math.min(performance.now(), deadline.current) - started.current) / 1000,
      answers: [...answersRef.current],
    };
    const updated = [completed, ...history].slice(0,100);
    try { localStorage.setItem(`psy${config.basePath}-sessions`, JSON.stringify(updated)); setStorageError(false); }
    catch { setStorageError(true); }
    setHistory(updated); setSession(completed); setView("result"); completeTestRoute();
  }, [config.basePath, mode, level, history, completeTestRoute]);

  useEffect(() => {
    if (view !== "test" || mode !== "timed") return;
    const timer = window.setInterval(() => {
      const timeLeft = Math.max(0, deadline.current - performance.now());
      setRemaining(Math.ceil(timeLeft / 1000));
      if (timeLeft === 0) finish();
    }, 200);
    return () => window.clearInterval(timer);
  }, [view, mode, finish]);

  const makeQuestion = (completed: Trial<P,R>[]) => {
    const recent = completed.slice(-5);
    const nextAdvanced = level === "hard" || (level === "adaptive" && recent.filter(answer => answer.correct).length >= 4);
    setAdvanced(nextAdvanced);
    setPuzzle(config.createProgressivePuzzle ? config.createProgressivePuzzle({ completed: completed.length, level }) : config.createPuzzle(nextAdvanced));
  };
  const start = () => {
    makeQuestion([]);
    const now = performance.now();
    started.current = now; questionStarted.current = now;
    deadline.current = mode === "timed" ? now + minutes * 60_000 : Infinity;
    answersRef.current = []; active.current = true;
    setAnswers([]); setSession(null); setRemaining(minutes * 60); setView("test"); beginTestRoute();
  };
  const submit = (response: R) => {
    if (!active.current || puzzle === null || !config.isResponse(puzzle, response)) return;
    const now = performance.now();
    if (now >= deadline.current) { finish(); return; }
    const completed = [...answersRef.current, { puzzle, response, seconds: (now - questionStarted.current) / 1000, correct: config.isCorrect(puzzle, response) }];
    answersRef.current = completed; setAnswers(completed);
    if (mode === "rounds" && completed.length >= roundCount) { finish(); return; }
    makeQuestion(completed); questionStarted.current = performance.now();
  };
  const review = (trials: Trial<P,R>[]) => <div className="mt-6 grid items-start gap-4 lg:grid-cols-2">
    {trials.map((trial, index) => <details key={index} className="min-w-0 rounded-2xl border border-white/10 bg-white/5 p-5">
      <summary className="cursor-pointer font-semibold">Question {index + 1} · {trial.correct ? "Correct" : "Incorrect"} · {trial.seconds.toFixed(1)} s{config.reviewSummary && ` · ${config.reviewSummary(trial.puzzle, trial.response)}`}</summary>
      <div className="mt-5">{config.renderReview(trial.puzzle, trial.response)}</div>
    </details>)}
  </div>;

  if (view === "test" && puzzle !== null) return <main className="min-h-dvh bg-slate-950 px-4 py-6 text-white">
    <div className="mx-auto max-w-4xl">
      <header className="mb-6 flex items-start justify-between gap-4">
        <div><p className="font-mono text-sm text-emerald-300">Question {answers.length + 1}{mode === "rounds" ? ` of ${roundCount}` : ""} · {config.difficultyName?.(puzzle) ?? (advanced ? "Hard" : "Easy")}</p><h1 className="mt-2 text-2xl font-bold">{config.title}</h1></div>
        {mode === "timed" && <p role="timer" aria-label="Time remaining" className="font-mono text-2xl">{Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2,"0")}</p>}
      </header>
      <Question key={answers.length} puzzle={puzzle} submit={submit} />
      <footer className="mt-8 flex justify-between gap-3"><button type="button" className={practiceSecondary} onClick={returnToSetupRoute}>Cancel session</button><button type="button" className={practiceSecondary} onClick={finish}>Finish session</button></footer>
    </div>
  </main>;

  return <TestPageShell accent="emerald">
    {view === "setup" ? <TestSetupLayout accent="emerald" eyebrow={config.title} title={config.headline} description={config.description}
      actions={<><button type="button" className={practicePrimary} onClick={start}>Start test</button>{config.demo}</>}>
      <div className="space-y-4">
        <TestPanel title="Test settings">
          <label className="block text-sm font-semibold">Practice mode<select className={field} value={mode} onChange={event => setMode(event.target.value as Mode)}><option value="timed">Timed · unlimited questions</option><option value="rounds">Randomized questions · untimed</option></select></label>
          <label className="mt-5 block text-sm font-semibold">Difficulty<select className={field} value={level} onChange={event => setLevel(event.target.value as Level)}><option value="adaptive">Adaptive</option><option value="easy">{config.difficultyLabels[0]}</option><option value="hard">{config.difficultyLabels[1]}</option></select></label>
          <p className="mt-2 text-xs leading-5 text-slate-500">{config.adaptiveDescription ?? "Adaptive practice starts easy and increases difficulty after four correct answers in the last five."}</p>
          {mode === "timed" ? <label className="mt-5 block text-sm font-semibold">Test length (minutes)<ValidatedNumberInput value={minutes} min={1} max={30} normalize={Math.round} onValueChange={setMinutes} className={field} /></label> : <label className="mt-5 block text-sm font-semibold">Number of questions<ValidatedNumberInput value={roundCount} min={1} max={100} normalize={Math.round} onValueChange={setRoundCount} className={field} /></label>}
        </TestPanel>
        <TestPanel title="Instructions"><InstructionList accent="emerald" items={config.instructions} /></TestPanel>
      </div>
    </TestSetupLayout> : session && <section className="py-10">
      <p className="font-mono text-sm uppercase tracking-widest text-emerald-300">Session complete</p><h1 className="mt-4 text-4xl font-black">{config.title} results</h1>
      <ResultSummary session={session} /><button type="button" className={`${practicePrimary} mt-6`} onClick={returnToSetupRoute}>Change settings</button>{review(session.answers)}
    </section>}
    <section className="border-t border-white/10 py-10">
      <h2 className="text-2xl font-bold">{config.title} history</h2><p className="mt-2 text-sm text-slate-500">Saved on this device · up to 100 sessions</p>
      {storageError && <p role="status" className="mt-3 text-amber-300">Browser storage is unavailable. This result is available until you leave the page.</p>}
      {history.length === 0 ? <p className="mt-6 text-slate-400">Complete a session to see your results here.</p> : history.map(saved => <details key={saved.id} className="mt-4 rounded-2xl border border-white/10 p-5"><summary className="cursor-pointer">{new Date(saved.completedAt).toLocaleString()} · {saved.mode} · {saved.level}</summary><ResultSummary session={saved} />{review(saved.answers)}</details>)}
    </section>
  </TestPageShell>;
}
