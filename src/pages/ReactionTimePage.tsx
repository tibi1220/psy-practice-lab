import {
  LocalizedDate,
  Localized,
  useTextTranslation,
} from '../components/Localization';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ReactionTimeDemo } from '../components/TestDemos';
import { ValidatedNumberInput } from '../components/ValidatedNumberInput';
import {
  InstructionList,
  TestPageShell,
  TestPanel,
  TestSetupLayout,
} from '../components/TestPage';
import { createLocalId } from '../lib/create-local-id';
import { useTestRoute } from '../hooks/useTestRoute';

const DEFAULT_TRIAL_COUNT = 5;
const MIN_TRIAL_COUNT = 3;
const MAX_TRIAL_COUNT = 50;
const STORAGE_KEY = 'psy-reaction-time-sessions';

type Phase = 'idle' | 'waiting' | 'ready' | 'result' | 'tooSoon' | 'complete';

type Session = {
  id: string;
  completedAt: string;
  results: number[];
  average: number;
  standardDeviation: number;
  settings?: {
    trialCount: number;
    excludeExtremes: boolean;
  };
  excludedResultIndices?: number[];
};

function calculateStats(results: number[], excludeExtremes: boolean) {
  const rankedIndices = results
    .map((result, index) => ({ result, index }))
    .sort((a, b) => a.result - b.result || a.index - b.index);
  const excludedResultIndices =
    excludeExtremes && rankedIndices.length >= 3
      ? [rankedIndices[0].index, rankedIndices[rankedIndices.length - 1].index]
      : [];
  const includedResults = results.filter(
    (_, index) => !excludedResultIndices.includes(index),
  );
  const average =
    includedResults.reduce((total, result) => total + result, 0) /
    includedResults.length;
  const variance =
    includedResults.reduce(
      (total, result) => total + Math.pow(result - average, 2),
      0,
    ) / includedResults.length;

  return {
    average: Math.round(average),
    standardDeviation: Math.round(Math.sqrt(variance)),
    excludedResultIndices,
  };
}

function isStoredSession(value: unknown): value is Session {
  if (!value || typeof value !== 'object') return false;

  const session = value as Partial<Session>;
  return (
    typeof session.id === 'string' &&
    typeof session.completedAt === 'string' &&
    Array.isArray(session.results) &&
    session.results.length > 0 &&
    session.results.every(result => typeof result === 'number') &&
    typeof session.average === 'number' &&
    typeof session.standardDeviation === 'number' &&
    (session.settings === undefined ||
      (typeof session.settings.trialCount === 'number' &&
        typeof session.settings.excludeExtremes === 'boolean')) &&
    (session.excludedResultIndices === undefined ||
      (Array.isArray(session.excludedResultIndices) &&
        session.excludedResultIndices.every(
          index => Number.isInteger(index) && index >= 0,
        )))
  );
}

function SessionHistory({ sessions }: { sessions: Session[] }) {
  if (sessions.length === 0) {
    return (
      <div className='rounded-3xl border border-dashed border-white/15 px-6 py-10 text-center'>
        <p className='text-base font-medium text-slate-300'>
          <Localized id='reactionTime.labels.yourCompletedSessionsWillAppearHere' />
        </p>
        <p className='mt-2 text-sm text-slate-500'>
          <Localized id='reactionTime.results.resultsAreSavedOnlyInThisBrowser' />
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
            className='group overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] open:bg-white/[0.06]'
            open={sessionIndex === 0}
          >
            <summary className='flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 marker:hidden'>
              <div>
                <p className='font-semibold text-white'>
                  <LocalizedDate value={session.completedAt} />
                </p>
                <p className='mt-1 text-sm text-slate-400'>
                  <Localized>{session.results.length}</Localized>{' '}
                  <Localized id='reactionTime.labels.trials' />{' '}
                  <Localized>{session.standardDeviation} </Localized>
                  <Localized>{'ms'}</Localized>
                  <Localized>
                    {session.settings?.excludeExtremes &&
                      ' · extremes excluded'}
                  </Localized>
                </p>
              </div>
              <div className='flex items-center gap-4'>
                <div className='text-right'>
                  <p className='font-mono text-xl font-semibold text-cyan-300'>
                    <Localized>{session.average}</Localized>
                    <Localized>{' ms'}</Localized>
                  </p>
                  <p className='text-xs uppercase tracking-wider text-slate-500'>
                    <Localized id='common.business.average' />
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
              <div className='grid grid-cols-2 gap-2 sm:grid-cols-5'>
                <Localized>
                  {session.results.map((result, index) => (
                    <div
                      key={`${session.id}-${index}`}
                      className={`rounded-xl bg-slate-950/60 px-2 py-3 text-center ${
                        session.excludedResultIndices?.includes(index)
                          ? 'opacity-45'
                          : ''
                      }`}
                    >
                      <p className='text-xs text-slate-500'>
                        <Localized>{index + 1}</Localized>
                      </p>
                      <p className='mt-1 font-mono text-sm font-semibold text-slate-200'>
                        <Localized>{result}</Localized>
                      </p>
                      <p className='text-[10px] uppercase text-slate-600'>
                        <Localized>
                          {session.excludedResultIndices?.includes(index)
                            ? 'Excluded'
                            : 'ms'}
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

export default function Home() {
  const t = useTextTranslation();

  const [phase, setPhase] = useState<Phase>('idle');
  const [trialCount, setTrialCount] = useState(DEFAULT_TRIAL_COUNT);
  const [excludeExtremes, setExcludeExtremes] = useState(true);
  const [trialIndex, setTrialIndex] = useState(0);
  const [results, setResults] = useState<number[]>([]);
  const [lastReaction, setLastReaction] = useState<number | null>(null);
  const [history, setHistory] = useState<Session[]>([]);
  const greenTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const phaseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const greenStartedAt = useRef(0);
  const inputLocked = useRef(false);

  const returnToSetup = useCallback(() => {
    if (greenTimer.current) clearTimeout(greenTimer.current);
    if (phaseTimer.current) clearTimeout(phaseTimer.current);
    inputLocked.current = true;
    setResults([]);
    setLastReaction(null);
    setTrialIndex(0);
    setPhase('idle');
  }, []);
  const { beginTestRoute, completeTestRoute, returnToSetupRoute } =
    useTestRoute({
      basePath: '/reaction-time',
      view:
        phase === 'idle' ? 'setup' : phase === 'complete' ? 'result' : 'test',
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

  useEffect(
    () => () => {
      if (greenTimer.current) clearTimeout(greenTimer.current);
      if (phaseTimer.current) clearTimeout(phaseTimer.current);
    },
    [],
  );

  const scheduleGreen = useCallback(() => {
    if (greenTimer.current) clearTimeout(greenTimer.current);

    const delay = 1600 + Math.random() * 2900;
    greenTimer.current = setTimeout(() => {
      greenStartedAt.current = performance.now();
      inputLocked.current = false;
      setPhase('ready');
    }, delay);
  }, []);

  const startSession = useCallback(() => {
    beginTestRoute(phase === 'complete');
    setResults([]);
    setLastReaction(null);
    setTrialIndex(0);
    setPhase('waiting');
    inputLocked.current = false;
    scheduleGreen();
  }, [beginTestRoute, phase, scheduleGreen]);

  const respondTooSoon = useCallback(() => {
    if (inputLocked.current) return;

    inputLocked.current = true;
    if (greenTimer.current) clearTimeout(greenTimer.current);
    setPhase('tooSoon');

    phaseTimer.current = setTimeout(() => {
      inputLocked.current = false;
      setPhase('waiting');
      scheduleGreen();
    }, 1000);
  }, [scheduleGreen]);

  const recordReaction = useCallback(() => {
    if (inputLocked.current) return;

    inputLocked.current = true;
    const reactionTime = Math.max(
      1,
      Math.round(performance.now() - greenStartedAt.current),
    );
    const updatedResults = [...results, reactionTime];

    setLastReaction(reactionTime);
    setResults(updatedResults);
    setPhase('result');

    phaseTimer.current = setTimeout(() => {
      if (updatedResults.length === trialCount) {
        const stats = calculateStats(updatedResults, excludeExtremes);
        const session: Session = {
          id: createLocalId(),
          completedAt: new Date().toISOString(),
          results: updatedResults,
          average: stats.average,
          standardDeviation: stats.standardDeviation,
          settings: {
            trialCount,
            excludeExtremes,
          },
          excludedResultIndices: stats.excludedResultIndices,
        };

        setHistory(currentHistory => {
          const updatedHistory = [session, ...currentHistory].slice(0, 100);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedHistory));
          return updatedHistory;
        });
        setPhase('complete');
        completeTestRoute();
        return;
      }

      setTrialIndex(updatedResults.length);
      setPhase('waiting');
      inputLocked.current = false;
      scheduleGreen();
    }, 1000);
  }, [completeTestRoute, excludeExtremes, results, scheduleGreen, trialCount]);

  const handleInput = useCallback(() => {
    if (phase === 'ready') recordReaction();
    if (phase === 'waiting') respondTooSoon();
  }, [phase, recordReaction, respondTooSoon]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.repeat || (phase !== 'waiting' && phase !== 'ready')) return;
      event.preventDefault();
      handleInput();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleInput, phase]);

  const activeTrial = Math.min(trialIndex + 1, trialCount);
  const stats =
    results.length > 0 ? calculateStats(results, excludeExtremes) : null;
  const isTesting =
    phase === 'waiting' ||
    phase === 'ready' ||
    phase === 'result' ||
    phase === 'tooSoon';

  const background =
    phase === 'ready'
      ? 'bg-emerald-400 text-emerald-950'
      : isTesting
        ? 'bg-rose-600 text-white'
        : 'bg-slate-950 text-white';

  if (isTesting) {
    return (
      <main
        className={`flex min-h-[100svh] select-none items-center justify-center px-6 text-center ${background}`}
        onPointerDown={handleInput}
      >
        <section
          aria-live='assertive'
          className='max-w-xl'
        >
          <p className='mb-6 font-mono text-sm font-semibold uppercase tracking-[0.3em] opacity-70'>
            <Localized id='reactionTime.labels.trial' />{' '}
            <Localized>{activeTrial}</Localized>{' '}
            <Localized id='distributiveAttention.labels.of' />{' '}
            <Localized>{trialCount}</Localized>
          </p>

          <Localized>
            {phase === 'waiting' && (
              <>
                <h1 className='text-5xl font-black tracking-tight sm:text-7xl'>
                  <Localized id='common.symbols.waitForGreen' />
                </h1>
                <p className='mt-5 text-lg font-medium opacity-80'>
                  <Localized id='reactionTime.labels.donTPressYet' />
                </p>
              </>
            )}
          </Localized>

          <Localized>
            {phase === 'ready' && (
              <>
                <h1 className='text-7xl font-black tracking-tight sm:text-9xl'>
                  <Localized id='common.labels.now' />
                </h1>
                <p className='mt-5 text-lg font-bold'>
                  <Localized id='reactionTime.labels.tapTheScreenOrPressAnyKey' />
                </p>
              </>
            )}
          </Localized>

          <Localized>
            {phase === 'result' && (
              <>
                <h1 className='font-mono text-6xl font-black tracking-tight sm:text-8xl'>
                  <Localized>{lastReaction}</Localized>
                  <Localized>{' ms'}</Localized>
                </h1>
                <p className='mt-5 text-lg font-medium opacity-80'>
                  <Localized id='reactionTime.labels.recorded' />
                </p>
              </>
            )}
          </Localized>

          <Localized>
            {phase === 'tooSoon' && (
              <>
                <h1 className='text-5xl font-black tracking-tight sm:text-7xl'>
                  <Localized id='reactionTime.labels.tooSoon' />
                </h1>
                <p className='mt-5 text-lg font-medium opacity-80'>
                  <Localized id='reactionTime.settings.thisAttemptWonTCount' />
                </p>
              </>
            )}
          </Localized>
        </section>
      </main>
    );
  }

  return (
    <TestPageShell accent='cyan'>
      <Localized>
        {phase === 'idle' ? (
          <TestSetupLayout
            accent='cyan'
            eyebrow='Reaction time'
            title={t('reactionTime.labels.howFastCanYouRespond')}
            description={
              <p>
                <Localized id='reactionTime.instructions.chooseHowManyReactionTimeTrialsToCompleteWaitThrough' />
              </p>
            }
            actions={
              <>
                <button
                  type='button'
                  onClick={startSession}
                  className='min-h-14 rounded-full bg-cyan-300 px-8 text-base font-bold text-slate-950 shadow-xl shadow-cyan-950 transition hover:bg-cyan-200 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-300'
                >
                  <Localized id='common.actions.startTest' />
                </button>
                <ReactionTimeDemo />
              </>
            }
          >
            <div className='space-y-4'>
              <TestPanel
                title={t('common.settings.title')}
                description='Configure this session before starting.'
              >
                <div className='grid gap-3 sm:grid-cols-2'>
                  <label className='rounded-2xl border border-white/10 bg-white/[0.05] p-4'>
                    <span className='block text-sm font-semibold text-slate-200'>
                      <Localized id='common.labels.numberOfRounds' />
                    </span>
                    <ValidatedNumberInput
                      min={MIN_TRIAL_COUNT}
                      max={MAX_TRIAL_COUNT}
                      inputMode='numeric'
                      value={trialCount}
                      normalize={Math.round}
                      onValueChange={setTrialCount}
                      className='mt-3 min-h-12 w-full rounded-xl border border-white/10 bg-slate-950 px-4 font-mono text-lg font-bold text-white outline-none focus:border-cyan-300'
                    />
                    <span className='mt-2 block text-xs text-slate-500'>
                      <Localized>{MIN_TRIAL_COUNT}</Localized>
                      <Localized>{'–'}</Localized>
                      <Localized>{MAX_TRIAL_COUNT}</Localized>{' '}
                      <Localized id='reactionTime.labels.rounds' />
                    </span>
                  </label>

                  <label className='flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.05] p-4'>
                    <span>
                      <span className='block text-sm font-semibold text-slate-200'>
                        <Localized id='reactionTime.labels.excludeExtremes' />
                      </span>
                      <span className='mt-1 block text-xs leading-5 text-slate-500'>
                        <Localized id='reactionTime.results.ignoreOneFastestAndOneSlowestResultInStatistics' />
                      </span>
                    </span>
                    <span className='shrink-0'>
                      <input
                        type='checkbox'
                        checked={excludeExtremes}
                        onChange={event =>
                          setExcludeExtremes(event.currentTarget.checked)
                        }
                        className='animated-checkbox sr-only'
                      />
                      <span
                        aria-hidden='true'
                        className='animated-checkbox-box flex h-7 w-7 items-center justify-center rounded-lg border-2 border-slate-500 bg-slate-950'
                      >
                        <svg
                          viewBox='0 0 24 24'
                          className='h-5 w-5'
                          fill='none'
                        >
                          <path
                            className='animated-checkbox-tick'
                            d='M5 12.5 9.5 17 19 7.5'
                            stroke='currentColor'
                            strokeWidth='3'
                            strokeLinecap='round'
                            strokeLinejoin='round'
                          />
                        </svg>
                      </span>
                    </span>
                  </label>
                </div>
              </TestPanel>

              <TestPanel title={t('common.instructions.title')}>
                <InstructionList
                  accent='cyan'
                  items={[
                    {
                      title: 'Press ready',
                      description: 'The screen turns red.',
                    },
                    {
                      title: 'Wait',
                      description: 'Green appears after a random delay.',
                    },
                    {
                      title: 'React',
                      description: 'Tap or press any keyboard key.',
                    },
                    {
                      title: 'Review',
                      description: t(
                        'reactionTime.messages.exploreAllTrialcountResultsAndYourHistory',
                        { trialCount: trialCount },
                      ),
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
                  <Localized id='common.results.sessionComplete' />
                </p>
                <h1 className='mt-4 text-4xl font-black tracking-tight sm:text-6xl'>
                  <Localized id='reactionTime.results.yourResults' />
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

            <div className='mt-10 grid gap-4 sm:grid-cols-3'>
              <div className='rounded-3xl border border-cyan-300/20 bg-cyan-300/10 p-6 sm:col-span-2'>
                <p className='text-sm font-semibold uppercase tracking-wider text-cyan-200/70'>
                  <Localized id='reactionTime.results.averageReaction' />
                </p>
                <p className='mt-3 font-mono text-6xl font-black text-cyan-300 sm:text-7xl'>
                  <Localized>{stats?.average}</Localized>
                  <span className='ml-2 text-2xl text-cyan-200/60'>
                    <Localized>{'ms'}</Localized>
                  </span>
                </p>
                <Localized>
                  {excludeExtremes && (
                    <p className='mt-3 text-sm text-cyan-100/60'>
                      <Localized id='reactionTime.labels.basedOn' />{' '}
                      <Localized>{Math.max(1, results.length - 2)}</Localized>{' '}
                      <Localized id='distributiveAttention.labels.of' />{' '}
                      <Localized>{results.length} </Localized>
                      <Localized id='reactionTime.results.resultsFastestAndSlowestExcluded' />
                    </p>
                  )}
                </Localized>
              </div>
              <div className='rounded-3xl border border-white/10 bg-white/[0.05] p-6'>
                <p className='text-sm font-semibold uppercase tracking-wider text-slate-500'>
                  <Localized id='reactionTime.labels.standardDeviation' />
                </p>
                <p className='mt-4 font-mono text-4xl font-bold text-white'>
                  <Localized>{stats?.standardDeviation}</Localized>
                  <span className='ml-2 text-lg text-slate-500'>
                    <Localized>{'ms'}</Localized>
                  </span>
                </p>
              </div>
            </div>

            <div className='mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5'>
              <Localized>
                {results.map((result, index) => (
                  <div
                    key={`${result}-${index}`}
                    className={`rounded-2xl border border-white/10 bg-white/[0.04] p-4 ${
                      stats?.excludedResultIndices.includes(index)
                        ? 'opacity-45'
                        : ''
                    }`}
                  >
                    <p className='text-xs font-semibold uppercase tracking-wider text-slate-500'>
                      <Localized id='reactionTime.labels.trial' />{' '}
                      <Localized>{index + 1}</Localized>
                    </p>
                    <p className='mt-2 font-mono text-2xl font-bold text-slate-100'>
                      <Localized>{result} </Localized>
                      <span className='text-sm font-normal text-slate-500'>
                        <Localized>{'ms'}</Localized>
                      </span>
                    </p>
                    <Localized>
                      {stats?.excludedResultIndices.includes(index) && (
                        <p className='mt-1 text-xs font-semibold uppercase tracking-wider text-slate-500'>
                          <Localized id='reactionTime.labels.excluded' />
                        </p>
                      )}
                    </Localized>
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
            <h2 className='mt-2 text-2xl font-bold text-white'>
              <Localized id='reactionTime.results.sessionHistory' />
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
          <Localized id='reactionTime.instructions.thisIsAPracticeToolNotAClinicalAssessment' />
        </p>
      </section>
    </TestPageShell>
  );
}
