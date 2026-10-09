import {
  LocalizedDate,
  Localized,
  useTextTranslation,
} from '../components/Localization';
import { useCallback, useEffect, useRef, useState } from 'react';
import { DividedAttentionDemo } from '../components/TestDemos';
import { carGeometry } from '../components/CarDisplay';
import {
  InstructionList,
  TestPageShell,
  TestPanel,
  TestSetupLayout,
} from '../components/TestPage';
import { TrafficLightDisplay } from '../components/TrafficLightDisplay';
import { ValidatedNumberInput } from '../components/ValidatedNumberInput';
import { createLocalId } from '../lib/create-local-id';
import { useTestRoute } from '../hooks/useTestRoute';

const DEFAULT_DURATION_MINUTES = 2;
const DEFAULT_SIGNAL_COUNT = 5;
const MIN_DURATION_MINUTES = 1;
const MAX_DURATION_MINUTES = 10;
const MAX_SIGNAL_COUNT = 30;
const STORAGE_KEY = 'psy-divided-attention-sessions';

type Phase = 'setup' | 'running' | 'complete';
type SignalSide = 'left' | 'right';
type SignalDirection = 'up' | 'down';
type Difficulty = 'easy' | 'medium' | 'hard';

type ScheduledSignal = {
  id: number;
  at: number;
  side: SignalSide;
};

type ActiveSignal = ScheduledSignal & {
  startedAt: number;
};

type SignalResult = {
  side: SignalSide;
  expectedDirection: SignalDirection;
  reactionTime: number | null;
};

type DividedAttentionSession = {
  id: string;
  completedAt: string;
  durationMs: number;
  collisions: number;
  avoidedCars: number;
  wrongSignalResponses: number;
  signalResults: SignalResult[];
  averageReactionTime: number | null;
  settings?: {
    durationMinutes: number;
    signalCount: number;
    difficulty: Difficulty;
  };
};

type OpponentCar = {
  id: number;
  lane: number;
  y: number;
  speed: number;
  color: string;
};

const opponentColors = ['#fb7185', '#fbbf24', '#a78bfa', '#60a5fa', '#f97316'];

const difficultySettings: Record<
  Difficulty,
  {
    carSpeed: number;
    spawnBaseMs: number;
    spawnJitterMs: number;
    signalTimeoutMs: number;
  }
> = {
  easy: {
    carSpeed: 0.000155,
    spawnBaseMs: 2_100,
    spawnJitterMs: 650,
    signalTimeoutMs: 2_500,
  },
  medium: {
    carSpeed: 0.00019,
    spawnBaseMs: 1_350,
    spawnJitterMs: 650,
    signalTimeoutMs: 1_800,
  },
  hard: {
    carSpeed: 0.000225,
    spawnBaseMs: 900,
    spawnJitterMs: 450,
    signalTimeoutMs: 1_200,
  },
};

function expectedDirection(side: SignalSide): SignalDirection {
  return side === 'left' ? 'down' : 'up';
}

function averageReactionTime(results: SignalResult[]) {
  const completed = results.flatMap(result =>
    result.reactionTime === null ? [] : [result.reactionTime],
  );

  if (completed.length === 0) return null;
  return Math.round(
    completed.reduce((total, reaction) => total + reaction, 0) /
      completed.length,
  );
}

function maximumSignalsForDuration(
  durationMinutes: number,
  difficulty: Difficulty,
) {
  const durationMs = durationMinutes * 60_000;
  const usableDuration = Math.max(0, durationMs - 12_000);
  const signalSpacing = difficultySettings[difficulty].signalTimeoutMs + 1_500;
  return Math.max(
    1,
    Math.min(MAX_SIGNAL_COUNT, Math.floor(usableDuration / signalSpacing)),
  );
}

function createSignalSchedule(
  durationMs: number,
  signalCount: number,
): ScheduledSignal[] {
  const edgeBuffer = Math.min(6_000, durationMs * 0.12);
  const usableDuration = durationMs - edgeBuffer * 2;
  const slotDuration = usableDuration / signalCount;

  return Array.from({ length: signalCount }, (_, index) => ({
    id: index,
    at:
      edgeBuffer +
      slotDuration * (index + 0.5) +
      (Math.random() - 0.5) * slotDuration * 0.35,
    side: Math.random() < 0.5 ? 'left' : 'right',
  }));
}

function chooseSafeSpawnLane(opponents: OpponentCar[]) {
  const shuffledLanes = [0, 1, 2].sort(() => Math.random() - 0.5);

  for (const lane of shuffledLanes) {
    const hasSafeSpacing = opponents.every(
      opponent => opponent.lane !== lane || opponent.y > 0.28,
    );
    if (!hasSafeSpacing) continue;

    const carsWithCandidate = [
      ...opponents,
      { id: -1, lane, y: -0.12, speed: 0, color: '' },
    ];
    const createsRoadblock = carsWithCandidate.some(anchor => {
      const nearbyLanes = new Set(
        carsWithCandidate
          .filter(car => Math.abs(car.y - anchor.y) < 0.24)
          .map(car => car.lane),
      );
      return nearbyLanes.size === 3;
    });

    if (!createsRoadblock) return lane;
  }

  return null;
}

function formatRemaining(milliseconds: number) {
  const seconds = Math.max(0, Math.ceil(milliseconds / 1000));
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
}

function isStoredSession(value: unknown): value is DividedAttentionSession {
  if (!value || typeof value !== 'object') return false;

  const session = value as Partial<DividedAttentionSession>;
  return (
    typeof session.id === 'string' &&
    typeof session.completedAt === 'string' &&
    typeof session.collisions === 'number' &&
    typeof session.avoidedCars === 'number' &&
    typeof session.wrongSignalResponses === 'number' &&
    Array.isArray(session.signalResults) &&
    session.signalResults.length > 0 &&
    (session.settings === undefined ||
      (typeof session.settings.durationMinutes === 'number' &&
        typeof session.settings.signalCount === 'number' &&
        (session.settings.difficulty === 'easy' ||
          session.settings.difficulty === 'medium' ||
          session.settings.difficulty === 'hard')))
  );
}

function roundedRectangle(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const safeRadius = Math.min(radius, width / 2, height / 2);

  context.beginPath();
  context.moveTo(x + safeRadius, y);
  context.lineTo(x + width - safeRadius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + safeRadius);
  context.lineTo(x + width, y + height - safeRadius);
  context.quadraticCurveTo(
    x + width,
    y + height,
    x + width - safeRadius,
    y + height,
  );
  context.lineTo(x + safeRadius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - safeRadius);
  context.lineTo(x, y + safeRadius);
  context.quadraticCurveTo(x, y, x + safeRadius, y);
  context.closePath();
}

function drawCar(
  context: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  width: number,
  height: number,
  color: string,
  isPlayer = false,
) {
  const x = centerX - width / 2;
  const y = centerY - height / 2;

  context.save();
  context.shadowColor = isPlayer ? 'rgba(34, 211, 238, 0.65)' : 'transparent';
  context.shadowBlur = isPlayer ? 18 : 0;
  context.fillStyle = color;
  roundedRectangle(
    context,
    x,
    y,
    width,
    height,
    width * carGeometry.bodyRadius,
  );
  context.fill();
  context.restore();

  context.fillStyle = isPlayer ? '#164e63' : 'rgba(15, 23, 42, 0.78)';
  roundedRectangle(
    context,
    x + width * carGeometry.windowX,
    y + height * carGeometry.windowY,
    width * carGeometry.windowWidth,
    height * carGeometry.windowHeight,
    width * carGeometry.windowRadius,
  );
  context.fill();

  context.fillStyle = 'rgba(255,255,255,0.72)';
  context.fillRect(
    x + width * 0.12,
    y + height * 0.08,
    width * carGeometry.lightWidth,
    3,
  );
  context.fillRect(
    x + width * 0.7,
    y + height * 0.08,
    width * carGeometry.lightWidth,
    3,
  );

  context.fillStyle = '#0f172a';
  context.fillRect(x - 3, y + height * 0.2, 4, height * 0.2);
  context.fillRect(x + width - 1, y + height * 0.2, 4, height * 0.2);
  context.fillRect(x - 3, y + height * 0.65, 4, height * 0.2);
  context.fillRect(x + width - 1, y + height * 0.65, 4, height * 0.2);
}

function TrafficLight({ side, active }: { side: SignalSide; active: boolean }) {
  const t = useTextTranslation();

  const direction = expectedDirection(side);
  const edgePosition =
    side === 'left'
      ? {
          left: 'calc((100% - min(76%, 700px)) / 2)',
          transform: 'translateX(calc(-100% - 0.35rem))',
        }
      : {
          right: 'calc((100% - min(76%, 700px)) / 2)',
          transform: 'translateX(calc(100% + 0.35rem))',
        };

  return (
    <div
      className='pointer-events-none absolute top-[18%] z-10 flex flex-col items-center gap-2'
      style={edgePosition}
      aria-label={t('dividedAttention.messages.sideTrafficLightIsActive', {
        side: side,
        active: active ? 'red' : 'green',
      })}
    >
      <TrafficLightDisplay active={active} />
      <p className='rounded-full bg-slate-950/90 px-3 py-1.5 font-mono text-base font-black uppercase text-white shadow-lg'>
        <Localized>{direction === 'down' ? '↓' : '↑'}</Localized>
      </p>
    </div>
  );
}

function SessionHistory({ sessions }: { sessions: DividedAttentionSession[] }) {
  if (sessions.length === 0) {
    return (
      <div className='rounded-3xl border border-dashed border-white/15 px-6 py-10 text-center'>
        <p className='font-medium text-slate-300'>
          <Localized id='dividedAttention.labels.yourCompletedDividedAttentionSessionsWillAppearHere' />
        </p>
        <p className='mt-2 text-sm text-slate-500'>
          <Localized id='dividedAttention.results.drivingAndSignalResultsAreSavedOnlyInThis' />
        </p>
      </div>
    );
  }

  return (
    <div className='space-y-3'>
      <Localized>
        {sessions.map((session, sessionIndex) => (
          <details
            key={session.id}
            open={sessionIndex === 0}
            className='group overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] open:bg-white/[0.06]'
          >
            <summary className='flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 marker:hidden'>
              <div>
                <p className='font-semibold text-white'>
                  <LocalizedDate value={session.completedAt} />
                </p>
                <p className='mt-1 text-sm text-slate-400'>
                  <Localized>{session.collisions}</Localized>{' '}
                  <Localized id='dividedAttention.labels.collisionsDetail' />{' '}
                  <Localized>{session.avoidedCars}</Localized>{' '}
                  <Localized id='dividedAttention.labels.avoided' />
                </p>
                <p className='mt-1 text-xs capitalize text-slate-500'>
                  <Localized>
                    {Math.round(session.durationMs / 60_000)}
                  </Localized>{' '}
                  <Localized id='dividedAttention.labels.minDetail' />
                  <Localized> </Localized>
                  <Localized>{session.signalResults.length}</Localized>{' '}
                  <Localized id='dividedAttention.labels.signalsDetail' />
                  <Localized> </Localized>
                  <Localized>
                    {session.settings?.difficulty ?? 'medium'}
                  </Localized>
                </p>
              </div>
              <div className='flex items-center gap-4'>
                <div className='text-right'>
                  <p className='font-mono text-xl font-semibold text-emerald-300'>
                    <Localized>
                      {session.averageReactionTime === null
                        ? '—'
                        : `${session.averageReactionTime} ms`}
                    </Localized>
                  </p>
                  <p className='text-xs uppercase tracking-wider text-slate-500'>
                    <Localized id='dividedAttention.results.signalAverage' />
                  </p>
                </div>
                <span
                  aria-hidden='true'
                  className='text-xl text-slate-500 transition-transform group-open:rotate-45'
                >
                  <Localized>{'+'}</Localized>
                </span>
              </div>
            </summary>
            <div className='border-t border-white/10 px-5 py-4'>
              <div className='mb-4 flex flex-wrap gap-2 text-xs text-slate-400'>
                <span className='rounded-full bg-slate-950/60 px-3 py-1.5'>
                  <Localized id='dividedAttention.labels.wrongSignalKeys' />{' '}
                  <Localized>{session.wrongSignalResponses}</Localized>
                </span>
                <span className='rounded-full bg-slate-950/60 px-3 py-1.5'>
                  <Localized id='dividedAttention.results.missedSignals' />
                  <Localized> </Localized>
                  <Localized>
                    {
                      session.signalResults.filter(
                        result => result.reactionTime === null,
                      ).length
                    }
                  </Localized>
                </span>
              </div>
              <div className='grid grid-cols-2 gap-2 sm:grid-cols-5'>
                <Localized>
                  {session.signalResults.map((result, index) => (
                    <div
                      key={`${session.id}-${index}`}
                      className='rounded-xl bg-slate-950/60 p-3'
                    >
                      <p className='text-xs font-semibold uppercase tracking-wider text-slate-500'>
                        <Localized id='dividedAttention.labels.signal' />{' '}
                        <Localized>{index + 1}</Localized>
                      </p>
                      <p className='mt-2 text-sm font-semibold capitalize text-slate-200'>
                        <Localized>{result.side}</Localized>
                        <Localized>{' ·'}</Localized>
                        <Localized> </Localized>
                        <Localized>
                          {result.expectedDirection === 'down' ? '↓' : '↑'}
                        </Localized>
                      </p>
                      <p className='mt-1 font-mono text-sm text-emerald-300'>
                        <Localized>
                          {result.reactionTime === null
                            ? 'Missed'
                            : `${result.reactionTime} ms`}
                        </Localized>
                      </p>
                    </div>
                  ))}
                </Localized>
              </div>
            </div>
          </details>
        ))}
      </Localized>
    </div>
  );
}

export default function DividedAttentionPage() {
  const t = useTextTranslation();

  const [phase, setPhase] = useState<Phase>('setup');
  const [durationMinutes, setDurationMinutes] = useState(
    DEFAULT_DURATION_MINUTES,
  );
  const [signalCount, setSignalCount] = useState(DEFAULT_SIGNAL_COUNT);
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const durationMs = durationMinutes * 60_000;
  const maximumSignalCount = maximumSignalsForDuration(
    durationMinutes,
    difficulty,
  );
  const [remainingMs, setRemainingMs] = useState(durationMs);
  const [collisions, setCollisions] = useState(0);
  const [avoidedCars, setAvoidedCars] = useState(0);
  const [signalsCompleted, setSignalsCompleted] = useState(0);
  const [activeSignal, setActiveSignal] = useState<ActiveSignal | null>(null);
  const [lastSession, setLastSession] =
    useState<DividedAttentionSession | null>(null);
  const [history, setHistory] = useState<DividedAttentionSession[]>([]);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef(0);
  const lastFrameTimeRef = useRef(0);
  const nextSpawnAtRef = useRef(0);
  const nextCarIdRef = useRef(0);
  const playerLaneRef = useRef(1);
  const playerVisualLaneRef = useRef(1);
  const opponentsRef = useRef<OpponentCar[]>([]);
  const collisionsRef = useRef(0);
  const avoidedCarsRef = useRef(0);
  const lastCollisionAtRef = useRef(-10_000);
  const signalScheduleRef = useRef<ScheduledSignal[]>([]);
  const nextSignalIndexRef = useRef(0);
  const activeSignalRef = useRef<ActiveSignal | null>(null);
  const signalResultsRef = useRef<SignalResult[]>([]);
  const wrongSignalResponsesRef = useRef(0);
  const finishingRef = useRef(false);
  const lastHudUpdateRef = useRef(0);
  const canvasSizeRef = useRef({ width: 0, height: 0 });

  const returnToSetup = useCallback(() => {
    finishingRef.current = true;
    opponentsRef.current = [];
    activeSignalRef.current = null;
    setActiveSignal(null);
    setLastSession(null);
    setPhase('setup');
  }, []);
  const { beginTestRoute, completeTestRoute, returnToSetupRoute } =
    useTestRoute({
      basePath: '/divided-attention',
      view:
        phase === 'setup' ? 'setup' : phase === 'complete' ? 'result' : 'test',
      onReturnToSetup: returnToSetup,
    });

  useEffect(() => {
    const hydrationTimer = window.setTimeout(() => {
      try {
        const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
        if (Array.isArray(stored)) {
          setHistory(stored.filter(isStoredSession));
        }
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }, 0);

    return () => window.clearTimeout(hydrationTimer);
  }, []);

  const finishGame = useCallback(() => {
    if (finishingRef.current) return;
    finishingRef.current = true;

    if (activeSignalRef.current) {
      signalResultsRef.current.push({
        side: activeSignalRef.current.side,
        expectedDirection: expectedDirection(activeSignalRef.current.side),
        reactionTime: null,
      });
      activeSignalRef.current = null;
    }

    const signalResults = [...signalResultsRef.current];
    while (signalResults.length < signalCount) {
      const pendingSignal =
        signalScheduleRef.current[nextSignalIndexRef.current];
      if (!pendingSignal) break;
      signalResults.push({
        side: pendingSignal.side,
        expectedDirection: expectedDirection(pendingSignal.side),
        reactionTime: null,
      });
      nextSignalIndexRef.current += 1;
    }
    const session: DividedAttentionSession = {
      id: createLocalId(),
      completedAt: new Date().toISOString(),
      durationMs,
      collisions: collisionsRef.current,
      avoidedCars: avoidedCarsRef.current,
      wrongSignalResponses: wrongSignalResponsesRef.current,
      signalResults,
      averageReactionTime: averageReactionTime(signalResults),
      settings: {
        durationMinutes,
        signalCount,
        difficulty,
      },
    };

    setRemainingMs(0);
    setActiveSignal(null);
    setLastSession(session);
    setHistory(currentHistory => {
      const updatedHistory = [session, ...currentHistory].slice(0, 100);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedHistory));
      return updatedHistory;
    });
    setPhase('complete');
    completeTestRoute();
  }, [completeTestRoute, difficulty, durationMinutes, durationMs, signalCount]);

  const startGame = useCallback(() => {
    beginTestRoute(phase === 'complete');
    const now = performance.now();

    startTimeRef.current = now;
    lastFrameTimeRef.current = now;
    nextSpawnAtRef.current = now + 900;
    nextCarIdRef.current = 0;
    playerLaneRef.current = 1;
    playerVisualLaneRef.current = 1;
    opponentsRef.current = [];
    collisionsRef.current = 0;
    avoidedCarsRef.current = 0;
    lastCollisionAtRef.current = -10_000;
    signalScheduleRef.current = createSignalSchedule(durationMs, signalCount);
    nextSignalIndexRef.current = 0;
    activeSignalRef.current = null;
    signalResultsRef.current = [];
    wrongSignalResponsesRef.current = 0;
    finishingRef.current = false;
    lastHudUpdateRef.current = now;

    setRemainingMs(durationMs);
    setCollisions(0);
    setAvoidedCars(0);
    setSignalsCompleted(0);
    setActiveSignal(null);
    setLastSession(null);
    setPhase('running');
  }, [beginTestRoute, durationMs, phase, signalCount]);

  const steer = useCallback((direction: -1 | 1) => {
    playerLaneRef.current = Math.max(
      0,
      Math.min(2, playerLaneRef.current + direction),
    );
  }, []);

  const respondToSignal = useCallback((direction: SignalDirection) => {
    const signal = activeSignalRef.current;
    if (!signal) return;

    if (direction !== expectedDirection(signal.side)) {
      wrongSignalResponsesRef.current += 1;
      return;
    }

    const result: SignalResult = {
      side: signal.side,
      expectedDirection: direction,
      reactionTime: Math.max(
        1,
        Math.round(performance.now() - signal.startedAt),
      ),
    };

    signalResultsRef.current.push(result);
    activeSignalRef.current = null;
    setActiveSignal(null);
    setSignalsCompleted(signalResultsRef.current.length);
  }, []);

  useEffect(() => {
    if (phase !== 'running') return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.key === 'ArrowLeft' ||
        event.key === 'ArrowRight' ||
        event.key === 'ArrowUp' ||
        event.key === 'ArrowDown'
      ) {
        event.preventDefault();
      }
      if (event.repeat) return;

      if (event.key === 'ArrowLeft') steer(-1);
      if (event.key === 'ArrowRight') steer(1);
      if (event.key === 'ArrowUp') respondToSignal('up');
      if (event.key === 'ArrowDown') respondToSignal('down');
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [phase, respondToSignal, steer]);

  useEffect(() => {
    if (phase !== 'running') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;
    const traffic = difficultySettings[difficulty];

    const resizeCanvas = () => {
      const rectangle = canvas.getBoundingClientRect();
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(rectangle.width * pixelRatio));
      canvas.height = Math.max(1, Math.round(rectangle.height * pixelRatio));
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      canvasSizeRef.current = {
        width: rectangle.width,
        height: rectangle.height,
      };
    };

    resizeCanvas();
    const resizeObserver = new ResizeObserver(resizeCanvas);
    resizeObserver.observe(canvas);

    const drawFrame = (now: number) => {
      const elapsed = now - startTimeRef.current;
      if (elapsed >= durationMs) {
        finishGame();
        return;
      }

      const delta = Math.min(50, now - lastFrameTimeRef.current);
      lastFrameTimeRef.current = now;
      const progress = elapsed / durationMs;

      if (now - lastHudUpdateRef.current >= 100) {
        lastHudUpdateRef.current = now;
        setRemainingMs(durationMs - elapsed);
      }

      if (now >= nextSpawnAtRef.current) {
        const lane = chooseSafeSpawnLane(opponentsRef.current);

        if (lane === null) {
          nextSpawnAtRef.current = now + 250;
        } else {
          opponentsRef.current.push({
            id: nextCarIdRef.current,
            lane,
            y: -0.12,
            speed: traffic.carSpeed,
            color: opponentColors[nextCarIdRef.current % opponentColors.length],
          });
          nextCarIdRef.current += 1;
          nextSpawnAtRef.current =
            now +
            traffic.spawnBaseMs +
            Math.random() * traffic.spawnJitterMs -
            progress * traffic.spawnBaseMs * 0.12;
        }
      }

      const nextSignal = signalScheduleRef.current[nextSignalIndexRef.current];
      if (!activeSignalRef.current && nextSignal && elapsed >= nextSignal.at) {
        const activated = { ...nextSignal, startedAt: now };
        nextSignalIndexRef.current += 1;
        activeSignalRef.current = activated;
        setActiveSignal(activated);
      }

      if (
        activeSignalRef.current &&
        now - activeSignalRef.current.startedAt >= traffic.signalTimeoutMs
      ) {
        signalResultsRef.current.push({
          side: activeSignalRef.current.side,
          expectedDirection: expectedDirection(activeSignalRef.current.side),
          reactionTime: null,
        });
        activeSignalRef.current = null;
        setActiveSignal(null);
        setSignalsCompleted(signalResultsRef.current.length);
      }

      playerVisualLaneRef.current +=
        (playerLaneRef.current - playerVisualLaneRef.current) *
        Math.min(1, delta * 0.012);

      const { width, height } = canvasSizeRef.current;
      const roadWidth = Math.min(width * 0.76, 700);
      const roadLeft = (width - roadWidth) / 2;
      const laneWidth = roadWidth / 3;
      const carWidth = Math.min(62, laneWidth * 0.42);
      const carHeight = carWidth * 1.62;
      const playerCenterX =
        roadLeft + laneWidth * (playerVisualLaneRef.current + 0.5);
      const playerCenterY = height / 2;

      const remainingCars: OpponentCar[] = [];
      for (const opponent of opponentsRef.current) {
        opponent.y += opponent.speed * delta;
        const opponentCenterX = roadLeft + laneWidth * (opponent.lane + 0.5);
        const opponentCenterY = opponent.y * height;
        const collided =
          Math.abs(opponentCenterX - playerCenterX) < carWidth * 0.82 &&
          Math.abs(opponentCenterY - playerCenterY) < carHeight * 0.84;

        if (collided && now - lastCollisionAtRef.current > 700) {
          lastCollisionAtRef.current = now;
          collisionsRef.current += 1;
          setCollisions(collisionsRef.current);
          continue;
        }

        if (opponent.y > 1.15) {
          avoidedCarsRef.current += 1;
          setAvoidedCars(avoidedCarsRef.current);
          continue;
        }

        remainingCars.push(opponent);
      }
      opponentsRef.current = remainingCars;

      context.clearRect(0, 0, width, height);
      context.fillStyle = '#052e2b';
      context.fillRect(0, 0, width, height);

      const roadGradient = context.createLinearGradient(
        roadLeft,
        0,
        roadLeft + roadWidth,
        0,
      );
      roadGradient.addColorStop(0, '#1e293b');
      roadGradient.addColorStop(0.5, '#334155');
      roadGradient.addColorStop(1, '#1e293b');
      context.fillStyle = roadGradient;
      context.fillRect(roadLeft, 0, roadWidth, height);

      context.fillStyle = '#f8fafc';
      context.fillRect(roadLeft + 3, 0, 3, height);
      context.fillRect(roadLeft + roadWidth - 6, 0, 3, height);

      const dashOffset = (elapsed * 0.24) % 84;
      context.fillStyle = 'rgba(255,255,255,0.72)';
      for (let lane = 1; lane < 3; lane += 1) {
        const x = roadLeft + laneWidth * lane - 2;
        for (let y = dashOffset - 84; y < height + 84; y += 84) {
          context.fillRect(x, y, 4, 42);
        }
      }

      for (const opponent of opponentsRef.current) {
        drawCar(
          context,
          roadLeft + laneWidth * (opponent.lane + 0.5),
          opponent.y * height,
          carWidth,
          carHeight,
          opponent.color,
        );
      }

      drawCar(
        context,
        playerCenterX,
        playerCenterY,
        carWidth,
        carHeight,
        '#22d3ee',
        true,
      );

      if (now - lastCollisionAtRef.current < 260) {
        context.fillStyle = 'rgba(244,63,94,0.25)';
        context.fillRect(0, 0, width, height);
      }

      animationFrameRef.current = requestAnimationFrame(drawFrame);
    };

    animationFrameRef.current = requestAnimationFrame(drawFrame);

    return () => {
      resizeObserver.disconnect();
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [difficulty, durationMs, finishGame, phase]);

  if (phase === 'running') {
    return (
      <main className='relative h-dvh overflow-hidden bg-slate-950 text-white'>
        <canvas
          ref={canvasRef}
          className='absolute inset-0 h-full w-full'
          aria-label={t('dividedAttention.labels.threeLaneHighwayDrivingArea')}
        />

        <div className='pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between bg-gradient-to-b from-slate-950/90 to-transparent px-3 pb-10 pt-3 sm:px-6 sm:pt-5'>
          <div>
            <p className='font-mono text-2xl font-black tabular-nums sm:text-3xl'>
              <Localized>{formatRemaining(remainingMs)}</Localized>
            </p>
            <p className='text-xs font-semibold uppercase tracking-wider text-slate-400'>
              <Localized id='common.settings.timeRemaining' />
            </p>
          </div>
          <div className='flex gap-3 text-right sm:gap-7'>
            <div>
              <p className='font-mono text-xl font-bold text-rose-300'>
                <Localized>{collisions}</Localized>
              </p>
              <p className='text-[10px] uppercase tracking-wider text-slate-400'>
                <Localized id='common.labels.collisions' />
              </p>
            </div>
            <div>
              <p className='font-mono text-xl font-bold text-cyan-300'>
                <Localized>{avoidedCars}</Localized>
              </p>
              <p className='text-[10px] uppercase tracking-wider text-slate-400'>
                <Localized id='common.labels.avoided' />
              </p>
            </div>
            <div>
              <p className='font-mono text-xl font-bold text-emerald-300'>
                <Localized>{signalsCompleted}</Localized>
                <Localized>{'/'}</Localized>
                <Localized>{signalCount}</Localized>
              </p>
              <p className='text-[10px] uppercase tracking-wider text-slate-400'>
                <Localized id='dividedAttention.labels.signals' />
              </p>
            </div>
          </div>
        </div>

        <TrafficLight
          side='left'
          active={activeSignal?.side === 'left'}
        />
        <TrafficLight
          side='right'
          active={activeSignal?.side === 'right'}
        />

        <div className='absolute inset-x-0 bottom-0 z-20 flex items-end justify-between bg-gradient-to-t from-slate-950/95 via-slate-950/65 to-transparent px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-12 sm:px-6 sm:pb-5'>
          <div>
            <p className='mb-2 text-center text-[10px] font-semibold uppercase tracking-wider text-slate-400'>
              <Localized id='dividedAttention.labels.steer' />
            </p>
            <div className='flex gap-2'>
              <button
                type='button'
                aria-label={t('dividedAttention.labels.steerLeft')}
                onPointerDown={() => steer(-1)}
                className='h-12 w-14 rounded-2xl border border-white/15 bg-slate-900/90 text-2xl font-black shadow-xl backdrop-blur active:bg-cyan-300 active:text-slate-950 sm:h-14 sm:w-16'
                style={{ touchAction: 'manipulation' }}
              >
                <Localized>{'←'}</Localized>
              </button>
              <button
                type='button'
                aria-label={t('dividedAttention.labels.steerRight')}
                onPointerDown={() => steer(1)}
                className='h-12 w-14 rounded-2xl border border-white/15 bg-slate-900/90 text-2xl font-black shadow-xl backdrop-blur active:bg-cyan-300 active:text-slate-950 sm:h-14 sm:w-16'
                style={{ touchAction: 'manipulation' }}
              >
                <Localized>{'→'}</Localized>
              </button>
            </div>
          </div>

          <div>
            <p className='mb-2 text-center text-[10px] font-semibold uppercase tracking-wider text-slate-400'>
              <Localized id='dividedAttention.labels.signals' />
            </p>
            <div className='flex gap-2'>
              <button
                type='button'
                aria-label={t(
                  'dividedAttention.labels.respondDownToLeftSignal',
                )}
                onPointerDown={() => respondToSignal('down')}
                className='h-12 w-14 rounded-2xl border border-white/15 bg-slate-900/90 text-2xl font-black shadow-xl backdrop-blur active:bg-violet-300 active:text-slate-950 sm:h-14 sm:w-16'
                style={{ touchAction: 'manipulation' }}
              >
                <Localized>{'↓'}</Localized>
              </button>
              <button
                type='button'
                aria-label={t('dividedAttention.labels.respondUpToRightSignal')}
                onPointerDown={() => respondToSignal('up')}
                className='h-12 w-14 rounded-2xl border border-white/15 bg-slate-900/90 text-2xl font-black shadow-xl backdrop-blur active:bg-violet-300 active:text-slate-950 sm:h-14 sm:w-16'
                style={{ touchAction: 'manipulation' }}
              >
                <Localized>{'↑'}</Localized>
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <TestPageShell accent='emerald'>
      <Localized>
        {phase === 'setup' ? (
          <TestSetupLayout
            accent='emerald'
            eyebrow='Divided attention'
            title={t('dividedAttention.labels.driveAndMonitor')}
            description={
              <p>
                <Localized id='dividedAttention.instructions.steerThroughAThreeLaneHighwayWhileMonitoringTwoTraffic' />
              </p>
            }
            actions={
              <>
                <button
                  type='button'
                  onClick={startGame}
                  className='min-h-14 rounded-full bg-emerald-300 px-8 font-bold text-slate-950 transition hover:bg-emerald-200 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-300'
                >
                  <Localized id='common.actions.startTest' />
                </button>
                <DividedAttentionDemo />
              </>
            }
          >
            <div className='space-y-4'>
              <TestPanel
                title={t('common.settings.title')}
                description='Set the session length, signals, and passing traffic.'
              >
                <div className='grid gap-3 sm:grid-cols-2'>
                  <label className='rounded-2xl border border-white/10 bg-white/[0.05] p-4'>
                    <span className='flex items-center justify-between text-sm font-semibold text-slate-200'>
                      <Localized id='dividedAttention.settings.testLength' />
                      <span className='font-mono text-emerald-300'>
                        <Localized>{durationMinutes}</Localized>{' '}
                        <Localized id='dividedAttention.labels.min' />
                      </span>
                    </span>
                    <input
                      type='range'
                      min={MIN_DURATION_MINUTES}
                      max={MAX_DURATION_MINUTES}
                      value={durationMinutes}
                      onChange={event => {
                        const nextDuration = Number(event.target.value);
                        setDurationMinutes(nextDuration);
                        setSignalCount(current =>
                          Math.min(
                            current,
                            maximumSignalsForDuration(nextDuration, difficulty),
                          ),
                        );
                      }}
                      className='mt-4 w-full accent-emerald-300'
                    />
                    <span className='mt-2 block text-xs text-slate-500'>
                      <Localized>{MIN_DURATION_MINUTES}</Localized>
                      <Localized>{'–'}</Localized>
                      <Localized>{MAX_DURATION_MINUTES}</Localized>{' '}
                      <Localized id='dividedAttention.labels.minutes' />
                    </span>
                  </label>

                  <label className='rounded-2xl border border-white/10 bg-white/[0.05] p-4'>
                    <span className='flex items-center justify-between text-sm font-semibold text-slate-200'>
                      <Localized id='dividedAttention.labels.numberOfSignals' />
                      <span className='font-mono text-emerald-300'>
                        <Localized>{signalCount}</Localized>
                      </span>
                    </span>
                    <ValidatedNumberInput
                      min={1}
                      max={maximumSignalCount}
                      value={signalCount}
                      normalize={Math.round}
                      onValueChange={setSignalCount}
                      className='mt-3 min-h-12 w-full rounded-xl border border-white/10 bg-slate-950 px-4 font-mono text-white outline-none focus:border-emerald-300'
                    />
                    <span className='mt-2 block text-xs text-slate-500'>
                      <Localized id='dividedAttention.labels.upTo' />{' '}
                      <Localized>{maximumSignalCount}</Localized>{' '}
                      <Localized id='dividedAttention.settings.atThisLength' />
                    </span>
                  </label>
                </div>

                <fieldset className='mt-4 rounded-2xl border border-white/10 bg-white/[0.05] p-4'>
                  <legend className='px-1 text-sm font-semibold text-slate-200'>
                    <Localized id='dividedAttention.settings.passingCarDifficulty' />
                  </legend>
                  <div className='mt-2 grid grid-cols-3 gap-2'>
                    <Localized>
                      {(['easy', 'medium', 'hard'] as Difficulty[]).map(
                        option => (
                          <button
                            key={option}
                            type='button'
                            aria-pressed={difficulty === option}
                            onClick={() => {
                              setDifficulty(option);
                              setSignalCount(current =>
                                Math.min(
                                  current,
                                  maximumSignalsForDuration(
                                    durationMinutes,
                                    option,
                                  ),
                                ),
                              );
                            }}
                            className={`min-h-11 rounded-xl border px-3 text-sm font-bold capitalize transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300 ${
                              difficulty === option
                                ? 'border-emerald-300 bg-emerald-300 text-slate-950'
                                : 'border-white/10 bg-slate-950 text-slate-300 hover:bg-slate-900'
                            }`}
                          >
                            <span className='block'>
                              <Localized>{option}</Localized>
                            </span>
                            <span className='mt-0.5 block font-mono text-[10px] opacity-65'>
                              <Localized>
                                {difficultySettings[option].signalTimeoutMs}
                              </Localized>
                              <Localized>{' ms'}</Localized>
                            </span>
                          </button>
                        ),
                      )}
                    </Localized>
                  </div>
                  <p className='mt-3 text-xs leading-5 text-slate-500'>
                    <Localized id='dividedAttention.instructions.difficultyChangesCarSpeedAndTrafficDensityTheTraffic' />
                  </p>
                </fieldset>
              </TestPanel>

              <TestPanel title={t('common.instructions.title')}>
                <InstructionList
                  accent='emerald'
                  items={[
                    {
                      title: 'Drive',
                      description:
                        'Use ← and → to change lanes and avoid cars.',
                    },
                    {
                      title: 'Watch',
                      description:
                        'Monitor both traffic lights while steering.',
                    },
                    {
                      title: 'Left signal',
                      description: 'When the left light turns red, press ↓.',
                    },
                    {
                      title: 'Right signal',
                      description: 'When the right light turns red, press ↑.',
                    },
                  ]}
                />
                <p className='mt-5 text-xs leading-5 text-slate-500'>
                  <Localized id='dividedAttention.labels.touchControlsAppearOnTabletsAndPhonesTheLights' />
                  <Localized> </Localized>
                  <Localized>{signalCount}</Localized>{' '}
                  <Localized id='dividedAttention.labels.timesInTotal' />
                </p>
              </TestPanel>
            </div>
          </TestSetupLayout>
        ) : (
          <section className='py-8 sm:py-14'>
            <div className='flex flex-col justify-between gap-8 sm:flex-row sm:items-end'>
              <div>
                <p className='font-mono text-sm font-semibold uppercase tracking-[0.3em] text-emerald-300'>
                  <Localized id='common.results.sessionComplete' />
                </p>
                <h1 className='mt-4 text-4xl font-black tracking-tight sm:text-6xl'>
                  <Localized id='dividedAttention.results.dividedAttentionResults' />
                </h1>
              </div>
              <div className='flex flex-wrap gap-3 self-start sm:self-auto'>
                <button
                  type='button'
                  onClick={returnToSetupRoute}
                  className='min-h-12 rounded-full border border-white/15 px-6 font-bold text-white transition hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-300'
                >
                  <Localized id='common.settings.changeSettings' />
                </button>
                <button
                  type='button'
                  onClick={startGame}
                  className='min-h-12 rounded-full bg-emerald-300 px-6 font-bold text-slate-950 transition hover:bg-emerald-200 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-300'
                >
                  <Localized id='common.actions.repeatTest' />
                </button>
              </div>
            </div>

            <Localized>
              {lastSession && (
                <>
                  <div className='mt-10 grid gap-4 sm:grid-cols-3'>
                    <div className='rounded-3xl border border-emerald-300/20 bg-emerald-300/10 p-6 sm:col-span-2'>
                      <p className='text-sm font-semibold uppercase tracking-wider text-emerald-200/70'>
                        <Localized id='dividedAttention.results.averageSignalReaction' />
                      </p>
                      <p className='mt-3 font-mono text-5xl font-black text-emerald-300 sm:text-7xl'>
                        <Localized>
                          {lastSession.averageReactionTime ?? '—'}
                        </Localized>
                        <Localized>
                          {lastSession.averageReactionTime !== null && (
                            <span className='ml-2 text-2xl text-emerald-200/60'>
                              <Localized>{'ms'}</Localized>
                            </span>
                          )}
                        </Localized>
                      </p>
                    </div>
                    <div className='rounded-3xl border border-white/10 bg-white/[0.05] p-6'>
                      <p className='text-sm font-semibold uppercase tracking-wider text-slate-500'>
                        <Localized id='dividedAttention.labels.driving' />
                      </p>
                      <p className='mt-4 font-mono text-3xl font-bold text-white'>
                        <Localized>{lastSession.collisions}</Localized>
                      </p>
                      <p className='text-sm text-slate-500'>
                        <Localized id='dividedAttention.labels.collisions' />
                      </p>
                      <p className='mt-3 font-mono text-lg text-emerald-300'>
                        <Localized>{lastSession.avoidedCars}</Localized>{' '}
                        <Localized id='dividedAttention.labels.carsAvoided' />
                      </p>
                      <p className='mt-3 text-xs capitalize leading-5 text-slate-500'>
                        <Localized>
                          {lastSession.settings?.durationMinutes ??
                            Math.round(lastSession.durationMs / 60_000)}{' '}
                        </Localized>
                        <Localized id='dividedAttention.labels.minDetail' />{' '}
                        <Localized>
                          {lastSession.signalResults.length}
                        </Localized>{' '}
                        <Localized id='dividedAttention.labels.signalsDetail' />
                        <Localized> </Localized>
                        <Localized>
                          {lastSession.settings?.difficulty ?? 'medium'}
                        </Localized>
                      </p>
                    </div>
                  </div>

                  <div className='mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5'>
                    <Localized>
                      {lastSession.signalResults.map((result, index) => (
                        <div
                          key={index}
                          className='rounded-2xl border border-white/10 bg-white/[0.04] p-4'
                        >
                          <p className='text-xs font-semibold uppercase tracking-wider text-slate-500'>
                            <Localized id='dividedAttention.labels.signal' />{' '}
                            <Localized>{index + 1}</Localized>
                          </p>
                          <p className='mt-2 text-sm font-semibold capitalize text-slate-300'>
                            <Localized>{result.side}</Localized>
                            <Localized>{' ·'}</Localized>
                            <Localized> </Localized>
                            <Localized>
                              {result.expectedDirection === 'down' ? '↓' : '↑'}
                            </Localized>
                          </p>
                          <p className='mt-2 font-mono text-lg font-bold text-emerald-300'>
                            <Localized>
                              {result.reactionTime === null
                                ? 'Missed'
                                : `${result.reactionTime} ms`}
                            </Localized>
                          </p>
                        </div>
                      ))}
                    </Localized>
                  </div>
                </>
              )}
            </Localized>
          </section>
        )}
      </Localized>

      <section className='border-t border-white/10 py-12 sm:py-16'>
        <div className='mb-7 flex items-end justify-between gap-6'>
          <div>
            <p className='text-sm font-semibold uppercase tracking-[0.2em] text-slate-500'>
              <Localized id='common.results.savedOnThisDevice' />
            </p>
            <h2 className='mt-2 text-2xl font-bold'>
              <Localized id='dividedAttention.results.dividedAttentionHistory' />
            </h2>
          </div>
          <Localized>
            {history.length > 0 && (
              <p className='font-mono text-sm text-slate-500'>
                <Localized>{history.length}</Localized>{' '}
                <Localized>
                  {history.length === 1 ? 'session' : 'sessions'}
                </Localized>
              </p>
            )}
          </Localized>
        </div>
        <SessionHistory sessions={history} />
        <p className='mt-8 max-w-2xl text-sm leading-6 text-slate-600'>
          <Localized id='dividedAttention.instructions.thisIsAPracticeToolNotAClinicalAssessment' />
        </p>
      </section>
    </TestPageShell>
  );
}
