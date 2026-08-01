import { useCallback, useEffect, useRef, useState } from "react";
import {
  columnKeyCodes,
  columnKeyLabels,
  DistributiveAttentionBoard,
  rowKeyCodes,
  rowKeyLabels,
} from "../components/DistributiveAttentionBoard";
import type {
  DistributiveAxis,
  DistributiveMode,
  GridCoordinate,
} from "../components/DistributiveAttentionBoard";
import { DistributiveAttentionDemo } from "../components/TestDemos";
import { ValidatedNumberInput } from "../components/ValidatedNumberInput";
import {
  InstructionList,
  TestPageShell,
  TestPanel,
  TestSetupLayout,
} from "../components/TestPage";
import { useTestRoute } from "../hooks/useTestRoute";
import { createLocalId } from "../lib/create-local-id";

const STORAGE_KEY = "psy-distributive-attention-sessions";
const DEFAULT_TRIAL_COUNT = 32;
const MIN_TRIAL_COUNT = 8;
const MAX_TRIAL_COUNT = 128;
const FEEDBACK_DURATION_MS = 350;

type Phase = "setup" | "running" | "complete";
type SessionMode = DistributiveMode | "mixed";
type AttentionStimulus = GridCoordinate & { mode: DistributiveMode };

type AttentionTrial = AttentionStimulus & {
  responseRow: number;
  responseColumn: number;
  correct: boolean;
  reactionTime: number;
};

type AttentionSession = {
  id: string;
  completedAt: string;
  settings: {
    mode: SessionMode;
    trialCount: number;
  };
  trials: AttentionTrial[];
  accuracy: number;
  averageReactionTime: number;
};

function shuffle<T>(values: T[]) {
  const shuffled = [...values];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[randomIndex]] = [
      shuffled[randomIndex],
      shuffled[index],
    ];
  }
  return shuffled;
}

function createSequence(trialCount: number, mode: SessionMode) {
  const allCoordinates = Array.from({ length: 64 }, (_, index) => ({
    row: Math.floor(index / 8),
    column: index % 8,
  }));
  const coordinates: GridCoordinate[] = [];

  while (coordinates.length < trialCount) {
    coordinates.push(...shuffle(allCoordinates));
  }

  const trialModes: DistributiveMode[] =
    mode === "mixed"
      ? shuffle(
          Array.from({ length: trialCount }, (_, index) =>
            index < Math.ceil(trialCount / 2)
              ? ("one-handed" as const)
              : ("two-handed" as const),
          ),
        )
      : Array.from({ length: trialCount }, () => mode);

  return coordinates.slice(0, trialCount).map((coordinate, index) => ({
    ...coordinate,
    mode: trialModes[index],
  }));
}

function summarizeTrials(trials: AttentionTrial[]) {
  const correct = trials.filter((trial) => trial.correct).length;
  return {
    accuracy: Math.round((correct / trials.length) * 1_000) / 10,
    averageReactionTime: Math.round(
      trials.reduce((total, trial) => total + trial.reactionTime, 0) /
        trials.length,
    ),
  };
}

function summarizeModeTrials(
  trials: AttentionTrial[],
  trialMode: DistributiveMode,
) {
  const matchingTrials = trials.filter((trial) => trial.mode === trialMode);
  return matchingTrials.length > 0 ? summarizeTrials(matchingTrials) : null;
}

function modeLabel(mode: SessionMode) {
  if (mode === "one-handed") return "One-handed";
  if (mode === "two-handed") return "Two-handed";
  return "Mixed";
}

function isStoredSession(value: unknown): value is AttentionSession {
  if (!value || typeof value !== "object") return false;
  const session = value as Partial<AttentionSession>;
  return (
    typeof session.id === "string" &&
    typeof session.completedAt === "string" &&
    typeof session.accuracy === "number" &&
    typeof session.averageReactionTime === "number" &&
    Array.isArray(session.trials) &&
    session.trials.length > 0 &&
    !!session.settings &&
    (session.settings.mode === "one-handed" ||
      session.settings.mode === "two-handed" ||
      session.settings.mode === "mixed") &&
    typeof session.settings.trialCount === "number"
  );
}

function AttentionHistory({ sessions }: { sessions: AttentionSession[] }) {
  if (sessions.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-white/15 px-6 py-10 text-center">
        <p className="font-medium text-slate-300">
          Your completed distributive-attention sessions will appear here.
        </p>
        <p className="mt-2 text-sm text-slate-500">
          Results and mode settings are saved only in this browser.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {sessions.map((session, sessionIndex) => (
        <details
          key={session.id}
          open={sessionIndex === 0}
          className="group overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] open:bg-white/[0.06]"
        >
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 marker:hidden">
            <div>
              <p className="font-semibold text-white">
                {new Intl.DateTimeFormat(undefined, {
                  dateStyle: "medium",
                  timeStyle: "short",
                }).format(new Date(session.completedAt))}
              </p>
              <p className="mt-1 text-sm text-slate-400">
                {modeLabel(session.settings.mode)} ·{" "}
                {session.settings.trialCount} trials
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="font-mono text-xl font-semibold text-rose-300">
                  {session.accuracy}%
                </p>
                <p className="text-xs uppercase tracking-wider text-slate-500">
                  Accuracy
                </p>
              </div>
              <span
                aria-hidden="true"
                className="text-xl text-slate-500 transition-transform group-open:rotate-45"
              >
                +
              </span>
            </div>
          </summary>
          <div className="grid gap-3 border-t border-white/10 px-5 py-4 sm:grid-cols-3">
            {[
              [
                "Correct",
                String(session.trials.filter((trial) => trial.correct).length),
              ],
              [
                "Incorrect",
                String(session.trials.filter((trial) => !trial.correct).length),
              ],
              ["Average response", `${session.averageReactionTime} ms`],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl bg-slate-950/60 p-4">
                <p className="text-xs uppercase tracking-wider text-slate-500">
                  {label}
                </p>
                <p className="mt-2 font-mono text-lg font-bold text-white">
                  {value}
                </p>
              </div>
            ))}
          </div>
        </details>
      ))}
    </div>
  );
}

export default function DistributiveAttentionPage() {
  const [phase, setPhase] = useState<Phase>("setup");
  const [mode, setMode] = useState<SessionMode>("one-handed");
  const [trialCount, setTrialCount] = useState(DEFAULT_TRIAL_COUNT);
  const [sequence, setSequence] = useState<AttentionStimulus[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [trials, setTrials] = useState<AttentionTrial[]>([]);
  const [pressedRow, setPressedRow] = useState<number | null>(null);
  const [pressedColumn, setPressedColumn] = useState<number | null>(null);
  const [response, setResponse] = useState<
    (GridCoordinate & { correct: boolean }) | null
  >(null);
  const [lastSession, setLastSession] = useState<AttentionSession | null>(null);
  const [history, setHistory] = useState<AttentionSession[]>([]);
  const shownAtRef = useRef(0);
  const inputLockedRef = useRef(false);
  const pressedRowRef = useRef<number | null>(null);
  const pressedColumnRef = useRef<number | null>(null);
  const rowPointersRef = useRef(new Map<number, number>());
  const columnPointersRef = useRef(new Map<number, number>());
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentTarget = sequence[currentIndex] ?? null;
  const activeMode: DistributiveMode =
    currentTarget?.mode ?? (mode === "two-handed" ? "two-handed" : "one-handed");

  const clearPressedInputs = useCallback(() => {
    pressedRowRef.current = null;
    pressedColumnRef.current = null;
    rowPointersRef.current.clear();
    columnPointersRef.current.clear();
    setPressedRow(null);
    setPressedColumn(null);
  }, []);

  const returnToSetup = useCallback(() => {
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    inputLockedRef.current = true;
    clearPressedInputs();
    setSequence([]);
    setCurrentIndex(0);
    setTrials([]);
    setResponse(null);
    setLastSession(null);
    setPhase("setup");
  }, [clearPressedInputs]);

  const { beginTestRoute, completeTestRoute, returnToSetupRoute } =
    useTestRoute({
      basePath: "/distributive-attention",
      view:
        phase === "setup" ? "setup" : phase === "complete" ? "result" : "test",
      onReturnToSetup: returnToSetup,
    });

  useEffect(() => {
    const hydrationTimer = window.setTimeout(() => {
      try {
        const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
        if (Array.isArray(stored)) setHistory(stored.filter(isStoredSession));
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }, 0);

    return () => window.clearTimeout(hydrationTimer);
  }, []);

  useEffect(
    () => () => {
      if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    },
    [],
  );

  useEffect(() => {
    if (phase !== "running") return;
    shownAtRef.current = performance.now();
    inputLockedRef.current = false;
  }, [currentIndex, phase]);

  const startSession = useCallback(() => {
    beginTestRoute(phase === "complete");
    clearPressedInputs();
    setSequence(createSequence(trialCount, mode));
    setCurrentIndex(0);
    setTrials([]);
    setResponse(null);
    setLastSession(null);
    inputLockedRef.current = false;
    shownAtRef.current = performance.now();
    setPhase("running");
  }, [beginTestRoute, clearPressedInputs, mode, phase, trialCount]);

  const finishSession = useCallback(
    (completedTrials: AttentionTrial[]) => {
      const summary = summarizeTrials(completedTrials);
      const session: AttentionSession = {
        id: createLocalId(),
        completedAt: new Date().toISOString(),
        settings: { mode, trialCount },
        trials: completedTrials,
        ...summary,
      };

      setLastSession(session);
      setHistory((currentHistory) => {
        const updatedHistory = [session, ...currentHistory].slice(0, 100);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedHistory));
        return updatedHistory;
      });
      clearPressedInputs();
      setPhase("complete");
      completeTestRoute();
    },
    [clearPressedInputs, completeTestRoute, mode, trialCount],
  );

  const respond = useCallback(
    (responseRow: number, responseColumn: number) => {
      if (phase !== "running" || inputLockedRef.current) return;
      const target = sequence[currentIndex];
      if (!target) return;

      inputLockedRef.current = true;
      const correct =
        responseRow === target.row && responseColumn === target.column;
      const result: AttentionTrial = {
        ...target,
        responseRow,
        responseColumn,
        correct,
        reactionTime: Math.max(
          1,
          Math.round(performance.now() - shownAtRef.current),
        ),
      };
      const completedTrials = [...trials, result];
      setTrials(completedTrials);
      setResponse({ row: responseRow, column: responseColumn, correct });

      feedbackTimerRef.current = setTimeout(() => {
        clearPressedInputs();
        setResponse(null);
        if (currentIndex + 1 >= sequence.length) {
          finishSession(completedTrials);
        } else {
          setCurrentIndex((current) => current + 1);
        }
      }, FEEDBACK_DURATION_MS);
    },
    [clearPressedInputs, currentIndex, finishSession, phase, sequence, trials],
  );

  const tryTwoHandedResponse = useCallback(
    (row: number | null, column: number | null) => {
      if (activeMode === "two-handed" && row !== null && column !== null) {
        respond(row, column);
      }
    },
    [activeMode, respond],
  );

  const pressAxis = useCallback(
    (axis: DistributiveAxis, index: number) => {
      if (phase !== "running" || activeMode !== "two-handed") return;
      if (axis === "row") {
        pressedRowRef.current = index;
        setPressedRow(index);
        tryTwoHandedResponse(index, pressedColumnRef.current);
      } else {
        pressedColumnRef.current = index;
        setPressedColumn(index);
        tryTwoHandedResponse(pressedRowRef.current, index);
      }
    },
    [activeMode, phase, tryTwoHandedResponse],
  );

  const releaseAxis = useCallback((axis: DistributiveAxis, index: number) => {
    if (axis === "row" && pressedRowRef.current === index) {
      pressedRowRef.current = null;
      setPressedRow(null);
    }
    if (axis === "column" && pressedColumnRef.current === index) {
      pressedColumnRef.current = null;
      setPressedColumn(null);
    }
  }, []);

  const handleAxisPointerDown = useCallback(
    (axis: DistributiveAxis, index: number, pointerId: number) => {
      const pointerMap =
        axis === "row" ? rowPointersRef.current : columnPointersRef.current;
      pointerMap.set(pointerId, index);
      pressAxis(axis, index);
    },
    [pressAxis],
  );

  const handleAxisPointerUp = useCallback(
    (axis: DistributiveAxis, pointerId: number) => {
      const pointerMap =
        axis === "row" ? rowPointersRef.current : columnPointersRef.current;
      const index = pointerMap.get(pointerId);
      pointerMap.delete(pointerId);
      if (index !== undefined) releaseAxis(axis, index);
    },
    [releaseAxis],
  );

  useEffect(() => {
    if (phase !== "running" || activeMode !== "two-handed") return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.repeat) return;
      const row = rowKeyCodes.indexOf(
        event.code as (typeof rowKeyCodes)[number],
      );
      const column = columnKeyCodes.indexOf(
        event.code as (typeof columnKeyCodes)[number],
      );
      if (row >= 0) {
        event.preventDefault();
        pressAxis("row", row);
      } else if (column >= 0) {
        event.preventDefault();
        pressAxis("column", column);
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      const row = rowKeyCodes.indexOf(
        event.code as (typeof rowKeyCodes)[number],
      );
      const column = columnKeyCodes.indexOf(
        event.code as (typeof columnKeyCodes)[number],
      );
      if (row >= 0) releaseAxis("row", row);
      if (column >= 0) releaseAxis("column", column);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [activeMode, phase, pressAxis, releaseAxis]);

  if (phase === "running") {
    return (
      <main className="flex h-dvh flex-col overflow-hidden bg-slate-950 px-2 py-2 text-white sm:px-6 sm:py-4">
        <header className="flex shrink-0 items-center justify-between gap-4">
          <div>
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-rose-300 sm:text-sm">
              {mode === "mixed" ? "Mixed · " : ""}
              {modeLabel(activeMode)} · Trial {currentIndex + 1} of{" "}
              {sequence.length}
            </p>
            <p className="mt-1 text-[11px] text-slate-400 sm:text-xs">
              {activeMode === "one-handed"
                ? "Find the row and column intersection"
                : "Press the matching row and column together"}
            </p>
          </div>
          <div className="text-right">
            <p className="font-mono text-xl font-black text-white">
              {trials.filter((trial) => trial.correct).length}/{trials.length}
            </p>
            <p className="text-[9px] uppercase tracking-wider text-slate-500">
              Correct
            </p>
          </div>
        </header>

        <section className="flex min-h-0 flex-1 items-center justify-center py-2">
          <DistributiveAttentionBoard
            mode={activeMode}
            target={currentTarget}
            pressedRow={pressedRow}
            pressedColumn={pressedColumn}
            response={response}
            disabled={response !== null}
            onLargeCellPress={respond}
            onAxisPointerDown={handleAxisPointerDown}
            onAxisPointerUp={handleAxisPointerUp}
          />
        </section>

        <footer className="shrink-0 pb-[max(0rem,env(safe-area-inset-bottom))] text-center text-[10px] leading-4 text-slate-500 sm:text-xs">
          {activeMode === "one-handed"
            ? "Desktop: click the intersection with your mouse or trackpad."
            : `Desktop chord — rows: ${rowKeyLabels.join(" ")} · columns: ${columnKeyLabels.join(" ")}`}
        </footer>
      </main>
    );
  }

  const summary = lastSession ? summarizeTrials(lastSession.trials) : null;
  const oneHandedSummary = lastSession
    ? summarizeModeTrials(lastSession.trials, "one-handed")
    : null;
  const twoHandedSummary = lastSession
    ? summarizeModeTrials(lastSession.trials, "two-handed")
    : null;

  return (
    <TestPageShell accent="rose">
      {phase === "setup" ? (
        <TestSetupLayout
          accent="rose"
          eyebrow="Distributive attention"
          title="Track both axes at once."
          description={
            <p>
              Locate an intersection from two signals, or reverse the task and
              coordinate two simultaneous responses to one illuminated cell.
            </p>
          }
          actions={
            <>
              <button
                type="button"
                onClick={startSession}
                className="min-h-14 rounded-full bg-rose-300 px-8 font-bold text-slate-950 transition hover:bg-rose-200 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-rose-300"
              >
                Start test
              </button>
              <DistributiveAttentionDemo />
            </>
          }
        >
          <div className="space-y-4">
            <TestPanel
              title="Test settings"
              description="Choose the response direction and session length."
            >
              <div className="space-y-6">
                <fieldset>
                  <legend className="text-sm font-semibold text-slate-300">
                    Mode
                  </legend>
                  <div className="mt-3 grid grid-cols-3 gap-2 rounded-2xl bg-slate-950 p-1.5">
                    {(["one-handed", "two-handed", "mixed"] as const).map((option) => (
                      <button
                        key={option}
                        type="button"
                        aria-pressed={mode === option}
                        onClick={() => setMode(option)}
                        className={`min-h-12 rounded-xl px-4 text-sm font-bold transition focus-visible:outline-2 focus-visible:outline-rose-300 ${
                          mode === option
                            ? "bg-rose-300 text-slate-950"
                            : "text-slate-400 hover:bg-white/5 hover:text-white"
                        }`}
                      >
                        {modeLabel(option)}
                      </button>
                    ))}
                  </div>
                </fieldset>

                <label className="block">
                  <span className="flex items-center justify-between text-sm font-semibold text-slate-300">
                    Number of trials
                    <span className="font-mono text-rose-300">
                      {trialCount}
                    </span>
                  </span>
                  <ValidatedNumberInput
                    min={MIN_TRIAL_COUNT}
                    max={MAX_TRIAL_COUNT}
                    value={trialCount}
                    normalize={Math.round}
                    onValueChange={setTrialCount}
                    className="mt-3 min-h-12 w-full rounded-xl border border-white/10 bg-slate-950 px-4 font-mono text-white outline-none focus:border-rose-300"
                  />
                  <span className="mt-2 block text-xs text-slate-500">
                    Default: {DEFAULT_TRIAL_COUNT}
                  </span>
                </label>
              </div>
            </TestPanel>

            <TestPanel title="Instructions">
              <InstructionList
                accent="rose"
                items={[
                  {
                    title: "One-handed",
                    description:
                      "Two edge LEDs identify a row and column. Tap or click their intersection.",
                  },
                  {
                    title: "Two-handed touch",
                    description:
                      "A main-grid LED identifies a cell. Hold its row and column circles simultaneously.",
                  },
                  {
                    title: "Two-handed desktop",
                    description:
                      "Hold one left-hand row key and one right-hand column key as a chord.",
                  },
                  {
                    title: "Mixed mode",
                    description:
                      "One- and two-handed trials appear in a balanced random order. Follow the LEDs on every trial.",
                  },
                  {
                    title: "Respond once",
                    description:
                      "Your first coordinate is scored, then the next random target appears.",
                  },
                ]}
              />
              <div className="mt-4 rounded-2xl border border-rose-300/15 bg-rose-300/5 p-4 text-xs leading-6 text-slate-400">
                <p>
                  <span className="font-semibold text-slate-200">
                    Left-hand rows:
                  </span>{" "}
                  {rowKeyLabels.join(" · ")}
                </p>
                <p>
                  <span className="font-semibold text-slate-200">
                    Right-hand columns:
                  </span>{" "}
                  {columnKeyLabels.join(" · ")}
                </p>
              </div>
            </TestPanel>
          </div>
        </TestSetupLayout>
      ) : (
        <section className="py-8 sm:py-14">
          <div className="flex flex-col justify-between gap-8 sm:flex-row sm:items-end">
            <div>
              <p className="font-mono text-sm font-semibold uppercase tracking-[0.3em] text-rose-300">
                Session complete
              </p>
              <h1 className="mt-4 text-4xl font-black tracking-tight sm:text-6xl">
                Attention results
              </h1>
            </div>
            <div className="flex flex-wrap gap-3 self-start sm:self-auto">
              <button
                type="button"
                onClick={returnToSetupRoute}
                className="min-h-12 rounded-full border border-white/15 px-6 font-bold text-white transition hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-rose-300"
              >
                Change settings
              </button>
              <button
                type="button"
                onClick={startSession}
                className="min-h-12 rounded-full bg-rose-300 px-6 font-bold text-slate-950 transition hover:bg-rose-200 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-rose-300"
              >
                Repeat test
              </button>
            </div>
          </div>

          {lastSession && summary && (
            <>
              <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  ["Accuracy", `${summary.accuracy}%`, "text-rose-300"],
                  [
                    "Average response",
                    `${summary.averageReactionTime} ms`,
                    "text-cyan-300",
                  ],
                  [
                    "Correct",
                    String(
                      lastSession.trials.filter((trial) => trial.correct).length,
                    ),
                    "text-emerald-300",
                  ],
                  [
                    "Incorrect",
                    String(
                      lastSession.trials.filter((trial) => !trial.correct).length,
                    ),
                    "text-amber-300",
                  ],
                ].map(([label, value, color]) => (
                  <div
                    key={label}
                    className="rounded-3xl border border-white/10 bg-white/[0.05] p-6"
                  >
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      {label}
                    </p>
                    <p className={`mt-3 font-mono text-3xl font-black ${color}`}>
                      {value}
                    </p>
                  </div>
                ))}
              </div>

              {lastSession.settings.mode === "mixed" &&
                oneHandedSummary &&
                twoHandedSummary && (
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <div className="rounded-3xl border border-rose-300/15 bg-rose-300/5 p-6">
                      <p className="font-semibold text-white">
                        One-handed trials
                      </p>
                      <p className="mt-3 font-mono text-2xl font-black text-rose-300">
                        {oneHandedSummary.accuracy}%
                      </p>
                      <p className="mt-1 text-sm text-slate-400">
                        {oneHandedSummary.averageReactionTime} ms average
                      </p>
                    </div>
                    <div className="rounded-3xl border border-rose-300/15 bg-rose-300/5 p-6">
                      <p className="font-semibold text-white">
                        Two-handed trials
                      </p>
                      <p className="mt-3 font-mono text-2xl font-black text-rose-300">
                        {twoHandedSummary.accuracy}%
                      </p>
                      <p className="mt-1 text-sm text-slate-400">
                        {twoHandedSummary.averageReactionTime} ms average
                      </p>
                    </div>
                  </div>
                )}
            </>
          )}
        </section>
      )}

      <section className="border-t border-white/10 py-12 sm:py-16">
        <div className="mb-7 flex items-end justify-between gap-6">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
              Saved on this device
            </p>
            <h2 className="mt-2 text-2xl font-bold">
              Distributive-attention history
            </h2>
          </div>
          {history.length > 0 && (
            <p className="font-mono text-sm text-slate-500">
              {history.length} {history.length === 1 ? "session" : "sessions"}
            </p>
          )}
        </div>
        <AttentionHistory sessions={history} />
        <p className="mt-8 max-w-2xl text-sm leading-6 text-slate-600">
          This is a practice tool, not a clinical assessment. Input method,
          keyboard rollover, and display size can affect results.
        </p>
      </section>
    </TestPageShell>
  );
}
