import {
  LocalizedDate,
  Localized,
  useTextTranslation,
} from '../components/Localization';
import { useCallback, useEffect, useRef, useState } from 'react';
import { MemoryCell } from '../components/MemoryCell';
import type { MemoryCellStatus } from '../components/MemoryCell';
import { ShortTermMemoryDemo } from '../components/TestDemos';
import { ValidatedNumberInput } from '../components/ValidatedNumberInput';
import {
  InstructionList,
  TestPageShell,
  TestPanel,
  TestSetupLayout,
} from '../components/TestPage';
import { createLocalId } from '../lib/create-local-id';
import { useTestRoute } from '../hooks/useTestRoute';

const DEFAULT_ROUND_COUNT = 10;
const MIN_ROUND_COUNT = 1;
const MAX_ROUND_COUNT = 50;
const STORAGE_KEY = 'psy-short-term-memory-sessions';

type Phase = 'setup' | 'ready' | 'flash' | 'select' | 'complete';

type RoundResult = {
  targetCells: number[];
  selectedCells: number[];
  correct: number;
  accuracy: number;
};

type MemorySession = {
  id: string;
  completedAt: string;
  settings: {
    gridSize: number;
    cellsPerRound: number;
    flashDuration: number;
    roundCount?: number;
  };
  rounds: RoundResult[];
  accuracy: number;
};

function randomCells(cellCount: number, amount: number) {
  const cells = Array.from({ length: cellCount }, (_, index) => index);

  for (let index = cells.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [cells[index], cells[randomIndex]] = [cells[randomIndex], cells[index]];
  }

  return cells.slice(0, amount).sort((a, b) => a - b);
}

function calculateAccuracy(rounds: RoundResult[]) {
  if (rounds.length === 0) return 0;

  const totalAccuracy = rounds.reduce(
    (total, round) => total + round.accuracy,
    0,
  );
  return Math.round((totalAccuracy / rounds.length) * 10) / 10;
}

function isStoredSession(value: unknown): value is MemorySession {
  if (!value || typeof value !== 'object') return false;

  const session = value as Partial<MemorySession>;
  return (
    typeof session.id === 'string' &&
    typeof session.completedAt === 'string' &&
    typeof session.accuracy === 'number' &&
    Array.isArray(session.rounds) &&
    session.rounds.length > 0 &&
    !!session.settings &&
    typeof session.settings.gridSize === 'number' &&
    typeof session.settings.cellsPerRound === 'number' &&
    typeof session.settings.flashDuration === 'number'
  );
}

function MemoryHistory({ sessions }: { sessions: MemorySession[] }) {
  if (sessions.length === 0) {
    return (
      <div className='rounded-3xl border border-dashed border-white/15 px-6 py-10 text-center'>
        <p className='font-medium text-slate-300'>
          <Localized id='shortTermMemory.labels.yourCompletedMemorySessionsWillAppearHere' />
        </p>
        <p className='mt-2 text-sm text-slate-500'>
          <Localized id='common.results.resultsAndSettingsAreSavedOnlyInThisBrowser' />
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
                  <Localized>{session.settings.gridSize}</Localized>
                  <Localized>{'×'}</Localized>
                  <Localized>{session.settings.gridSize}</Localized>{' '}
                  <Localized id='common.labels.grid' />
                  <Localized> </Localized>
                  <Localized>{session.settings.cellsPerRound}</Localized>{' '}
                  <Localized id='common.labels.cells' />
                  <Localized> </Localized>
                  <Localized>{session.settings.flashDuration}</Localized>{' '}
                  <Localized id='shortTermMemory.labels.ms' />{' '}
                  <Localized>{session.rounds.length} </Localized>
                  <Localized id='reactionTime.labels.rounds' />
                </p>
              </div>
              <div className='flex items-center gap-4'>
                <div className='text-right'>
                  <p className='font-mono text-xl font-semibold text-violet-300'>
                    <Localized>{session.accuracy}</Localized>
                    <Localized>{'%'}</Localized>
                  </p>
                  <p className='text-xs uppercase tracking-wider text-slate-500'>
                    <Localized id='common.results.accuracy' />
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
              <div className='grid gap-2 sm:grid-cols-2'>
                <Localized>
                  {session.rounds.map((round, index) => (
                    <div
                      key={`${session.id}-${index}`}
                      className='rounded-xl bg-slate-950/60 px-4 py-3'
                    >
                      <div className='flex items-center justify-between'>
                        <p className='text-xs font-semibold uppercase tracking-wider text-slate-500'>
                          <Localized id='common.labels.round' />{' '}
                          <Localized>{index + 1}</Localized>
                        </p>
                        <p className='font-mono text-sm font-semibold text-violet-300'>
                          <Localized>{round.accuracy}</Localized>
                          <Localized>{'%'}</Localized>
                        </p>
                      </div>
                      <p className='mt-3 text-xs leading-5 text-slate-400'>
                        <span className='text-slate-600'>
                          <Localized id='shortTermMemory.labels.flashed' />
                        </span>
                        <Localized> </Localized>
                        <Localized>
                          {round.targetCells
                            .map(cell => String(cell + 1).padStart(2, '0'))
                            .join(', ')}
                        </Localized>
                      </p>
                      <p className='text-xs leading-5 text-slate-400'>
                        <span className='text-slate-600'>
                          <Localized id='shortTermMemory.labels.selected' />
                        </span>
                        <Localized> </Localized>
                        <Localized>
                          {round.selectedCells
                            .map(cell => String(cell + 1).padStart(2, '0'))
                            .join(', ') || 'None'}
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

export default function ShortTermMemoryPage() {
  const t = useTextTranslation();

  const [phase, setPhase] = useState<Phase>('setup');
  const [gridSize, setGridSize] = useState(4);
  const [cellsPerRound, setCellsPerRound] = useState(5);
  const [flashDuration, setFlashDuration] = useState(100);
  const [roundCount, setRoundCount] = useState(DEFAULT_ROUND_COUNT);
  const [roundIndex, setRoundIndex] = useState(0);
  const [targetCells, setTargetCells] = useState<number[]>([]);
  const [selectedCells, setSelectedCells] = useState<number[]>([]);
  const [rounds, setRounds] = useState<RoundResult[]>([]);
  const [history, setHistory] = useState<MemorySession[]>([]);
  const phaseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const returnToSetup = useCallback(() => {
    if (phaseTimer.current) clearTimeout(phaseTimer.current);
    setRoundIndex(0);
    setTargetCells([]);
    setSelectedCells([]);
    setRounds([]);
    setPhase('setup');
  }, []);
  const { beginTestRoute, completeTestRoute, returnToSetupRoute } =
    useTestRoute({
      basePath: '/short-term-memory',
      view:
        phase === 'setup' ? 'setup' : phase === 'complete' ? 'result' : 'test',
      onReturnToSetup: returnToSetup,
    });

  const cellCount = gridSize * gridSize;

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

  useEffect(
    () => () => {
      if (phaseTimer.current) clearTimeout(phaseTimer.current);
    },
    [],
  );

  const prepareRound = useCallback(() => {
    if (phaseTimer.current) clearTimeout(phaseTimer.current);

    setSelectedCells([]);
    setTargetCells(randomCells(gridSize * gridSize, cellsPerRound));
    setPhase('ready');

    phaseTimer.current = setTimeout(() => {
      setPhase('flash');
      phaseTimer.current = setTimeout(() => {
        setPhase('select');
      }, flashDuration);
    }, 800);
  }, [cellsPerRound, flashDuration, gridSize]);

  const startSession = useCallback(() => {
    beginTestRoute(phase === 'complete');
    setRounds([]);
    setRoundIndex(0);
    prepareRound();
  }, [beginTestRoute, phase, prepareRound]);

  const toggleCell = (cell: number) => {
    if (phase !== 'select') return;

    setSelectedCells(current => {
      if (current.includes(cell)) {
        return current.filter(selected => selected !== cell);
      }
      return [...current, cell].sort((a, b) => a - b);
    });
  };

  const saveSession = (completedRounds: RoundResult[]) => {
    const session: MemorySession = {
      id: createLocalId(),
      completedAt: new Date().toISOString(),
      settings: {
        gridSize,
        cellsPerRound,
        flashDuration,
        roundCount,
      },
      rounds: completedRounds,
      accuracy: calculateAccuracy(completedRounds),
    };

    setHistory(currentHistory => {
      const updatedHistory = [session, ...currentHistory].slice(0, 100);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedHistory));
      return updatedHistory;
    });
  };

  const submitRound = () => {
    if (phase !== 'select') return;

    const correct = selectedCells.filter(cell =>
      targetCells.includes(cell),
    ).length;
    const unionSize = new Set([...targetCells, ...selectedCells]).size;
    const result: RoundResult = {
      targetCells,
      selectedCells,
      correct,
      accuracy: Math.round((correct / unionSize) * 100),
    };
    const completedRounds = [...rounds, result];

    setRounds(completedRounds);

    if (completedRounds.length === roundCount) {
      saveSession(completedRounds);
      setPhase('complete');
      completeTestRoute();
      return;
    }

    setRoundIndex(completedRounds.length);
    prepareRound();
  };

  const updateGridSize = (value: number) => {
    const nextSize = Math.max(2, Math.min(8, value));
    setGridSize(nextSize);
    setCellsPerRound(current => Math.min(current, nextSize * nextSize));
  };

  const getCellStatus = (cell: number): MemoryCellStatus => {
    if (phase === 'flash' && targetCells.includes(cell)) return 'flashed';
    if (phase === 'select' && selectedCells.includes(cell)) return 'selected';
    return 'neutral';
  };

  const isActive = phase === 'ready' || phase === 'flash' || phase === 'select';
  const overallAccuracy = calculateAccuracy(rounds);

  if (isActive) {
    return (
      <main className='h-dvh overflow-hidden bg-slate-950 px-3 py-3 text-white sm:px-6 sm:py-4'>
        <div className='mx-auto flex h-full max-w-5xl flex-col'>
          <header className='flex shrink-0 items-center justify-between gap-5'>
            <div>
              <p className='font-mono text-sm font-semibold uppercase tracking-[0.2em] text-violet-300'>
                <Localized id='common.labels.round' />{' '}
                <Localized>{roundIndex + 1}</Localized>{' '}
                <Localized id='distributiveAttention.labels.of' />{' '}
                <Localized>{roundCount}</Localized>
              </p>
              <p
                aria-live='polite'
                className='mt-1 text-sm text-slate-400'
              >
                <Localized>{phase === 'ready' && 'Get ready…'}</Localized>
                <Localized>
                  {phase === 'flash' && 'Remember these cells'}
                </Localized>
                <Localized>
                  {phase === 'select' &&
                    `Select any number of cells (${selectedCells.length} selected)`}
                </Localized>
              </p>
            </div>
            <div className='text-right'>
              <p className='font-mono text-sm font-semibold text-slate-300'>
                <Localized>{gridSize}</Localized>
                <Localized>{'×'}</Localized>
                <Localized>{gridSize}</Localized>
              </p>
              <p className='text-xs text-slate-600'>
                <Localized>{flashDuration}</Localized>{' '}
                <Localized id='common.labels.msFlash' />
              </p>
            </div>
          </header>

          <div className='mt-3 h-1.5 shrink-0 overflow-hidden rounded-full bg-white/5'>
            <div
              className='h-full rounded-full bg-violet-300'
              style={{
                width: `${(roundIndex / roundCount) * 100}%`,
              }}
            />
          </div>

          <section className='flex min-h-0 flex-1 items-center justify-center overflow-hidden py-2 sm:py-3'>
            <div
              className='grid max-w-[44rem] flex-none gap-1.5 sm:gap-2.5'
              style={{
                width: 'min(100%, max(8rem, calc(100dvh - 13rem)), 44rem)',
                gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`,
              }}
            >
              <Localized>
                {Array.from({ length: cellCount }, (_, cell) => (
                  <MemoryCell
                    key={cell}
                    index={cell}
                    status={getCellStatus(cell)}
                    disabled={phase !== 'select'}
                    onSelect={() => toggleCell(cell)}
                  />
                ))}
              </Localized>
            </div>
          </section>

          <footer className='min-h-14 shrink-0'>
            <button
              type='button'
              disabled={phase !== 'select'}
              onClick={submitRound}
              className='flex min-h-14 w-full items-center justify-between rounded-full bg-violet-300 px-8 font-bold text-slate-950 transition hover:bg-violet-200 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-violet-300 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500'
            >
              <span>
                <Localized>{phase === 'ready' && 'Get ready'}</Localized>
                <Localized>
                  {phase === 'flash' && 'Remember the pattern'}
                </Localized>
                <Localized>
                  {phase === 'select' &&
                    (roundIndex + 1 === roundCount
                      ? 'Finish session'
                      : 'Next round')}
                </Localized>
              </span>
              <span
                aria-hidden='true'
                className='text-xl'
              >
                <Localized>{'→'}</Localized>
              </span>
            </button>
          </footer>
        </div>
      </main>
    );
  }

  return (
    <TestPageShell accent='violet'>
      <Localized>
        {phase === 'setup' ? (
          <TestSetupLayout
            accent='violet'
            eyebrow='Short-term memory'
            title={t('shortTermMemory.labels.rememberThePatternDetail')}
            description={
              <p>
                <Localized id='shortTermMemory.instructions.watchTheSevenSegmentGridRememberWhichCellsFlashThen' />
              </p>
            }
            actions={
              <>
                <button
                  type='button'
                  onClick={startSession}
                  className='min-h-14 rounded-full bg-violet-300 px-8 font-bold text-slate-950 transition hover:bg-violet-200 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-violet-300'
                >
                  <Localized id='common.actions.startTest' />
                </button>
                <ShortTermMemoryDemo />
              </>
            }
          >
            <div className='space-y-4'>
              <TestPanel
                title={t('common.settings.title')}
                description='Configure the grid, flash, and session length.'
              >
                <div className='grid gap-6 sm:grid-cols-2'>
                  <label className='block'>
                    <span className='flex items-center justify-between text-sm font-semibold text-slate-300'>
                      <Localized id='common.labels.numberOfRounds' />
                      <span className='font-mono text-violet-300'>
                        <Localized>{roundCount}</Localized>
                      </span>
                    </span>
                    <ValidatedNumberInput
                      min={MIN_ROUND_COUNT}
                      max={MAX_ROUND_COUNT}
                      value={roundCount}
                      normalize={Math.round}
                      onValueChange={setRoundCount}
                      className='mt-3 min-h-12 w-full rounded-xl border border-white/10 bg-slate-950 px-4 font-mono text-white outline-none focus:border-violet-300'
                    />
                  </label>

                  <label className='block'>
                    <span className='flex items-center justify-between text-sm font-semibold text-slate-300'>
                      <Localized id='shortTermMemory.settings.gridSize' />
                      <span className='font-mono text-violet-300'>
                        <Localized>{gridSize}</Localized>
                        <Localized>{'×'}</Localized>
                        <Localized>{gridSize}</Localized>
                      </span>
                    </span>
                    <input
                      type='range'
                      min='2'
                      max='8'
                      value={gridSize}
                      onChange={event =>
                        updateGridSize(Number(event.target.value))
                      }
                      className='mt-3 w-full accent-violet-300'
                    />
                    <span className='mt-2 block text-xs text-slate-500'>
                      <Localized id='shortTermMemory.labels.22To88' />
                    </span>
                  </label>

                  <label className='block'>
                    <span className='flex items-center justify-between text-sm font-semibold text-slate-300'>
                      <Localized id='shortTermMemory.labels.cellsFlashedPerRound' />
                      <span className='font-mono text-violet-300'>
                        <Localized>{cellsPerRound}</Localized>
                      </span>
                    </span>
                    <ValidatedNumberInput
                      min={1}
                      max={cellCount}
                      value={cellsPerRound}
                      normalize={Math.round}
                      onValueChange={setCellsPerRound}
                      className='mt-3 min-h-12 w-full rounded-xl border border-white/10 bg-slate-950 px-4 font-mono text-white outline-none focus:border-violet-300'
                    />
                  </label>

                  <label className='block'>
                    <span className='flex items-center justify-between text-sm font-semibold text-slate-300'>
                      <Localized id='shortTermMemory.settings.flashDuration' />
                      <span className='font-mono text-violet-300'>
                        <Localized>{flashDuration}</Localized>
                        <Localized>{' ms'}</Localized>
                      </span>
                    </span>
                    <ValidatedNumberInput
                      min={50}
                      max={5000}
                      step='50'
                      value={flashDuration}
                      normalize={Math.round}
                      onValueChange={setFlashDuration}
                      className='mt-3 min-h-12 w-full rounded-xl border border-white/10 bg-slate-950 px-4 font-mono text-white outline-none focus:border-violet-300'
                    />
                  </label>
                </div>
              </TestPanel>

              <TestPanel title={t('common.instructions.title')}>
                <InstructionList
                  accent='violet'
                  items={[
                    {
                      title: 'Watch',
                      description: 'Keep your attention on the whole grid.',
                    },
                    {
                      title: 'Remember',
                      description: 'Memorize every display that flashes.',
                    },
                    {
                      title: 'Select',
                      description:
                        'Tap every cell you remember; tap again to undo.',
                    },
                    {
                      title: 'Continue',
                      description:
                        'Press Next round when your selection is complete.',
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
                <p className='font-mono text-sm font-semibold uppercase tracking-[0.3em] text-violet-300'>
                  <Localized id='common.results.sessionComplete' />
                </p>
                <h1 className='mt-4 text-4xl font-black tracking-tight sm:text-6xl'>
                  <Localized id='shortTermMemory.results.memoryResults' />
                </h1>
              </div>
              <button
                type='button'
                onClick={returnToSetupRoute}
                className='min-h-12 self-start rounded-full bg-violet-300 px-6 font-bold text-slate-950 transition hover:bg-violet-200 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-violet-300 sm:self-auto'
              >
                <Localized id='common.settings.changeSettings' />
              </button>
            </div>

            <div className='mt-10 grid gap-4 sm:grid-cols-[1.4fr_0.6fr]'>
              <div className='rounded-3xl border border-violet-300/20 bg-violet-300/10 p-6'>
                <p className='text-sm font-semibold uppercase tracking-wider text-violet-200/70'>
                  <Localized id='shortTermMemory.results.overallAccuracy' />
                </p>
                <p className='mt-3 font-mono text-6xl font-black text-violet-300 sm:text-7xl'>
                  <Localized>{overallAccuracy}</Localized>
                  <span className='ml-1 text-3xl text-violet-200/60'>
                    <Localized>{'%'}</Localized>
                  </span>
                </p>
              </div>
              <div className='rounded-3xl border border-white/10 bg-white/[0.05] p-6'>
                <p className='text-sm font-semibold uppercase tracking-wider text-slate-500'>
                  <Localized id='shortTermMemory.results.savedSettings' />
                </p>
                <p className='mt-4 font-mono text-lg text-white'>
                  <Localized>{gridSize}</Localized>
                  <Localized>{'×'}</Localized>
                  <Localized>{gridSize}</Localized>
                  <Localized>{' · '}</Localized>
                  <Localized>{cellsPerRound}</Localized>{' '}
                  <Localized id='deductiveReasoning.labels.cells' />
                </p>
                <p className='mt-2 font-mono text-lg text-white'>
                  <Localized>{flashDuration}</Localized>
                  <Localized>{' ms'}</Localized>
                </p>
                <p className='mt-2 font-mono text-lg text-white'>
                  <Localized>{roundCount}</Localized>{' '}
                  <Localized>{roundCount === 1 ? 'round' : 'rounds'}</Localized>
                </p>
              </div>
            </div>

            <div className='mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5'>
              <Localized>
                {rounds.map((round, index) => (
                  <div
                    key={index}
                    className='rounded-2xl border border-white/10 bg-white/[0.04] p-4'
                  >
                    <p className='text-xs font-semibold uppercase tracking-wider text-slate-500'>
                      <Localized id='common.labels.round' />{' '}
                      <Localized>{index + 1}</Localized>
                    </p>
                    <p className='mt-2 font-mono text-2xl font-bold text-slate-100'>
                      <Localized>{round.accuracy}</Localized>
                      <Localized>{'%'}</Localized>
                    </p>
                    <p className='mt-1 text-xs text-slate-500'>
                      <Localized>{round.correct}</Localized>{' '}
                      <Localized id='common.results.correctDetail2' />{' '}
                      <Localized>{round.selectedCells.length} </Localized>
                      <Localized id='common.labels.selected' />
                    </p>
                  </div>
                ))}
              </Localized>
            </div>
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
              <Localized id='shortTermMemory.results.memoryHistory' />
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
        <MemoryHistory sessions={history} />
        <p className='mt-8 max-w-2xl text-sm leading-6 text-slate-600'>
          <Localized id='shortTermMemory.instructions.thisIsAPracticeToolNotAClinicalAssessment' />
        </p>
      </section>
    </TestPageShell>
  );
}
