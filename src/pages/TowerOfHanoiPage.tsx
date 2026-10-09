import {
  LocalizedDate,
  Localized,
  useTextTranslation,
} from '../components/Localization';
import { useCallback, useEffect, useRef, useState } from 'react';
import { HanoiBoard, createHanoiPegs } from '../components/HanoiBoard';
import { HanoiSpeedGraph } from '../components/HanoiSpeedGraph';
import { TowerOfHanoiDemo } from '../components/TestDemos';
import { ValidatedNumberInput } from '../components/ValidatedNumberInput';
import {
  InstructionList,
  TestPageShell,
  TestPanel,
  TestSetupLayout,
} from '../components/TestPage';
import { useTestRoute } from '../hooks/useTestRoute';
import { createLocalId } from '../lib/create-local-id';

const STORAGE_KEY = 'psy-tower-of-hanoi-sessions';
const DEFAULT_HEIGHT = 7;
const MIN_HEIGHT = 3;
const MAX_HEIGHT = 10;

type Phase = 'setup' | 'running' | 'complete';

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
    ? `${minutes}:${String(seconds).padStart(2, '0')}`
    : `${seconds}s`;
}

function isStoredSession(value: unknown): value is HanoiSession {
  if (!value || typeof value !== 'object') return false;
  const session = value as Partial<HanoiSession>;
  return (
    typeof session.id === 'string' &&
    typeof session.completedAt === 'string' &&
    typeof session.durationMs === 'number' &&
    typeof session.optimalMoves === 'number' &&
    typeof session.efficiency === 'number' &&
    typeof session.averageSpeed === 'number' &&
    Array.isArray(session.moves) &&
    session.moves.length > 0 &&
    !!session.settings &&
    typeof session.settings.height === 'number'
  );
}

function HanoiHistory({ sessions }: { sessions: HanoiSession[] }) {
  if (sessions.length === 0) {
    return (
      <div className='rounded-3xl border border-dashed border-white/15 px-6 py-10 text-center'>
        <p className='font-medium text-slate-300'>
          <Localized id='towerOfHanoi.labels.yourCompletedHanoiSessionsWillAppearHere' />
        </p>
        <p className='mt-2 text-sm text-slate-500'>
          <Localized id='towerOfHanoi.results.movesSpeedAndSettingsAreSavedOnlyInThis' />
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
                  <Localized id='common.settings.height' />{' '}
                  <Localized>{session.settings.height}</Localized>
                  <Localized>{' · '}</Localized>
                  <Localized>{session.moves.length}</Localized>{' '}
                  <Localized id='common.results.movesDetail' />{' '}
                  <Localized>{formatDuration(session.durationMs)}</Localized>
                </p>
              </div>
              <div className='flex items-center gap-4'>
                <div className='text-right'>
                  <p className='font-mono text-xl font-semibold text-cyan-300'>
                    <Localized>{session.efficiency}</Localized>
                    <Localized>{'%'}</Localized>
                  </p>
                  <p className='text-xs uppercase tracking-wider text-slate-500'>
                    <Localized id='towerOfHanoi.labels.efficiency' />
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
            <div className='space-y-4 border-t border-white/10 px-5 py-4'>
              <div className='grid grid-cols-2 gap-3 sm:grid-cols-4'>
                <Localized>
                  {[
                    ['Steps', String(session.moves.length)],
                    ['Optimal', String(session.optimalMoves)],
                    ['Duration', formatDuration(session.durationMs)],
                    ['Average speed', `${session.averageSpeed} moves/min`],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className='rounded-xl bg-slate-950/60 p-4'
                    >
                      <p className='text-xs uppercase tracking-wider text-slate-500'>
                        <Localized>{label}</Localized>
                      </p>
                      <p className='mt-2 font-mono text-lg font-bold text-white'>
                        <Localized>{value}</Localized>
                      </p>
                    </div>
                  ))}
                </Localized>
              </div>
              <HanoiSpeedGraph
                moves={session.moves}
                compact
              />
            </div>
          </details>
        ))}
      </Localized>
    </div>
  );
}

export default function TowerOfHanoiPage() {
  const t = useTextTranslation();

  const [phase, setPhase] = useState<Phase>('setup');
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
    setPhase('setup');
  }, [height]);

  const { beginTestRoute, completeTestRoute, returnToSetupRoute } =
    useTestRoute({
      basePath: '/tower-of-hanoi',
      view:
        phase === 'setup' ? 'setup' : phase === 'complete' ? 'result' : 'test',
      onReturnToSetup: returnToSetup,
    });

  useEffect(() => {
    const hydrationTimer = window.setTimeout(() => {
      try {
        const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
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
    beginTestRoute(phase === 'complete');
    setPegs(createHanoiPegs(height));
    setSelectedPeg(null);
    setInvalidPeg(null);
    setMoves([]);
    setLastSession(null);
    startedAtRef.current = performance.now();
    setPhase('running');
  }, [beginTestRoute, height, phase]);

  const showInvalidMove = useCallback((pegIndex: number) => {
    if (invalidTimerRef.current) clearTimeout(invalidTimerRef.current);
    setInvalidPeg(pegIndex);
    invalidTimerRef.current = setTimeout(() => setInvalidPeg(null), 650);
  }, []);

  const moveDisk = useCallback(
    (sourcePeg: number, destinationPeg: number) => {
      if (phase !== 'running') return;
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

      const nextPegs = pegs.map(peg => [...peg]);
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
      setHistory(currentHistory => {
        const updatedHistory = [session, ...currentHistory].slice(0, 50);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedHistory));
        return updatedHistory;
      });
      setPhase('complete');
      completeTestRoute();
    },
    [completeTestRoute, height, moves, pegs, phase, showInvalidMove],
  );

  const selectSource = useCallback(
    (pegIndex: number) => {
      if (phase !== 'running' || pegs[pegIndex].length === 0) return;
      setSelectedPeg(current => (current === pegIndex ? null : pegIndex));
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

  if (phase === 'running') {
    return (
      <main className='flex h-dvh flex-col overflow-hidden bg-slate-950 px-3 py-3 text-white sm:px-8 sm:py-5'>
        <header className='flex shrink-0 items-center justify-between gap-5'>
          <div>
            <p className='font-mono text-sm font-semibold uppercase tracking-[0.2em] text-cyan-300'>
              <Localized id='common.settings.towerOfHanoiHeight' />{' '}
              <Localized>{height}</Localized>
            </p>
            <p
              aria-live='polite'
              className='mt-1 text-xs text-slate-400 sm:text-sm'
            >
              <Localized>
                {selectedPeg === null
                  ? 'Drag a top disk, or tap one to select it'
                  : `Source selected: ${['left', 'middle', 'right'][selectedPeg]} peg — choose a destination`}
              </Localized>
            </p>
          </div>
          <div className='text-right'>
            <p className='font-mono text-2xl font-black text-white'>
              <Localized>{moves.length}</Localized>
            </p>
            <p className='text-[10px] uppercase tracking-wider text-slate-500'>
              <Localized id='common.results.stepsOptimal' />{' '}
              <Localized>{2 ** height - 1}</Localized>
            </p>
          </div>
        </header>

        <section className='flex min-h-0 flex-1 items-center justify-center py-3 sm:py-5'>
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

        <footer className='shrink-0 pb-[max(0rem,env(safe-area-inset-bottom))] text-center text-xs leading-5 text-slate-500'>
          <Localized id='towerOfHanoi.labels.moveTheEntireTowerToTheRightPegA' />
        </footer>
      </main>
    );
  }

  return (
    <TestPageShell accent='cyan'>
      <Localized>
        {phase === 'setup' ? (
          <TestSetupLayout
            accent='cyan'
            eyebrow='Tower of Hanoi'
            title={t('towerOfHanoi.labels.planAheadMoveWithPurpose')}
            description={
              <p>
                <Localized id='towerOfHanoi.instructions.transferTheFullTowerFromTheLeftPegTo' />
              </p>
            }
            actions={
              <>
                <button
                  type='button'
                  onClick={startSession}
                  className='min-h-14 rounded-full bg-cyan-300 px-8 font-bold text-slate-950 transition hover:bg-cyan-200 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-300'
                >
                  <Localized id='common.actions.startTest' />
                </button>
                <TowerOfHanoiDemo />
              </>
            }
          >
            <div className='space-y-4'>
              <TestPanel
                title={t('common.settings.title')}
                description='Choose how many disks the tower contains.'
              >
                <label className='block max-w-md'>
                  <span className='flex items-center justify-between text-sm font-semibold text-slate-300'>
                    <Localized id='towerOfHanoi.settings.towerHeight' />
                    <span className='font-mono text-cyan-300'>
                      <Localized>{height}</Localized>
                    </span>
                  </span>
                  <ValidatedNumberInput
                    min={MIN_HEIGHT}
                    max={MAX_HEIGHT}
                    value={height}
                    normalize={Math.round}
                    onValueChange={setHeight}
                    className='mt-3 min-h-12 w-full rounded-xl border border-white/10 bg-slate-950 px-4 font-mono text-white outline-none focus:border-cyan-300'
                  />
                  <span className='mt-2 block text-xs text-slate-500'>
                    <Localized id='common.labels.default' />{' '}
                    <Localized>{DEFAULT_HEIGHT}</Localized>{' '}
                    <Localized id='common.results.optimalSolution' />
                    <Localized> </Localized>
                    <Localized>{2 ** height - 1}</Localized>{' '}
                    <Localized id='common.results.moves' />
                  </span>
                </label>
              </TestPanel>

              <TestPanel title={t('common.instructions.title')}>
                <InstructionList
                  accent='cyan'
                  items={[
                    {
                      title: 'Choose a disk',
                      description:
                        'Drag the top disk of a peg, or tap it to select it.',
                    },
                    {
                      title: 'Choose its destination',
                      description:
                        'Drop the disk or tap the peg where it should move.',
                    },
                    {
                      title: 'Follow the size rule',
                      description:
                        'Never place a larger disk on top of a smaller one.',
                    },
                    {
                      title: 'Complete the tower',
                      description:
                        'Move every disk to the right peg in as few moves as possible.',
                    },
                  ]}
                />
              </TestPanel>
            </div>
          </TestSetupLayout>
        ) : (
          <section className='py-8 sm:py-14'>
            <div className='flex flex-col justify-between gap-8 sm:flex-row sm:items-end'>
              <div>
                <p className='font-mono text-sm font-semibold uppercase tracking-[0.3em] text-cyan-300'>
                  <Localized id='towerOfHanoi.labels.towerComplete' />
                </p>
                <h1 className='mt-4 text-4xl font-black tracking-tight sm:text-6xl'>
                  <Localized id='towerOfHanoi.results.hanoiResults' />
                </h1>
              </div>
              <div className='flex flex-wrap gap-3 self-start sm:self-auto'>
                <button
                  type='button'
                  onClick={returnToSetupRoute}
                  className='min-h-12 rounded-full border border-white/15 px-6 font-bold text-white transition hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-300'
                >
                  <Localized id='common.settings.changeSettings' />
                </button>
                <button
                  type='button'
                  onClick={startSession}
                  className='min-h-12 rounded-full bg-cyan-300 px-6 font-bold text-slate-950 transition hover:bg-cyan-200 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-300'
                >
                  <Localized id='common.actions.repeatTest' />
                </button>
              </div>
            </div>

            <Localized>
              {lastSession && (
                <>
                  <div className='mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5'>
                    <Localized>
                      {[
                        [
                          'Steps',
                          String(lastSession.moves.length),
                          'text-cyan-300',
                        ],
                        [
                          'Optimal',
                          String(lastSession.optimalMoves),
                          'text-emerald-300',
                        ],
                        [
                          'Extra moves',
                          String(
                            lastSession.moves.length - lastSession.optimalMoves,
                          ),
                          'text-amber-300',
                        ],
                        [
                          'Duration',
                          formatDuration(lastSession.durationMs),
                          'text-white',
                        ],
                        [
                          'Average speed',
                          `${lastSession.averageSpeed}/min`,
                          'text-violet-300',
                        ],
                      ].map(([label, value, color]) => (
                        <div
                          key={label}
                          className='rounded-3xl border border-white/10 bg-white/[0.05] p-6'
                        >
                          <p className='text-xs font-semibold uppercase tracking-wider text-slate-500'>
                            <Localized>{label}</Localized>
                          </p>
                          <p
                            className={`mt-3 font-mono text-3xl font-black ${color}`}
                          >
                            <Localized>{value}</Localized>
                          </p>
                        </div>
                      ))}
                    </Localized>
                  </div>

                  <div className='mt-6 rounded-3xl border border-white/10 bg-white/[0.04] p-4 sm:p-6'>
                    <div className='mb-4'>
                      <p className='text-sm font-semibold uppercase tracking-[0.2em] text-slate-500'>
                        <Localized id='towerOfHanoi.labels.performanceOverTime' />
                      </p>
                      <h2 className='mt-2 text-2xl font-bold'>
                        <Localized id='towerOfHanoi.labels.moveSpeed' />
                      </h2>
                      <p className='mt-1 text-sm text-slate-400'>
                        <Localized id='towerOfHanoi.labels.cumulativeMovesPerMinuteHoverOrTouchTheGraph' />
                      </p>
                    </div>
                    <HanoiSpeedGraph moves={lastSession.moves} />
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
              <Localized id='towerOfHanoi.results.hanoiHistory' />
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
        <HanoiHistory sessions={history} />
        <p className='mt-8 max-w-2xl text-sm leading-6 text-slate-600'>
          <Localized id='towerOfHanoi.instructions.thisIsAPracticeToolNotAClinicalAssessment' />
        </p>
      </section>
    </TestPageShell>
  );
}
