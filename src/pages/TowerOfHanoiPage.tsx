import { useCallback, useEffect, useRef, useState } from "react";
import { HanoiBoard, createHanoiPegs } from "../components/HanoiBoard";
import { HanoiSpeedGraph } from "../components/HanoiSpeedGraph";
import { TowerOfHanoiDemo } from "../components/TestDemos";
import { ValidatedNumberInput } from "../components/ValidatedNumberInput";
import {
  InstructionList,
  TestPageShell,
  TestPanel,
  TestSetupLayout,
} from "../components/TestPage";
import { useTestRoute } from "../hooks/useTestRoute";
import { createLocalId } from "../lib/create-local-id";

const STORAGE_KEY = "psy-tower-of-hanoi-sessions";
const DEFAULT_HEIGHT = 7;
const MIN_HEIGHT = 3;
const MAX_HEIGHT = 10;

type Phase = "setup" | "running" | "complete";

type HanoiMove = {
  disk: number;
  from: number;
  to: number;
  elapsedMs: number;
};

type HanoiSession = {
  id: string;
  completedAt: string;
  settings: { height: number };
  moves: HanoiMove[];
  durationMs: number;
  optimalMoves: number;
  efficiency: number;
  averageSpeed: number;
};

function formatDuration(durationMs: number) {
  const totalSeconds = Math.round(durationMs / 1_000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes > 0
    ? `${minutes}:${String(seconds).padStart(2, "0")}`
    : `${seconds}s`;
}

function isStoredSession(value: unknown): value is HanoiSession {
  if (!value || typeof value !== "object") return false;
  const session = value as Partial<HanoiSession>;
  return (
    typeof session.id === "string" &&
    typeof session.completedAt === "string" &&
    typeof session.durationMs === "number" &&
    typeof session.optimalMoves === "number" &&
    typeof session.efficiency === "number" &&
    typeof session.averageSpeed === "number" &&
    Array.isArray(session.moves) &&
    session.moves.length > 0 &&
    !!session.settings &&
    typeof session.settings.height === "number"
  );
}

function HanoiHistory({ sessions }: { sessions: HanoiSession[] }) {
  if (sessions.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-white/15 px-6 py-10 text-center">
        <p className="font-medium text-slate-300">
          Your completed Hanoi sessions will appear here.
        </p>
        <p className="mt-2 text-sm text-slate-500">
          Moves, speed, and settings are saved only in this browser.
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
                Height {session.settings.height} · {session.moves.length} moves
                · {formatDuration(session.durationMs)}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="font-mono text-xl font-semibold text-cyan-300">
                  {session.efficiency}%
                </p>
                <p className="text-xs uppercase tracking-wider text-slate-500">
                  Efficiency
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
          <div className="space-y-4 border-t border-white/10 px-5 py-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                ["Steps", String(session.moves.length)],
                ["Optimal", String(session.optimalMoves)],
                ["Duration", formatDuration(session.durationMs)],
                ["Average speed", `${session.averageSpeed} moves/min`],
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
            <HanoiSpeedGraph moves={session.moves} compact />
          </div>
        </details>
      ))}
    </div>
  );
}

export default function TowerOfHanoiPage() {
  const [phase, setPhase] = useState<Phase>("setup");
  const [height, setHeight] = useState(DEFAULT_HEIGHT);
  const [pegs, setPegs] = useState<number[][]>(() =>
    createHanoiPegs(DEFAULT_HEIGHT),
  );
  const [selectedPeg, setSelectedPeg] = useState<number | null>(null);
  const [invalidPeg, setInvalidPeg] = useState<number | null>(null);
  const [moves, setMoves] = useState<HanoiMove[]>([]);
  const [lastSession, setLastSession] = useState<HanoiSession | null>(null);
  const [history, setHistory] = useState<HanoiSession[]>([]);
  const startedAtRef = useRef(0);
  const invalidTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const returnToSetup = useCallback(() => {
    if (invalidTimerRef.current) clearTimeout(invalidTimerRef.current);
    setPegs(createHanoiPegs(height));
    setSelectedPeg(null);
    setInvalidPeg(null);
    setMoves([]);
    setLastSession(null);
    setPhase("setup");
  }, [height]);

  const { beginTestRoute, completeTestRoute, returnToSetupRoute } =
    useTestRoute({
      basePath: "/tower-of-hanoi",
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
      if (invalidTimerRef.current) clearTimeout(invalidTimerRef.current);
    },
    [],
  );

  const startSession = useCallback(() => {
    beginTestRoute(phase === "complete");
    setPegs(createHanoiPegs(height));
    setSelectedPeg(null);
    setInvalidPeg(null);
    setMoves([]);
    setLastSession(null);
    startedAtRef.current = performance.now();
    setPhase("running");
  }, [beginTestRoute, height, phase]);

  const showInvalidMove = useCallback((pegIndex: number) => {
    if (invalidTimerRef.current) clearTimeout(invalidTimerRef.current);
    setInvalidPeg(pegIndex);
    invalidTimerRef.current = setTimeout(() => setInvalidPeg(null), 650);
  }, []);

  const moveDisk = useCallback(
    (sourcePeg: number, destinationPeg: number) => {
      if (phase !== "running") return;
      const source = pegs[sourcePeg];
      const destination = pegs[destinationPeg];
      const disk = source?.at(-1);

      if (disk === undefined || sourcePeg === destinationPeg) {
        setSelectedPeg(null);
        return;
      }

      const destinationTop = destination?.at(-1);
      if (destinationTop !== undefined && destinationTop < disk) {
        showInvalidMove(destinationPeg);
        setSelectedPeg(null);
        return;
      }

      const nextPegs = pegs.map((peg) => [...peg]);
      nextPegs[sourcePeg].pop();
      nextPegs[destinationPeg].push(disk);
      const elapsedMs = Math.max(
        1,
        Math.round(performance.now() - startedAtRef.current),
      );
      const nextMoves = [
        ...moves,
        { disk, from: sourcePeg, to: destinationPeg, elapsedMs },
      ];

      setPegs(nextPegs);
      setMoves(nextMoves);
      setSelectedPeg(null);

      if (nextPegs[2].length !== height) return;

      const optimalMoves = 2 ** height - 1;
      const session: HanoiSession = {
        id: createLocalId(),
        completedAt: new Date().toISOString(),
        settings: { height },
        moves: nextMoves,
        durationMs: elapsedMs,
        optimalMoves,
        efficiency: Math.round((optimalMoves / nextMoves.length) * 1_000) / 10,
        averageSpeed:
          Math.round(((nextMoves.length * 60_000) / elapsedMs) * 10) / 10,
      };

      setLastSession(session);
      setHistory((currentHistory) => {
        const updatedHistory = [session, ...currentHistory].slice(0, 50);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedHistory));
        return updatedHistory;
      });
      setPhase("complete");
      completeTestRoute();
    },
    [completeTestRoute, height, moves, pegs, phase, showInvalidMove],
  );

  const selectSource = useCallback(
    (pegIndex: number) => {
      if (phase !== "running" || pegs[pegIndex].length === 0) return;
      setSelectedPeg((current) => (current === pegIndex ? null : pegIndex));
    },
    [pegs, phase],
  );

  const selectDestination = useCallback(
    (pegIndex: number) => {
      if (selectedPeg === null) return;
      moveDisk(selectedPeg, pegIndex);
    },
    [moveDisk, selectedPeg],
  );

  if (phase === "running") {
    return (
      <main className="flex h-dvh flex-col overflow-hidden bg-slate-950 px-3 py-3 text-white sm:px-8 sm:py-5">
        <header className="flex shrink-0 items-center justify-between gap-5">
          <div>
            <p className="font-mono text-sm font-semibold uppercase tracking-[0.2em] text-cyan-300">
              Tower of Hanoi · Height {height}
            </p>
            <p
              aria-live="polite"
              className="mt-1 text-xs text-slate-400 sm:text-sm"
            >
              {selectedPeg === null
                ? "Drag a top disk, or tap one to select it"
                : `Source selected: ${["left", "middle", "right"][selectedPeg]} peg — choose a destination`}
            </p>
          </div>
          <div className="text-right">
            <p className="font-mono text-2xl font-black text-white">
              {moves.length}
            </p>
            <p className="text-[10px] uppercase tracking-wider text-slate-500">
              Steps · optimal {2 ** height - 1}
            </p>
          </div>
        </header>

        <section className="flex min-h-0 flex-1 items-center justify-center py-3 sm:py-5">
          <HanoiBoard
            pegs={pegs}
            diskCount={height}
            selectedPeg={selectedPeg}
            invalidPeg={invalidPeg}
            onSelectSource={selectSource}
            onDestination={selectDestination}
            onMove={moveDisk}
          />
        </section>

        <footer className="shrink-0 pb-[max(0rem,env(safe-area-inset-bottom))] text-center text-xs leading-5 text-slate-500">
          Move the entire tower to the right peg. A larger disk may never rest
          on a smaller disk.
        </footer>
      </main>
    );
  }

  return (
    <TestPageShell accent="cyan">
      {phase === "setup" ? (
        <TestSetupLayout
          accent="cyan"
          eyebrow="Tower of Hanoi"
          title="Plan ahead. Move with purpose."
          description={
            <p>
              Transfer the full tower from the left peg to the right while
              obeying the size rule. The test records every move and your pace.
            </p>
          }
          actions={
            <>
              <button
                type="button"
                onClick={startSession}
                className="min-h-14 rounded-full bg-cyan-300 px-8 font-bold text-slate-950 transition hover:bg-cyan-200 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-300"
              >
                Start test
              </button>
              <TowerOfHanoiDemo />
            </>
          }
        >
          <div className="space-y-4">
            <TestPanel
              title="Test settings"
              description="Choose how many disks the tower contains."
            >
              <label className="block max-w-md">
                <span className="flex items-center justify-between text-sm font-semibold text-slate-300">
                  Tower height
                  <span className="font-mono text-cyan-300">{height}</span>
                </span>
                <ValidatedNumberInput
                  min={MIN_HEIGHT}
                  max={MAX_HEIGHT}
                  value={height}
                  normalize={Math.round}
                  onValueChange={setHeight}
                  className="mt-3 min-h-12 w-full rounded-xl border border-white/10 bg-slate-950 px-4 font-mono text-white outline-none focus:border-cyan-300"
                />
                <span className="mt-2 block text-xs text-slate-500">
                  Default: {DEFAULT_HEIGHT} · Optimal solution:{" "}
                  {2 ** height - 1} moves
                </span>
              </label>
            </TestPanel>

            <TestPanel title="Instructions">
              <InstructionList
                accent="cyan"
                items={[
                  {
                    title: "Choose a disk",
                    description:
                      "Drag the top disk of a peg, or tap it to select it.",
                  },
                  {
                    title: "Choose its destination",
                    description:
                      "Drop the disk or tap the peg where it should move.",
                  },
                  {
                    title: "Follow the size rule",
                    description:
                      "Never place a larger disk on top of a smaller one.",
                  },
                  {
                    title: "Complete the tower",
                    description:
                      "Move every disk to the right peg in as few moves as possible.",
                  },
                ]}
              />
            </TestPanel>
          </div>
        </TestSetupLayout>
      ) : (
        <section className="py-8 sm:py-14">
          <div className="flex flex-col justify-between gap-8 sm:flex-row sm:items-end">
            <div>
              <p className="font-mono text-sm font-semibold uppercase tracking-[0.3em] text-cyan-300">
                Tower complete
              </p>
              <h1 className="mt-4 text-4xl font-black tracking-tight sm:text-6xl">
                Hanoi results
              </h1>
            </div>
            <div className="flex flex-wrap gap-3 self-start sm:self-auto">
              <button
                type="button"
                onClick={returnToSetupRoute}
                className="min-h-12 rounded-full border border-white/15 px-6 font-bold text-white transition hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-300"
              >
                Change settings
              </button>
              <button
                type="button"
                onClick={startSession}
                className="min-h-12 rounded-full bg-cyan-300 px-6 font-bold text-slate-950 transition hover:bg-cyan-200 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-300"
              >
                Repeat test
              </button>
            </div>
          </div>

          {lastSession && (
            <>
              <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                {[
                  ["Steps", String(lastSession.moves.length), "text-cyan-300"],
                  [
                    "Optimal",
                    String(lastSession.optimalMoves),
                    "text-emerald-300",
                  ],
                  [
                    "Extra moves",
                    String(lastSession.moves.length - lastSession.optimalMoves),
                    "text-amber-300",
                  ],
                  [
                    "Duration",
                    formatDuration(lastSession.durationMs),
                    "text-white",
                  ],
                  [
                    "Average speed",
                    `${lastSession.averageSpeed}/min`,
                    "text-violet-300",
                  ],
                ].map(([label, value, color]) => (
                  <div
                    key={label}
                    className="rounded-3xl border border-white/10 bg-white/[0.05] p-6"
                  >
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      {label}
                    </p>
                    <p
                      className={`mt-3 font-mono text-3xl font-black ${color}`}
                    >
                      {value}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-6 rounded-3xl border border-white/10 bg-white/[0.04] p-4 sm:p-6">
                <div className="mb-4">
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Performance over time
                  </p>
                  <h2 className="mt-2 text-2xl font-bold">Move speed</h2>
                  <p className="mt-1 text-sm text-slate-400">
                    Cumulative moves per minute. Hover or touch the graph for
                    individual move details.
                  </p>
                </div>
                <HanoiSpeedGraph moves={lastSession.moves} />
              </div>
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
            <h2 className="mt-2 text-2xl font-bold">Hanoi history</h2>
          </div>
          {history.length > 0 && (
            <p className="font-mono text-sm text-slate-500">
              {history.length} {history.length === 1 ? "session" : "sessions"}
            </p>
          )}
        </div>
        <HanoiHistory sessions={history} />
        <p className="mt-8 max-w-2xl text-sm leading-6 text-slate-600">
          This is a practice tool, not a clinical assessment. Input method and
          familiarity with the puzzle can affect results.
        </p>
      </section>
    </TestPageShell>
  );
}
