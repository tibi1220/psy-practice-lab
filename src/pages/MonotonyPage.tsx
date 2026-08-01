import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import {
  createMonotonySequence,
  getStimulus,
  StimulusSquare,
  stimulusTypes,
} from "../components/MonotonyStimulus";
import { MonotonyPrintDialog } from "../components/MonotonyPrintDialog";
import { MonotonyDemo } from "../components/TestDemos";
import { ValidatedNumberInput } from "../components/ValidatedNumberInput";
import {
  InstructionList,
  TestPageShell,
  TestPanel,
  TestSetupLayout,
} from "../components/TestPage";
import { createLocalId } from "../lib/create-local-id";
import { useTestRoute } from "../hooks/useTestRoute";

const STORAGE_KEY = "psy-monotony-sessions";
const DEFAULT_ITEM_COUNT = 500;
const DEFAULT_GOOD_TYPES = [
  "side-left",
  "corner-upper-right",
  "corner-bottom-right",
];
const graphPadding = { top: 22, right: 44, bottom: 32, left: 48 };

type Phase = "setup" | "running" | "complete";

type TrialResult = {
  itemIndex: number;
  typeId: string;
  actualGood: boolean;
  responseGood: boolean;
  correct: boolean;
  reactionTime: number;
  elapsedMs: number;
};

type MonotonySession = {
  id: string;
  completedAt: string;
  itemCount: number;
  goodTypeIds: string[];
  trials: TrialResult[];
  totalTimeMs: number;
  workingSpeed: number;
  averageReactionTime: number;
  accuracy?: number;
  mistakes: number;
  goodMarkedBad: number;
  badMarkedGood: number;
};

function accuracyForTrials(trials: TrialResult[]) {
  if (trials.length === 0) return 0;
  const correct = trials.filter((trial) => trial.correct).length;
  return Math.round((correct / trials.length) * 1000) / 10;
}

function calculateSession(
  itemCount: number,
  goodTypeIds: string[],
  trials: TrialResult[],
  totalTimeMs: number,
): MonotonySession {
  const mistakes = trials.filter((trial) => !trial.correct);
  const reactionTotal = trials.reduce(
    (total, trial) => total + trial.reactionTime,
    0,
  );

  return {
    id: createLocalId(),
    completedAt: new Date().toISOString(),
    itemCount,
    goodTypeIds,
    trials,
    totalTimeMs,
    workingSpeed: Math.round((itemCount / totalTimeMs) * 60_000 * 10) / 10,
    averageReactionTime: Math.round(reactionTotal / trials.length),
    accuracy: accuracyForTrials(trials),
    mistakes: mistakes.length,
    goodMarkedBad: mistakes.filter(
      (trial) => trial.actualGood && !trial.responseGood,
    ).length,
    badMarkedGood: mistakes.filter(
      (trial) => !trial.actualGood && trial.responseGood,
    ).length,
  };
}

function isStoredSession(value: unknown): value is MonotonySession {
  if (!value || typeof value !== "object") return false;

  const session = value as Partial<MonotonySession>;
  return (
    typeof session.id === "string" &&
    typeof session.completedAt === "string" &&
    typeof session.itemCount === "number" &&
    typeof session.workingSpeed === "number" &&
    typeof session.mistakes === "number" &&
    Array.isArray(session.goodTypeIds) &&
    Array.isArray(session.trials)
  );
}

function rollingMetrics(trials: TrialResult[]) {
  const rollingWindow = Math.max(
    8,
    Math.min(30, Math.round(trials.length / 20)),
  );
  let mistakesSoFar = 0;

  const metrics = trials.map((_, index) => {
    const start = Math.max(0, index - rollingWindow + 1);
    const window = trials.slice(start, index + 1);
    const averageResponse =
      window.reduce((total, trial) => total + trial.reactionTime, 0) /
      window.length;
    if (!trials[index].correct) mistakesSoFar += 1;

    return {
      speed: 60_000 / averageResponse,
      accuracy: (1 - mistakesSoFar / (index + 1)) * 100,
    };
  });

  return {
    speeds: metrics.map((metric) => metric.speed),
    accuracies: metrics.map((metric) => metric.accuracy),
  };
}

function PerformanceGraph({ trials }: { trials: TrialResult[] }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hovered, setHovered] = useState<{
    index: number;
    x: number;
  } | null>(null);
  const { speeds, accuracies } = useMemo(
    () => rollingMetrics(trials),
    [trials],
  );
  const hoveredTrial =
    hovered === null ? null : (trials[hovered.index] ?? null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || trials.length === 0) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    const draw = () => {
      const rectangle = canvas.getBoundingClientRect();
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(rectangle.width * pixelRatio));
      canvas.height = Math.max(1, Math.round(rectangle.height * pixelRatio));
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

      const width = rectangle.width;
      const height = rectangle.height;
      const plotWidth = width - graphPadding.left - graphPadding.right;
      const plotHeight = height - graphPadding.top - graphPadding.bottom;
      const minimum = Math.min(...speeds);
      const maximum = Math.max(...speeds);
      const range = Math.max(1, maximum - minimum);
      const yMinimum = Math.max(0, minimum - range * 0.15);
      const yMaximum = maximum + range * 0.15;
      const xFor = (index: number) =>
        graphPadding.left +
        (index / Math.max(1, trials.length - 1)) * plotWidth;
      const yFor = (speed: number) =>
        graphPadding.top +
        (1 - (speed - yMinimum) / (yMaximum - yMinimum)) * plotHeight;
      const yForAccuracy = (accuracy: number) =>
        graphPadding.top + (1 - accuracy / 100) * plotHeight;

      context.clearRect(0, 0, width, height);
      context.fillStyle = "#020617";
      context.fillRect(0, 0, width, height);

      context.strokeStyle = "rgba(148,163,184,0.15)";
      context.lineWidth = 1;
      context.font = "11px ui-monospace, monospace";
      context.fillStyle = "#64748b";
      context.textAlign = "right";
      context.textBaseline = "middle";
      for (let line = 0; line <= 4; line += 1) {
        const ratio = line / 4;
        const y = graphPadding.top + ratio * plotHeight;
        const value = yMaximum - ratio * (yMaximum - yMinimum);
        context.beginPath();
        context.moveTo(graphPadding.left, y);
        context.lineTo(width - graphPadding.right, y);
        context.stroke();
        context.fillText(String(Math.round(value)), graphPadding.left - 8, y);
      }

      context.fillStyle = "#34d399";
      context.textAlign = "left";
      for (let line = 0; line <= 4; line += 1) {
        const ratio = line / 4;
        const y = graphPadding.top + ratio * plotHeight;
        context.fillText(
          `${Math.round(100 - ratio * 100)}%`,
          width - graphPadding.right + 8,
          y,
        );
      }

      context.lineWidth = 1;
      for (const trial of trials) {
        if (trial.correct) continue;
        context.strokeStyle = trial.actualGood
          ? "rgba(251,113,133,0.82)"
          : "rgba(167,139,250,0.82)";
        const x = xFor(trial.itemIndex);
        context.beginPath();
        context.moveTo(x, graphPadding.top);
        context.lineTo(x, graphPadding.top + plotHeight);
        context.stroke();
      }

      const speedGradient = context.createLinearGradient(
        graphPadding.left,
        0,
        width - graphPadding.right,
        0,
      );
      speedGradient.addColorStop(0, "#fbbf24");
      speedGradient.addColorStop(1, "#22d3ee");
      context.strokeStyle = speedGradient;
      context.lineWidth = 3;
      context.lineJoin = "round";
      context.beginPath();
      speeds.forEach((speed, index) => {
        const x = xFor(index);
        const y = yFor(speed);
        if (index === 0) context.moveTo(x, y);
        else context.lineTo(x, y);
      });
      context.stroke();

      context.strokeStyle = "#34d399";
      context.lineWidth = 2;
      context.beginPath();
      accuracies.forEach((accuracy, index) => {
        const x = xFor(index);
        const y = yForAccuracy(accuracy);
        if (index === 0) context.moveTo(x, y);
        else context.lineTo(x, y);
      });
      context.stroke();

      if (hovered !== null) {
        const hoverX = xFor(hovered.index);
        const speedY = yFor(speeds[hovered.index]);
        const accuracyY = yForAccuracy(accuracies[hovered.index]);
        context.save();
        context.setLineDash([4, 4]);
        context.strokeStyle = "rgba(248,250,252,0.65)";
        context.lineWidth = 1;
        context.beginPath();
        context.moveTo(hoverX, graphPadding.top);
        context.lineTo(hoverX, graphPadding.top + plotHeight);
        context.stroke();
        context.restore();
        context.fillStyle = "#f8fafc";
        context.beginPath();
        context.arc(hoverX, speedY, 4, 0, Math.PI * 2);
        context.fill();
        context.fillStyle = "#34d399";
        context.beginPath();
        context.arc(hoverX, accuracyY, 4, 0, Math.PI * 2);
        context.fill();
      }

      context.fillStyle = "#64748b";
      context.textAlign = "left";
      context.textBaseline = "top";
      context.fillText(
        "1",
        graphPadding.left,
        height - graphPadding.bottom + 10,
      );
      context.textAlign = "right";
      context.fillText(
        String(trials.length),
        width - graphPadding.right,
        height - graphPadding.bottom + 10,
      );
    };

    draw();
    const resizeObserver = new ResizeObserver(draw);
    resizeObserver.observe(canvas);
    return () => resizeObserver.disconnect();
  }, [accuracies, hovered, speeds, trials]);

  const updateHoveredTrial = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const rectangle = event.currentTarget.getBoundingClientRect();
    const plotWidth = rectangle.width - graphPadding.left - graphPadding.right;
    const relativeX = Math.max(
      0,
      Math.min(plotWidth, event.clientX - rectangle.left - graphPadding.left),
    );
    const index = Math.max(
      0,
      Math.min(
        trials.length - 1,
        Math.round((relativeX / plotWidth) * (trials.length - 1)),
      ),
    );
    setHovered({ index, x: event.clientX - rectangle.left });
  };

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3 text-xs">
        <p className="font-semibold uppercase tracking-wider text-slate-500">
          Rolling speed · cumulative accuracy
        </p>
        <div className="flex flex-wrap gap-4 text-slate-500">
          <span className="flex items-center gap-2">
            <span className="h-0.5 w-5 bg-gradient-to-r from-amber-400 to-cyan-400" />
            Speed
          </span>
          <span className="flex items-center gap-2">
            <span className="h-0.5 w-5 bg-emerald-400" />
            Accuracy
          </span>
          <span className="flex items-center gap-2">
            <span className="h-4 w-px bg-rose-400" />
            Good marked bad
          </span>
          <span className="flex items-center gap-2">
            <span className="h-4 w-px bg-violet-400" />
            Bad marked good
          </span>
        </div>
      </div>
      <div className="relative">
        <canvas
          ref={canvasRef}
          className="h-72 w-full cursor-crosshair rounded-2xl border border-white/10 bg-slate-950"
          aria-label="Interactive working-speed and accuracy graph with rose lines for good items marked bad and violet lines for bad items marked good"
          onPointerMove={updateHoveredTrial}
          onPointerDown={updateHoveredTrial}
          onPointerLeave={() => setHovered(null)}
          style={{ touchAction: "pan-y" }}
        />
        {hoveredTrial && hovered && (
          <div
            className={`pointer-events-none absolute top-3 z-10 min-w-44 rounded-xl border border-white/10 bg-slate-900/95 p-3 text-xs shadow-2xl backdrop-blur ${
              hovered.x > 220 ? "right-3" : "left-14"
            }`}
          >
            <div className="flex items-center justify-between gap-5">
              <p className="font-semibold text-white">
                Square {hoveredTrial.itemIndex + 1}
              </p>
              <p className="font-mono text-amber-300">
                {Math.round(speeds[hovered.index])} items/min
              </p>
            </div>
            <p className="mt-2 font-mono text-emerald-300">
              {Math.round(accuracies[hovered.index] * 10) / 10}% accuracy so far
            </p>
            <p className="mt-2 text-slate-400">
              {getStimulus(hoveredTrial.typeId).shortLabel} ·{" "}
              {hoveredTrial.actualGood ? "Good" : "Bad"}
            </p>
            <p className="mt-1 text-slate-400">
              Response: {hoveredTrial.reactionTime} ms
            </p>
            <p
              className={`mt-2 font-semibold ${
                hoveredTrial.correct
                  ? "text-emerald-300"
                  : hoveredTrial.actualGood
                    ? "text-rose-300"
                    : "text-violet-300"
              }`}
            >
              {hoveredTrial.correct
                ? "Correct"
                : hoveredTrial.actualGood
                  ? "Good marked bad"
                  : "Bad marked good"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function SessionHistory({ sessions }: { sessions: MonotonySession[] }) {
  if (sessions.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-white/15 px-6 py-10 text-center">
        <p className="font-medium text-slate-300">
          Your completed monotony sessions will appear here.
        </p>
        <p className="mt-2 text-sm text-slate-500">
          Results and configurations are saved only in this browser.
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
                {session.itemCount} squares · {session.mistakes} mistakes ·{" "}
                {session.accuracy ?? accuracyForTrials(session.trials)}%
                accuracy
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="font-mono text-xl font-semibold text-amber-300">
                  {session.workingSpeed}
                </p>
                <p className="text-xs uppercase tracking-wider text-slate-500">
                  Items/min
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
          <div className="border-t border-white/10 px-5 py-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl bg-slate-950/60 p-4">
                <p className="text-xs uppercase tracking-wider text-slate-500">
                  Accuracy
                </p>
                <p className="mt-2 font-mono text-xl text-emerald-300">
                  {session.accuracy ?? accuracyForTrials(session.trials)}%
                </p>
              </div>
              <div className="rounded-xl bg-slate-950/60 p-4">
                <p className="text-xs uppercase tracking-wider text-slate-500">
                  Good marked bad
                </p>
                <p className="mt-2 font-mono text-xl text-rose-300">
                  {session.goodMarkedBad}
                </p>
              </div>
              <div className="rounded-xl bg-slate-950/60 p-4">
                <p className="text-xs uppercase tracking-wider text-slate-500">
                  Bad marked good
                </p>
                <p className="mt-2 font-mono text-xl text-rose-300">
                  {session.badMarkedGood}
                </p>
              </div>
              <div className="rounded-xl bg-slate-950/60 p-4">
                <p className="text-xs uppercase tracking-wider text-slate-500">
                  Average response
                </p>
                <p className="mt-2 font-mono text-xl text-cyan-300">
                  {session.averageReactionTime} ms
                </p>
              </div>
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-500">
              Good types:{" "}
              {session.goodTypeIds
                .map((id) => getStimulus(id).shortLabel)
                .join(", ") || "None"}
            </p>
          </div>
        </details>
      ))}
    </div>
  );
}

export default function MonotonyPage() {
  const [phase, setPhase] = useState<Phase>("setup");
  const [itemCount, setItemCount] = useState(DEFAULT_ITEM_COUNT);
  const [goodTypeIds, setGoodTypeIds] = useState<string[]>(DEFAULT_GOOD_TYPES);
  const [sequence, setSequence] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [trials, setTrials] = useState<TrialResult[]>([]);
  const [lastSession, setLastSession] = useState<MonotonySession | null>(null);
  const [history, setHistory] = useState<MonotonySession[]>([]);
  const startTimeRef = useRef(0);
  const shownAtRef = useRef(0);
  const inputLockedRef = useRef(false);

  const returnToSetup = useCallback(() => {
    inputLockedRef.current = true;
    setSequence([]);
    setCurrentIndex(0);
    setTrials([]);
    setLastSession(null);
    setPhase("setup");
  }, []);
  const { beginTestRoute, completeTestRoute, returnToSetupRoute } =
    useTestRoute({
      basePath: "/monotony",
      view:
        phase === "setup" ? "setup" : phase === "complete" ? "result" : "test",
      onReturnToSetup: returnToSetup,
    });

  useEffect(() => {
    const hydrationTimer = window.setTimeout(() => {
      try {
        const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
        if (Array.isArray(stored)) {
          setHistory(stored.filter(isStoredSession));
        }
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }, 0);

    return () => window.clearTimeout(hydrationTimer);
  }, []);

  useLayoutEffect(() => {
    if (phase !== "running") return;
    shownAtRef.current = performance.now();
    inputLockedRef.current = false;
  }, [currentIndex, phase]);

  const toggleGoodType = (typeId: string) => {
    setGoodTypeIds((current) =>
      current.includes(typeId)
        ? current.filter((id) => id !== typeId)
        : [...current, typeId],
    );
  };

  const startSession = useCallback(() => {
    beginTestRoute(phase === "complete");
    const nextSequence = createMonotonySequence(itemCount);
    const now = performance.now();

    setSequence(nextSequence);
    setCurrentIndex(0);
    setTrials([]);
    setLastSession(null);
    startTimeRef.current = now;
    shownAtRef.current = now;
    inputLockedRef.current = false;
    setPhase("running");
  }, [beginTestRoute, itemCount, phase]);

  const finishSession = useCallback(
    (completedTrials: TrialResult[], finishedAt: number) => {
      const session = calculateSession(
        itemCount,
        [...goodTypeIds],
        completedTrials,
        finishedAt - startTimeRef.current,
      );

      setLastSession(session);
      setHistory((currentHistory) => {
        const updatedHistory = [session, ...currentHistory].slice(0, 20);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedHistory));
        return updatedHistory;
      });
      setPhase("complete");
      completeTestRoute();
    },
    [completeTestRoute, goodTypeIds, itemCount],
  );

  const respond = useCallback(
    (responseGood: boolean) => {
      if (phase !== "running" || inputLockedRef.current) return;
      const typeId = sequence[currentIndex];
      if (!typeId) return;

      inputLockedRef.current = true;
      const now = performance.now();
      const actualGood = goodTypeIds.includes(typeId);
      const result: TrialResult = {
        itemIndex: currentIndex,
        typeId,
        actualGood,
        responseGood,
        correct: actualGood === responseGood,
        reactionTime: Math.max(1, Math.round(now - shownAtRef.current)),
        elapsedMs: Math.round(now - startTimeRef.current),
      };
      const completedTrials = [...trials, result];

      setTrials(completedTrials);
      if (currentIndex + 1 >= sequence.length) {
        finishSession(completedTrials, now);
        return;
      }

      setCurrentIndex((current) => current + 1);
    },
    [currentIndex, finishSession, goodTypeIds, phase, sequence, trials],
  );

  useEffect(() => {
    if (phase !== "running") return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      event.preventDefault();
      if (event.repeat) return;
      respond(event.key === "ArrowRight");
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [phase, respond]);

  if (phase === "running") {
    const currentType = getStimulus(sequence[currentIndex]);
    const progress = ((currentIndex + 1) / sequence.length) * 100;

    return (
      <main className="flex h-dvh flex-col overflow-hidden bg-slate-950 px-4 py-3 text-white sm:px-8 sm:py-5">
        <header className="shrink-0">
          <div className="flex items-center justify-between gap-5">
            <div>
              <p className="font-mono text-sm font-semibold uppercase tracking-[0.2em] text-amber-300">
                Square {currentIndex + 1} of {sequence.length}
              </p>
              <p className="mt-1 text-xs text-slate-500">← Bad · Good →</p>
            </div>
            <p className="font-mono text-sm text-slate-400">
              {Math.round(progress)}%
            </p>
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/5">
            <div
              className="h-full rounded-full bg-amber-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </header>

        <section className="flex min-h-0 flex-1 items-center justify-center py-3">
          <div
            className="flex-none"
            style={{ width: "min(62vw, 46dvh, 18rem)" }}
          >
            <StimulusSquare type={currentType} />
          </div>
        </section>

        <footer className="grid shrink-0 grid-cols-2 gap-3 pb-[max(0rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onPointerDown={() => respond(false)}
            className="flex min-h-14 items-center justify-between rounded-2xl border border-white/15 bg-slate-900 px-5 font-bold text-slate-100 active:bg-rose-300 active:text-slate-950"
            style={{ touchAction: "manipulation" }}
          >
            <span aria-hidden="true" className="text-2xl">
              ←
            </span>
            Bad
          </button>
          <button
            type="button"
            onPointerDown={() => respond(true)}
            className="flex min-h-14 items-center justify-between rounded-2xl bg-amber-300 px-5 font-bold text-slate-950 active:bg-amber-200"
            style={{ touchAction: "manipulation" }}
          >
            Good
            <span aria-hidden="true" className="text-2xl">
              →
            </span>
          </button>
        </footer>
      </main>
    );
  }

  return (
    <TestPageShell accent="amber">
      {phase === "setup" ? (
        <TestSetupLayout
          accent="amber"
          eyebrow="Performance under monotony"
          title="Stay accurate through repetition."
          description={
            <p>
              Classify a long sequence of similar squares. Press Right for a
              good type and Left for a bad type, balancing speed with accuracy.
            </p>
          }
          actions={
            <>
              <button
                type="button"
                onClick={startSession}
                className="min-h-14 rounded-full bg-amber-300 px-8 font-bold text-slate-950 transition hover:bg-amber-200 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-300"
              >
                Start test
              </button>
              <MonotonyPrintDialog
                itemCount={itemCount}
                goodTypeIds={goodTypeIds}
              />
              <MonotonyDemo />
            </>
          }
        >
          <div className="space-y-4">
            <TestPanel title="Test settings">
              <label className="block">
                <span className="flex items-center justify-between text-sm font-semibold text-slate-300">
                  Number of squares
                  <span className="font-mono text-amber-300">{itemCount}</span>
                </span>
                <ValidatedNumberInput
                  min={20}
                  max={2000}
                  step="10"
                  value={itemCount}
                  normalize={Math.round}
                  onValueChange={setItemCount}
                  className="mt-3 min-h-12 w-full rounded-xl border border-white/10 bg-slate-950 px-4 font-mono text-white outline-none focus:border-amber-300"
                />
                <span className="mt-2 block text-xs leading-5 text-slate-500">
                  Choose between 20 and 2,000. The default is 500.
                </span>
              </label>
              <div className="mt-7 border-t border-white/10 pt-7">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <h3 className="font-bold text-slate-100">
                      Classify the types
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                      Tap each type to toggle between good and bad.
                    </p>
                  </div>
                  <p className="shrink-0 font-mono text-sm text-slate-500">
                    {goodTypeIds.length} good ·{" "}
                    {stimulusTypes.length - goodTypeIds.length} bad
                  </p>
                </div>
                <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {stimulusTypes.map((type) => {
                    const isGood = goodTypeIds.includes(type.id);
                    return (
                      <button
                        key={type.id}
                        type="button"
                        aria-pressed={isGood}
                        onClick={() => toggleGoodType(type.id)}
                        className={`rounded-2xl border p-4 text-left transition focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-amber-300 ${
                          isGood
                            ? "border-amber-300/60 bg-amber-300/10"
                            : "border-white/10 bg-white/[0.035]"
                        }`}
                      >
                        <StimulusSquare type={type} compact />
                        <p className="mt-4 text-sm font-semibold text-slate-200">
                          {type.label}
                        </p>
                        <p
                          className={`mt-1 text-xs font-bold uppercase tracking-wider ${
                            isGood ? "text-amber-300" : "text-slate-600"
                          }`}
                        >
                          {isGood ? "Good" : "Bad"}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            </TestPanel>

            <TestPanel title="Instructions">
              <InstructionList
                accent="amber"
                items={[
                  {
                    title: "Learn the groups",
                    description:
                      "Review which highlighted shapes are good or bad.",
                  },
                  {
                    title: "Inspect",
                    description: "Identify the highlighted corner or side.",
                  },
                  {
                    title: "Mark bad",
                    description:
                      "Press ← for a shape assigned to the bad group.",
                  },
                  {
                    title: "Mark good",
                    description:
                      "Press → for a shape assigned to the good group.",
                  },
                  {
                    title: "Practice on paper",
                    description:
                      "Generate a randomized PDF and circle every good square by hand.",
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
              <p className="font-mono text-sm font-semibold uppercase tracking-[0.3em] text-amber-300">
                Session complete
              </p>
              <h1 className="mt-4 text-4xl font-black tracking-tight sm:text-6xl">
                Monotony results
              </h1>
            </div>
            <button
              type="button"
              onClick={returnToSetupRoute}
              className="min-h-12 self-start rounded-full bg-amber-300 px-6 font-bold text-slate-950 transition hover:bg-amber-200 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-300 sm:self-auto"
            >
              Change settings
            </button>
          </div>

          {lastSession && (
            <>
              <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                <div className="rounded-3xl border border-amber-300/20 bg-amber-300/10 p-6">
                  <p className="text-sm font-semibold uppercase tracking-wider text-amber-200/70">
                    Working speed
                  </p>
                  <p className="mt-3 font-mono text-4xl font-black text-amber-300">
                    {lastSession.workingSpeed}
                  </p>
                  <p className="mt-1 text-sm text-amber-200/60">items/min</p>
                </div>
                <div className="rounded-3xl border border-emerald-300/20 bg-emerald-300/10 p-6">
                  <p className="text-sm font-semibold uppercase tracking-wider text-emerald-200/70">
                    Accuracy
                  </p>
                  <p className="mt-3 font-mono text-4xl font-black text-emerald-300">
                    {lastSession.accuracy ??
                      accuracyForTrials(lastSession.trials)}
                    %
                  </p>
                </div>
                <div className="rounded-3xl border border-white/10 bg-white/[0.05] p-6">
                  <p className="text-sm font-semibold uppercase tracking-wider text-slate-500">
                    Total mistakes
                  </p>
                  <p className="mt-3 font-mono text-4xl font-black text-rose-300">
                    {lastSession.mistakes}
                  </p>
                </div>
                <div className="rounded-3xl border border-white/10 bg-white/[0.05] p-6">
                  <p className="text-sm font-semibold uppercase tracking-wider text-slate-500">
                    Good marked bad
                  </p>
                  <p className="mt-3 font-mono text-4xl font-black text-white">
                    {lastSession.goodMarkedBad}
                  </p>
                </div>
                <div className="rounded-3xl border border-white/10 bg-white/[0.05] p-6">
                  <p className="text-sm font-semibold uppercase tracking-wider text-slate-500">
                    Bad marked good
                  </p>
                  <p className="mt-3 font-mono text-4xl font-black text-white">
                    {lastSession.badMarkedGood}
                  </p>
                </div>
              </div>

              <div className="mt-6 rounded-3xl border border-white/10 bg-white/[0.035] p-4 sm:p-6">
                <PerformanceGraph trials={lastSession.trials} />
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
            <h2 className="mt-2 text-2xl font-bold">Monotony history</h2>
          </div>
          {history.length > 0 && (
            <p className="font-mono text-sm text-slate-500">
              {history.length} {history.length === 1 ? "session" : "sessions"}
            </p>
          )}
        </div>
        <SessionHistory sessions={history} />
        <p className="mt-8 max-w-2xl text-sm leading-6 text-slate-600">
          This is a practice tool, not a clinical assessment. Working speed is
          affected by the device, input method, and selected classification
          rules.
        </p>
      </section>
    </TestPageShell>
  );
}
