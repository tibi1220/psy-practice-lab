import {
  LocalizedDate,
  Localized,
  useTextTranslation,
} from '../components/Localization';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  leftPerceptionKeyCodes,
  leftPerceptionKeyLabels,
  PerceptionInputPair,
  perceptionInputMethods,
  PerceptionStimulusDisplay,
  rightPerceptionKeyCodes,
  rightPerceptionKeyLabels,
} from '../components/PerceptionControls';
import type {
  PerceptionInputMethod,
  PerceptionSide,
  PerceptionValue,
} from '../components/PerceptionControls';
import { PerceptionDemo } from '../components/TestDemos';
import {
  InstructionList,
  TestPageShell,
  TestPanel,
  TestSetupLayout,
} from '../components/TestPage';
import { ValidatedNumberInput } from '../components/ValidatedNumberInput';
import { useTestRoute } from '../hooks/useTestRoute';
import { createLocalId } from '../lib/create-local-id';

const STORAGE_KEY = 'psy-perception-sessions';
const DEFAULT_ROUND_COUNT = 32;
const MIN_ROUND_COUNT = 8;
const MAX_ROUND_COUNT = 128;
const FEEDBACK_DURATION_MS = 350;

type Phase = 'setup' | 'running' | 'complete';

type PerceptionTarget = {
  left: PerceptionValue;
  right: PerceptionValue;
};

type PerceptionTrial = PerceptionTarget & {
  responseLeft: PerceptionValue;
  responseRight: PerceptionValue;
  leftCorrect: boolean;
  rightCorrect: boolean;
  correct: boolean;
  reactionTime: number;
};

type PerceptionSession = {
  id: string;
  completedAt: string;
  settings: {
    leftInputMethod?: PerceptionInputMethod;
    rightInputMethod?: PerceptionInputMethod;
    inputMethod?: PerceptionInputMethod | 'mixed';
    roundCount: number;
  };
  trials: PerceptionTrial[];
  accuracy: number;
  leftAccuracy: number;
  rightAccuracy: number;
  averageReactionTime: number;
};

function shuffle<T>(items: T[]) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [result[index], result[randomIndex]] = [result[randomIndex], result[index]];
  }
  return result;
}

function createBalancedValues(count: number) {
  const result: PerceptionValue[] = [];
  while (result.length < count) {
    result.push(...shuffle<PerceptionValue>([1, 2, 3, 4]));
  }
  return result.slice(0, count);
}

function createSequence(count: number) {
  const leftValues = createBalancedValues(count);
  const rightValues = createBalancedValues(count);

  return leftValues.map((left, index) => ({
    left,
    right: rightValues[index],
  }));
}

function summarizeTrials(trials: PerceptionTrial[]) {
  const ratio = (predicate: (trial: PerceptionTrial) => boolean) =>
    Math.round(
      (trials.filter(predicate).length / Math.max(1, trials.length)) * 1_000,
    ) / 10;

  return {
    accuracy: ratio(trial => trial.correct),
    leftAccuracy: ratio(trial => trial.leftCorrect),
    rightAccuracy: ratio(trial => trial.rightCorrect),
    averageReactionTime: Math.round(
      trials.reduce((total, trial) => total + trial.reactionTime, 0) /
        Math.max(1, trials.length),
    ),
  };
}

function methodLabel(method: PerceptionInputMethod) {
  return (
    perceptionInputMethods.find(option => option.id === method)?.label ?? method
  );
}

function isInputMethod(value: unknown): value is PerceptionInputMethod {
  return value === 'vertical' || value === 'horizontal' || value === 'matrix';
}

function sessionMethodLabel(session: PerceptionSession) {
  const { leftInputMethod, rightInputMethod, inputMethod } = session.settings;
  if (leftInputMethod && rightInputMethod) {
    return `${methodLabel(leftInputMethod)} left · ${methodLabel(rightInputMethod)} right`;
  }
  if (inputMethod === 'mixed') return 'Mixed layouts (legacy)';
  return isInputMethod(inputMethod)
    ? methodLabel(inputMethod)
    : 'Unknown layout';
}

function isStoredSession(value: unknown): value is PerceptionSession {
  if (!value || typeof value !== 'object') return false;
  const session = value as Partial<PerceptionSession>;
  return (
    typeof session.id === 'string' &&
    typeof session.completedAt === 'string' &&
    typeof session.accuracy === 'number' &&
    typeof session.leftAccuracy === 'number' &&
    typeof session.rightAccuracy === 'number' &&
    typeof session.averageReactionTime === 'number' &&
    Array.isArray(session.trials) &&
    session.trials.length > 0 &&
    !!session.settings &&
    ((isInputMethod(session.settings.leftInputMethod) &&
      isInputMethod(session.settings.rightInputMethod)) ||
      isInputMethod(session.settings.inputMethod) ||
      session.settings.inputMethod === 'mixed') &&
    typeof session.settings.roundCount === 'number'
  );
}

function PerceptionHistory({ sessions }: { sessions: PerceptionSession[] }) {
  if (sessions.length === 0) {
    return (
      <div className='rounded-3xl border border-dashed border-white/15 px-6 py-10 text-center'>
        <p className='font-medium text-slate-300'>
          <Localized id='perception.labels.yourCompletedPerceptionSessionsWillAppearHere' />
        </p>
        <p className='mt-2 text-sm text-slate-500'>
          <Localized id='perception.results.resultsAndInputSettingsAreSavedOnlyInThis' />
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
                  <Localized>{sessionMethodLabel(session)}</Localized>
                  <Localized>{' · '}</Localized>
                  <Localized>{session.settings.roundCount} </Localized>
                  <Localized id='reactionTime.labels.rounds' />
                </p>
              </div>
              <div className='flex items-center gap-4'>
                <div className='text-right'>
                  <p className='font-mono text-xl font-semibold text-cyan-300'>
                    <Localized>{session.accuracy}</Localized>
                    <Localized>{'%'}</Localized>
                  </p>
                  <p className='text-xs uppercase tracking-wider text-slate-500'>
                    <Localized id='perception.results.pairAccuracy' />
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
            <div className='grid gap-3 border-t border-white/10 px-5 py-4 sm:grid-cols-3'>
              <Localized>
                {[
                  ['Left accuracy', `${session.leftAccuracy}%`],
                  ['Right accuracy', `${session.rightAccuracy}%`],
                  ['Average response', `${session.averageReactionTime} ms`],
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
          </details>
        ))}
      </Localized>
    </div>
  );
}

export default function PerceptionPage() {
  const t = useTextTranslation();

  const [phase, setPhase] = useState<Phase>('setup');
  const [leftInputMethod, setLeftInputMethod] =
    useState<PerceptionInputMethod>('vertical');
  const [rightInputMethod, setRightInputMethod] =
    useState<PerceptionInputMethod>('vertical');
  const [roundCount, setRoundCount] = useState(DEFAULT_ROUND_COUNT);
  const [sequence, setSequence] = useState<PerceptionTarget[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [trials, setTrials] = useState<PerceptionTrial[]>([]);
  const [pressedLeft, setPressedLeft] = useState<PerceptionValue | null>(null);
  const [pressedRight, setPressedRight] = useState<PerceptionValue | null>(
    null,
  );
  const [response, setResponse] = useState<PerceptionTrial | null>(null);
  const [lastSession, setLastSession] = useState<PerceptionSession | null>(
    null,
  );
  const [history, setHistory] = useState<PerceptionSession[]>([]);
  const shownAtRef = useRef(0);
  const inputLockedRef = useRef(false);
  const pressedLeftRef = useRef<PerceptionValue | null>(null);
  const pressedRightRef = useRef<PerceptionValue | null>(null);
  const leftPointersRef = useRef(new Map<number, PerceptionValue>());
  const rightPointersRef = useRef(new Map<number, PerceptionValue>());
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentTarget = sequence[currentIndex] ?? null;

  const clearPressedInputs = useCallback(() => {
    pressedLeftRef.current = null;
    pressedRightRef.current = null;
    leftPointersRef.current.clear();
    rightPointersRef.current.clear();
    setPressedLeft(null);
    setPressedRight(null);
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
    setPhase('setup');
  }, [clearPressedInputs]);

  const { beginTestRoute, completeTestRoute, returnToSetupRoute } =
    useTestRoute({
      basePath: '/perception',
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
      if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    },
    [],
  );

  useEffect(() => {
    if (phase !== 'running') return;
    shownAtRef.current = performance.now();
    inputLockedRef.current = false;
  }, [currentIndex, phase]);

  const startSession = useCallback(() => {
    beginTestRoute(phase === 'complete');
    clearPressedInputs();
    setSequence(createSequence(roundCount));
    setCurrentIndex(0);
    setTrials([]);
    setResponse(null);
    setLastSession(null);
    inputLockedRef.current = false;
    shownAtRef.current = performance.now();
    setPhase('running');
  }, [beginTestRoute, clearPressedInputs, phase, roundCount]);

  const finishSession = useCallback(
    (completedTrials: PerceptionTrial[]) => {
      const session: PerceptionSession = {
        id: createLocalId(),
        completedAt: new Date().toISOString(),
        settings: { leftInputMethod, rightInputMethod, roundCount },
        trials: completedTrials,
        ...summarizeTrials(completedTrials),
      };

      setLastSession(session);
      setHistory(currentHistory => {
        const updatedHistory = [session, ...currentHistory].slice(0, 100);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedHistory));
        return updatedHistory;
      });
      clearPressedInputs();
      setPhase('complete');
      completeTestRoute();
    },
    [
      clearPressedInputs,
      completeTestRoute,
      leftInputMethod,
      rightInputMethod,
      roundCount,
    ],
  );

  const respond = useCallback(
    (responseLeft: PerceptionValue, responseRight: PerceptionValue) => {
      if (phase !== 'running' || inputLockedRef.current) return;
      const target = sequence[currentIndex];
      if (!target) return;

      inputLockedRef.current = true;
      const leftCorrect = responseLeft === target.left;
      const rightCorrect = responseRight === target.right;
      const result: PerceptionTrial = {
        ...target,
        responseLeft,
        responseRight,
        leftCorrect,
        rightCorrect,
        correct: leftCorrect && rightCorrect,
        reactionTime: Math.max(
          1,
          Math.round(performance.now() - shownAtRef.current),
        ),
      };
      const completedTrials = [...trials, result];
      setTrials(completedTrials);
      setResponse(result);

      feedbackTimerRef.current = setTimeout(() => {
        clearPressedInputs();
        setResponse(null);
        if (currentIndex + 1 >= sequence.length) {
          finishSession(completedTrials);
        } else {
          setCurrentIndex(current => current + 1);
        }
      }, FEEDBACK_DURATION_MS);
    },
    [clearPressedInputs, currentIndex, finishSession, phase, sequence, trials],
  );

  const tryResponse = useCallback(
    (left: PerceptionValue | null, right: PerceptionValue | null) => {
      if (left !== null && right !== null) respond(left, right);
    },
    [respond],
  );

  const pressSide = useCallback(
    (side: PerceptionSide, value: PerceptionValue) => {
      if (phase !== 'running' || inputLockedRef.current) return;
      if (side === 'left') {
        pressedLeftRef.current = value;
        setPressedLeft(value);
        tryResponse(value, pressedRightRef.current);
      } else {
        pressedRightRef.current = value;
        setPressedRight(value);
        tryResponse(pressedLeftRef.current, value);
      }
    },
    [phase, tryResponse],
  );

  const releaseSide = useCallback(
    (side: PerceptionSide, value: PerceptionValue) => {
      if (inputLockedRef.current) return;
      if (side === 'left' && pressedLeftRef.current === value) {
        pressedLeftRef.current = null;
        setPressedLeft(null);
      }
      if (side === 'right' && pressedRightRef.current === value) {
        pressedRightRef.current = null;
        setPressedRight(null);
      }
    },
    [],
  );

  const handlePointerDown = useCallback(
    (side: PerceptionSide, value: PerceptionValue, pointerId: number) => {
      const pointerMap =
        side === 'left' ? leftPointersRef.current : rightPointersRef.current;
      pointerMap.set(pointerId, value);
      pressSide(side, value);
    },
    [pressSide],
  );

  const handlePointerUp = useCallback(
    (side: PerceptionSide, pointerId: number) => {
      const pointerMap =
        side === 'left' ? leftPointersRef.current : rightPointersRef.current;
      const value = pointerMap.get(pointerId);
      pointerMap.delete(pointerId);
      if (value !== undefined) releaseSide(side, value);
    },
    [releaseSide],
  );

  useEffect(() => {
    if (phase !== 'running') return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.repeat) return;
      const leftIndex = leftPerceptionKeyCodes.indexOf(
        event.code as (typeof leftPerceptionKeyCodes)[number],
      );
      const rightIndex = rightPerceptionKeyCodes.indexOf(
        event.code as (typeof rightPerceptionKeyCodes)[number],
      );
      if (leftIndex >= 0) {
        event.preventDefault();
        pressSide('left', (leftIndex + 1) as PerceptionValue);
      } else if (rightIndex >= 0) {
        event.preventDefault();
        pressSide('right', (rightIndex + 1) as PerceptionValue);
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      const leftIndex = leftPerceptionKeyCodes.indexOf(
        event.code as (typeof leftPerceptionKeyCodes)[number],
      );
      const rightIndex = rightPerceptionKeyCodes.indexOf(
        event.code as (typeof rightPerceptionKeyCodes)[number],
      );
      if (leftIndex >= 0) {
        releaseSide('left', (leftIndex + 1) as PerceptionValue);
      } else if (rightIndex >= 0) {
        releaseSide('right', (rightIndex + 1) as PerceptionValue);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [phase, pressSide, releaseSide]);

  if (phase === 'running') {
    return (
      <main className='flex h-dvh flex-col overflow-hidden bg-slate-950 px-3 py-2 text-white sm:px-6 sm:py-4'>
        <header className='flex shrink-0 items-center justify-between gap-4'>
          <div>
            <p className='font-mono text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300 sm:text-sm'>
              <Localized id='perception.labels.perception' />{' '}
              <Localized>{methodLabel(leftInputMethod)}</Localized>{' '}
              <Localized id='perception.labels.leftDetail' />
              <Localized> </Localized>
              <Localized>{methodLabel(rightInputMethod)}</Localized>{' '}
              <Localized id='perception.labels.rightRound' />{' '}
              <Localized>{currentIndex + 1} </Localized>
              <Localized id='distributiveAttention.labels.of' />{' '}
              <Localized>{sequence.length}</Localized>
            </p>
            <p className='mt-1 text-[11px] text-slate-400 sm:text-xs'>
              <Localized id='perception.labels.pressTheMatchingLeftAndRightNumbersTogether' />
            </p>
          </div>
          <div className='text-right'>
            <p className='font-mono text-xl font-black text-white'>
              <Localized>
                {trials.filter(trial => trial.correct).length}
              </Localized>
              <Localized>{'/'}</Localized>
              <Localized>{trials.length}</Localized>
            </p>
            <p className='text-[9px] uppercase tracking-wider text-slate-500'>
              <Localized id='perception.results.correctPairs' />
            </p>
          </div>
        </header>

        <section className='flex min-h-0 flex-1 flex-col py-2'>
          <div className='mx-auto w-full max-w-6xl'>
            <PerceptionStimulusDisplay
              leftTarget={currentTarget?.left ?? null}
              rightTarget={currentTarget?.right ?? null}
            />
          </div>
          <div className='mx-auto flex min-h-0 w-full max-w-6xl flex-1 items-end pb-2'>
            <PerceptionInputPair
              leftMethod={leftInputMethod}
              rightMethod={rightInputMethod}
              pressedLeft={pressedLeft}
              pressedRight={pressedRight}
              leftCorrect={response?.leftCorrect ?? null}
              rightCorrect={response?.rightCorrect ?? null}
              disabled={response !== null}
              onPointerDown={handlePointerDown}
              onPointerUp={handlePointerUp}
            />
          </div>
        </section>

        <footer className='shrink-0 pb-[max(0rem,env(safe-area-inset-bottom))] text-center text-[10px] leading-4 text-slate-500 sm:text-xs'>
          <Localized id='perception.labels.touchHoldOneButtonOnEachSideDesktop' />
          <Localized> </Localized>
          <Localized>{leftPerceptionKeyLabels.join(' ')}</Localized>{' '}
          <Localized id='perception.labels.rightDetail' />
          <Localized> </Localized>
          <Localized>{rightPerceptionKeyLabels.join(' ')}</Localized>
        </footer>
      </main>
    );
  }

  const summary = lastSession ? summarizeTrials(lastSession.trials) : null;

  return (
    <TestPageShell accent='cyan'>
      <Localized>
        {phase === 'setup' ? (
          <TestSetupLayout
            accent='cyan'
            eyebrow='Perception'
            title={t('perception.labels.seeTwoSignalsRespondAsOne')}
            description={
              <p>
                <Localized id='perception.instructions.readOneIlluminatedNumberOnEachSideThenCoordinate' />
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
                <PerceptionDemo />
              </>
            }
          >
            <div className='space-y-4'>
              <TestPanel
                title={t('common.settings.title')}
                description='Choose a fixed arrangement for each hand. The two sides may use different layouts.'
              >
                <div className='space-y-6'>
                  <div className='grid gap-5 sm:grid-cols-2'>
                    <Localized>
                      {(['left', 'right'] as const).map(side => {
                        const selectedMethod =
                          side === 'left' ? leftInputMethod : rightInputMethod;
                        const selectMethod =
                          side === 'left'
                            ? setLeftInputMethod
                            : setRightInputMethod;

                        return (
                          <fieldset key={side}>
                            <legend className='text-sm font-semibold capitalize text-slate-300'>
                              <Localized>{side}</Localized>{' '}
                              <Localized id='perception.labels.inputPattern' />
                            </legend>
                            <div className='mt-3 grid gap-2 rounded-2xl bg-slate-950 p-1.5'>
                              <Localized>
                                {perceptionInputMethods.map(option => (
                                  <button
                                    key={option.id}
                                    type='button'
                                    aria-pressed={selectedMethod === option.id}
                                    onClick={() => selectMethod(option.id)}
                                    className={`min-h-11 rounded-xl px-3 text-left text-sm font-bold transition focus-visible:outline-2 focus-visible:outline-cyan-300 ${
                                      selectedMethod === option.id
                                        ? 'bg-cyan-300 text-slate-950'
                                        : 'text-slate-400 hover:bg-white/5 hover:text-white'
                                    }`}
                                  >
                                    <Localized>{option.label}</Localized>
                                  </button>
                                ))}
                              </Localized>
                            </div>
                          </fieldset>
                        );
                      })}
                    </Localized>
                  </div>

                  <div className='rounded-2xl border border-cyan-300/10 bg-cyan-300/5 p-4'>
                    <div className='mb-3 flex justify-between gap-4 text-[10px] font-bold uppercase tracking-wider text-slate-500'>
                      <span>
                        <Localized>{methodLabel(leftInputMethod)}</Localized>{' '}
                        <Localized id='perception.labels.left' />
                      </span>
                      <span>
                        <Localized>{methodLabel(rightInputMethod)}</Localized>{' '}
                        <Localized id='perception.labels.right' />
                      </span>
                    </div>
                    <PerceptionInputPair
                      leftMethod={leftInputMethod}
                      rightMethod={rightInputMethod}
                      disabled
                      compact
                    />
                  </div>

                  <label className='block'>
                    <span className='flex items-center justify-between text-sm font-semibold text-slate-300'>
                      <Localized id='common.labels.numberOfRounds' />
                      <span className='font-mono text-cyan-300'>
                        <Localized>{roundCount}</Localized>
                      </span>
                    </span>
                    <ValidatedNumberInput
                      min={MIN_ROUND_COUNT}
                      max={MAX_ROUND_COUNT}
                      value={roundCount}
                      normalize={Math.round}
                      onValueChange={setRoundCount}
                      className='mt-3 min-h-12 w-full rounded-xl border border-white/10 bg-slate-950 px-4 font-mono text-white outline-none focus:border-cyan-300'
                    />
                    <span className='mt-2 block text-xs text-slate-500'>
                      <Localized id='common.labels.default' />{' '}
                      <Localized>{DEFAULT_ROUND_COUNT}</Localized>
                    </span>
                  </label>
                </div>
              </TestPanel>

              <TestPanel title={t('common.instructions.title')}>
                <InstructionList
                  accent='cyan'
                  items={[
                    {
                      title: 'Read the outer LEDs',
                      description:
                        'The illuminated left and right LEDs each identify one number from 1 to 4.',
                    },
                    {
                      title: 'Find both numbers',
                      description:
                        "Locate each value in its side's chosen arrangement. Both layouts stay fixed for the entire session.",
                    },
                    {
                      title: 'Press simultaneously',
                      description:
                        'Touch and hold one button on each side. The pair is recorded when both are down.',
                    },
                    {
                      title: 'Desktop alternative',
                      description:
                        'Use Q W E R for left values 1–4 and U I O P for right values 1–4 as a two-key chord.',
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
                  <Localized id='perception.results.perceptionResults' />
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
              {lastSession && summary && (
                <div className='mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
                  <Localized>
                    {[
                      [
                        'Pair accuracy',
                        `${summary.accuracy}%`,
                        'text-cyan-300',
                      ],
                      [
                        'Average response',
                        `${summary.averageReactionTime} ms`,
                        'text-violet-300',
                      ],
                      [
                        'Left accuracy',
                        `${summary.leftAccuracy}%`,
                        'text-emerald-300',
                      ],
                      [
                        'Right accuracy',
                        `${summary.rightAccuracy}%`,
                        'text-amber-300',
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
              <Localized id='perception.results.perceptionHistory' />
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
        <PerceptionHistory sessions={history} />
        <p className='mt-8 max-w-2xl text-sm leading-6 text-slate-600'>
          <Localized id='perception.instructions.thisIsAPracticeToolNotAClinicalAssessment' />
        </p>
      </section>
    </TestPageShell>
  );
}
