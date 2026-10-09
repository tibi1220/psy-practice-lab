import {
  LocalizedDate,
  Localized,
  useTextTranslation,
} from '../components/Localization';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  CapacityActionControls,
  CapacityStimulusPanel,
  capacityColors,
} from '../components/CapacityControls';
import type {
  CapacityAction,
  CapacityColor,
  CapacitySide,
} from '../components/CapacityControls';
import { CapacityToActDemo } from '../components/TestDemos';
import { ValidatedNumberInput } from '../components/ValidatedNumberInput';
import {
  InstructionList,
  TestPageShell,
  TestPanel,
  TestSetupLayout,
} from '../components/TestPage';
import { createLocalId } from '../lib/create-local-id';
import { useTestRoute } from '../hooks/useTestRoute';

const STORAGE_KEY = 'psy-capacity-to-act-sessions';
const DEFAULT_TRIAL_COUNT = 40;
const DEFAULT_INTERVAL_MS = 1_500;
const MIN_TRIAL_COUNT = 5;
const MAX_TRIAL_COUNT = 500;
const MIN_INTERVAL_MS = 250;
const MAX_INTERVAL_MS = 5_000;
const START_DELAY_MS = 2_000;
const TONE_DURATION_SECONDS = 0.8;

type Phase = 'setup' | 'starting' | 'running' | 'complete';
type Tone = 'deep' | 'high';

type ColorStimulus = {
  kind: 'color';
  cellIndex: number;
  color: CapacityColor;
  expectedAction: CapacityColor;
};

type WarningStimulus = {
  kind: 'warning';
  side: CapacitySide;
  expectedAction: 'left-pedal' | 'right-pedal';
};

type ToneStimulus = {
  kind: 'tone';
  tone: Tone;
  expectedAction: 'left-lever' | 'right-lever';
};

type CapacityStimulus = ColorStimulus | WarningStimulus | ToneStimulus;

type CapacityTrial = CapacityStimulus & {
  responseAction: CapacityAction | null;
  reactionTime: number | null;
  correct: boolean;
};

type CapacitySession = {
  id: string;
  completedAt: string;
  settings: {
    trialCount: number;
    intervalMs: number;
  };
  trials: CapacityTrial[];
  accuracy: number;
  averageReactionTime: number | null;
  incorrect: number;
  missed: number;
};

type StimulusTemplate =
  | { kind: 'color'; color: CapacityColor }
  | { kind: 'warning'; side: CapacitySide }
  | { kind: 'tone'; tone: Tone };

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

const stimulusTemplates: StimulusTemplate[] = [
  ...capacityColors.map(color => ({
    kind: 'color' as const,
    color: color.id,
  })),
  { kind: 'warning', side: 'left' },
  { kind: 'warning', side: 'right' },
  { kind: 'tone', tone: 'deep' },
  { kind: 'tone', tone: 'high' },
];

function createSequence(trialCount: number): CapacityStimulus[] {
  const sequence: CapacityStimulus[] = [];
  let templateBag = shuffle(stimulusTemplates);
  let cellBag = shuffle(Array.from({ length: 10 }, (_, index) => index));
  let templateIndex = 0;
  let cellIndex = 0;

  while (sequence.length < trialCount) {
    if (templateIndex >= templateBag.length) {
      templateBag = shuffle(stimulusTemplates);
      templateIndex = 0;
    }
    const template = templateBag[templateIndex];
    templateIndex += 1;

    if (template.kind === 'color') {
      if (cellIndex >= cellBag.length) {
        cellBag = shuffle(Array.from({ length: 10 }, (_, index) => index));
        cellIndex = 0;
      }
      const displayCell = cellBag[cellIndex];
      cellIndex += 1;
      sequence.push({
        ...template,
        cellIndex: displayCell,
        expectedAction: template.color,
      });
    } else if (template.kind === 'warning') {
      sequence.push({
        ...template,
        expectedAction: `${template.side}-pedal`,
      });
    } else if (template.kind === 'tone') {
      sequence.push({
        ...template,
        expectedAction: template.tone === 'deep' ? 'left-lever' : 'right-lever',
      });
    }
  }

  return sequence;
}

function summarizeResults(trials: CapacityTrial[]) {
  const correct = trials.filter(trial => trial.correct).length;
  const completedReactions = trials.flatMap(trial =>
    trial.reactionTime === null ? [] : [trial.reactionTime],
  );

  return {
    accuracy: Math.round((correct / trials.length) * 1_000) / 10,
    averageReactionTime:
      completedReactions.length === 0
        ? null
        : Math.round(
            completedReactions.reduce((total, time) => total + time, 0) /
              completedReactions.length,
          ),
    incorrect: trials.filter(
      trial => trial.responseAction !== null && !trial.correct,
    ).length,
    missed: trials.filter(trial => trial.responseAction === null).length,
  };
}

function isStoredSession(value: unknown): value is CapacitySession {
  if (!value || typeof value !== 'object') return false;
  const session = value as Partial<CapacitySession>;

  return (
    typeof session.id === 'string' &&
    typeof session.completedAt === 'string' &&
    typeof session.accuracy === 'number' &&
    typeof session.incorrect === 'number' &&
    typeof session.missed === 'number' &&
    Array.isArray(session.trials) &&
    session.trials.length > 0 &&
    !!session.settings &&
    typeof session.settings.trialCount === 'number' &&
    typeof session.settings.intervalMs === 'number'
  );
}

function CapacityHistory({ sessions }: { sessions: CapacitySession[] }) {
  if (sessions.length === 0) {
    return (
      <div className='rounded-3xl border border-dashed border-white/15 px-6 py-10 text-center'>
        <p className='font-medium text-slate-300'>
          <Localized id='capacityToAct.labels.yourCompletedCapacitySessionsWillAppearHere' />
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
                  <Localized>{session.settings.trialCount}</Localized>{' '}
                  <Localized id='capacityToAct.labels.events' />
                  <Localized> </Localized>
                  <Localized>{session.settings.intervalMs}</Localized>{' '}
                  <Localized id='capacityToAct.settings.msInterval' />
                </p>
              </div>
              <div className='flex items-center gap-4'>
                <div className='text-right'>
                  <p className='font-mono text-xl font-semibold text-pink-300'>
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
              <div className='grid gap-3 sm:grid-cols-4'>
                <Localized>
                  {[
                    [
                      'Average response',
                      session.averageReactionTime === null
                        ? '—'
                        : `${session.averageReactionTime} ms`,
                    ],
                    [
                      'Correct',
                      String(
                        session.trials.filter(trial => trial.correct).length,
                      ),
                    ],
                    ['Incorrect', String(session.incorrect)],
                    ['Missed', String(session.missed)],
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
            </div>
          </details>
        ))}
      </Localized>
    </div>
  );
}

export default function CapacityToActPage() {
  const t = useTextTranslation();

  const [phase, setPhase] = useState<Phase>('setup');
  const [trialCount, setTrialCount] = useState(DEFAULT_TRIAL_COUNT);
  const [intervalMs, setIntervalMs] = useState(DEFAULT_INTERVAL_MS);
  const [sequence, setSequence] = useState<CapacityStimulus[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [respondedIndex, setRespondedIndex] = useState<number | null>(null);
  const [startCountdown, setStartCountdown] = useState(2);
  const [activeTopLight, setActiveTopLight] = useState<CapacitySide | null>(
    null,
  );
  const [trials, setTrials] = useState<CapacityTrial[]>([]);
  const [lastSession, setLastSession] = useState<CapacitySession | null>(null);
  const [history, setHistory] = useState<CapacitySession[]>([]);
  const trialTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const distractionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const distractionOffTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const shownAtRef = useRef(0);
  const responseLockedRef = useRef(false);
  const trialsRef = useRef<CapacityTrial[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const playedToneIndexRef = useRef<number | null>(null);

  const returnToSetup = useCallback(() => {
    if (trialTimerRef.current) clearTimeout(trialTimerRef.current);
    if (startTimerRef.current) clearTimeout(startTimerRef.current);
    if (countdownTimerRef.current) clearTimeout(countdownTimerRef.current);
    if (distractionTimerRef.current) clearTimeout(distractionTimerRef.current);
    if (distractionOffTimerRef.current)
      clearTimeout(distractionOffTimerRef.current);
    responseLockedRef.current = true;
    trialsRef.current = [];
    setSequence([]);
    setCurrentIndex(0);
    setRespondedIndex(null);
    setActiveTopLight(null);
    setTrials([]);
    setLastSession(null);
    setPhase('setup');
  }, []);
  const { beginTestRoute, completeTestRoute, returnToSetupRoute } =
    useTestRoute({
      basePath: '/capacity-to-act',
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

  useEffect(
    () => () => {
      const context = audioContextRef.current;
      audioContextRef.current = null;
      if (context && context.state !== 'closed') void context.close();
    },
    [],
  );

  const finishSession = useCallback(
    (completedTrials: CapacityTrial[]) => {
      const session: CapacitySession = {
        id: createLocalId(),
        completedAt: new Date().toISOString(),
        settings: { trialCount, intervalMs },
        trials: completedTrials,
        ...summarizeResults(completedTrials),
      };

      setLastSession(session);
      setHistory(currentHistory => {
        const updatedHistory = [session, ...currentHistory].slice(0, 100);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedHistory));
        return updatedHistory;
      });
      setActiveTopLight(null);
      setPhase('complete');
      completeTestRoute();
    },
    [completeTestRoute, intervalMs, trialCount],
  );

  const prepareAudio = useCallback(() => {
    if (
      !audioContextRef.current ||
      audioContextRef.current.state === 'closed'
    ) {
      const AudioContextConstructor =
        window.AudioContext ??
        (window as typeof window & { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (AudioContextConstructor) {
        audioContextRef.current = new AudioContextConstructor();
      }
    }
    if (audioContextRef.current?.state === 'suspended') {
      void audioContextRef.current.resume();
    }
  }, []);

  const playTone = useCallback(
    (tone: Tone) => {
      prepareAudio();
      const context = audioContextRef.current;
      if (!context) return;

      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const start = context.currentTime;
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(tone === 'deep' ? 180 : 880, start);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.16, start + 0.015);
      gain.gain.exponentialRampToValueAtTime(
        0.0001,
        start + TONE_DURATION_SECONDS,
      );
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(start);
      oscillator.stop(start + TONE_DURATION_SECONDS + 0.01);
    },
    [prepareAudio],
  );

  const startSession = useCallback(() => {
    prepareAudio();
    beginTestRoute(phase === 'complete');
    const nextSequence = createSequence(trialCount);
    trialsRef.current = [];
    responseLockedRef.current = false;
    playedToneIndexRef.current = null;
    setSequence(nextSequence);
    setCurrentIndex(0);
    setRespondedIndex(null);
    setStartCountdown(2);
    setActiveTopLight(null);
    setTrials([]);
    setLastSession(null);
    setPhase('starting');
    countdownTimerRef.current = setTimeout(() => setStartCountdown(1), 1_000);
    startTimerRef.current = setTimeout(
      () => setPhase('running'),
      START_DELAY_MS,
    );
  }, [beginTestRoute, phase, prepareAudio, trialCount]);

  useEffect(() => {
    if (phase !== 'running') return;
    let disposed = false;

    const scheduleDistraction = () => {
      const minimumDelay = Math.max(700, intervalMs * 1.25);
      const delay = minimumDelay + Math.random() * intervalMs * 1.75;
      distractionTimerRef.current = setTimeout(() => {
        if (disposed) return;
        setActiveTopLight(Math.random() < 0.5 ? 'left' : 'right');
        const flashDuration = Math.min(700, Math.max(350, intervalMs * 0.55));
        distractionOffTimerRef.current = setTimeout(() => {
          if (disposed) return;
          setActiveTopLight(null);
          scheduleDistraction();
        }, flashDuration);
      }, delay);
    };

    scheduleDistraction();
    return () => {
      disposed = true;
      if (distractionTimerRef.current)
        clearTimeout(distractionTimerRef.current);
      if (distractionOffTimerRef.current)
        clearTimeout(distractionOffTimerRef.current);
    };
  }, [intervalMs, phase]);

  useEffect(() => {
    if (phase !== 'running') return;
    const stimulus = sequence[currentIndex];
    if (!stimulus) return;

    responseLockedRef.current = false;
    shownAtRef.current = performance.now();
    if (
      stimulus.kind === 'tone' &&
      playedToneIndexRef.current !== currentIndex
    ) {
      playedToneIndexRef.current = currentIndex;
      playTone(stimulus.tone);
    }

    trialTimerRef.current = setTimeout(() => {
      let completedTrials = trialsRef.current;
      if (!responseLockedRef.current) {
        completedTrials = [
          ...completedTrials,
          {
            ...stimulus,
            responseAction: null,
            reactionTime: null,
            correct: false,
          },
        ];
        trialsRef.current = completedTrials;
        setTrials(completedTrials);
      }

      if (currentIndex + 1 >= sequence.length) {
        finishSession(completedTrials);
      } else {
        setCurrentIndex(current => current + 1);
      }
    }, intervalMs);

    return () => {
      if (trialTimerRef.current) clearTimeout(trialTimerRef.current);
    };
  }, [currentIndex, finishSession, intervalMs, phase, playTone, sequence]);

  const respond = useCallback(
    (responseAction: CapacityAction) => {
      if (phase !== 'running' || responseLockedRef.current) return;
      const stimulus = sequence[currentIndex];
      if (!stimulus) return;

      responseLockedRef.current = true;
      const result: CapacityTrial = {
        ...stimulus,
        responseAction,
        reactionTime: Math.max(
          1,
          Math.round(performance.now() - shownAtRef.current),
        ),
        correct: responseAction === stimulus.expectedAction,
      };
      const completedTrials = [...trialsRef.current, result];
      trialsRef.current = completedTrials;
      setTrials(completedTrials);
      setRespondedIndex(currentIndex);

      if (currentIndex + 1 >= sequence.length) {
        if (trialTimerRef.current) clearTimeout(trialTimerRef.current);
        finishSession(completedTrials);
      }
    },
    [currentIndex, finishSession, phase, sequence],
  );

  useEffect(() => {
    if (phase !== 'running') return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.repeat) return;
      const key = event.key.toLowerCase();
      const color = capacityColors.find(option => option.key === key);
      if (!color) return;
      event.preventDefault();
      respond(color.id);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [phase, respond]);

  if (phase === 'starting' || phase === 'running') {
    const stimulus = sequence[currentIndex];
    const progress = ((currentIndex + 1) / sequence.length) * 100;
    const stimulusVisible =
      phase === 'running' && respondedIndex !== currentIndex;

    return (
      <main className='flex h-dvh flex-col overflow-hidden bg-slate-950 px-2 py-2 text-white sm:px-6 sm:py-4'>
        <header className='shrink-0'>
          <div className='flex items-center justify-between gap-5'>
            <div>
              <p className='font-mono text-xs font-semibold uppercase tracking-[0.2em] text-pink-300 sm:text-sm'>
                <Localized>
                  {phase === 'starting'
                    ? `Starting in ${startCountdown}`
                    : `Event ${currentIndex + 1} of ${sequence.length}`}
                </Localized>
              </p>
              <p className='mt-0.5 text-[11px] text-slate-500 sm:text-xs'>
                <Localized>
                  {phase === 'starting'
                    ? 'Get ready — the first signal follows after the pause'
                    : 'Respond to the active signal — ignore the upper lights'}
                </Localized>
              </p>
            </div>
            <p className='font-mono text-xs text-slate-400 sm:text-sm'>
              <Localized>
                {phase === 'starting' ? 'Prepare' : `${trials.length} answered`}
              </Localized>
            </p>
          </div>
          <div className='mt-2 h-1 overflow-hidden rounded-full bg-white/5 sm:mt-3 sm:h-1.5'>
            <div
              className='h-full rounded-full bg-pink-300'
              style={{ width: phase === 'starting' ? '0%' : `${progress}%` }}
            />
          </div>
        </header>

        <section className='flex min-h-0 flex-1 items-center justify-center py-1 sm:py-2'>
          <CapacityStimulusPanel
            activeCell={
              stimulusVisible && stimulus?.kind === 'color'
                ? stimulus.cellIndex
                : null
            }
            activeColor={
              stimulusVisible && stimulus?.kind === 'color'
                ? stimulus.color
                : null
            }
            activeTopLight={phase === 'running' ? activeTopLight : null}
            activeWarning={
              stimulusVisible && stimulus?.kind === 'warning'
                ? stimulus.side
                : null
            }
            onRespond={respond}
            disabled={phase === 'starting'}
          />
        </section>

        <footer className='flex shrink-0 justify-center pb-[max(0rem,env(safe-area-inset-bottom))]'>
          <CapacityActionControls
            onRespond={respond}
            disabled={phase === 'starting'}
          />
        </footer>
      </main>
    );
  }

  const summary = lastSession ? summarizeResults(lastSession.trials) : null;

  return (
    <TestPageShell accent='pink'>
      <Localized>
        {phase === 'setup' ? (
          <TestSetupLayout
            accent='pink'
            eyebrow='Capacity to act'
            title={t('capacityToAct.labels.seeHearDecideAct')}
            description={
              <p>
                <Localized id='capacityToAct.instructions.respondToColorsWarningSignsAndTonesWhileResisting' />
              </p>
            }
            actions={
              <>
                <button
                  type='button'
                  onClick={startSession}
                  className='min-h-14 rounded-full bg-pink-300 px-8 font-bold text-slate-950 transition hover:bg-pink-200 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-pink-300'
                >
                  <Localized id='common.actions.startTest' />
                </button>
                <CapacityToActDemo />
              </>
            }
          >
            <div className='space-y-4'>
              <TestPanel
                title={t('common.settings.title')}
                description='Configure the scored events and their main-cycle interval.'
              >
                <div className='grid gap-6 sm:grid-cols-2'>
                  <label className='block'>
                    <span className='flex items-center justify-between text-sm font-semibold text-slate-300'>
                      <Localized id='capacityToAct.labels.numberOfEvents' />
                      <span className='font-mono text-pink-300'>
                        <Localized>{trialCount}</Localized>
                      </span>
                    </span>
                    <ValidatedNumberInput
                      min={MIN_TRIAL_COUNT}
                      max={MAX_TRIAL_COUNT}
                      value={trialCount}
                      normalize={Math.round}
                      onValueChange={setTrialCount}
                      className='mt-3 min-h-12 w-full rounded-xl border border-white/10 bg-slate-950 px-4 font-mono text-white outline-none focus:border-pink-300'
                    />
                    <span className='mt-2 block text-xs text-slate-500'>
                      <Localized id='common.labels.default' />{' '}
                      <Localized>{DEFAULT_TRIAL_COUNT}</Localized>
                    </span>
                  </label>

                  <label className='block'>
                    <span className='flex items-center justify-between text-sm font-semibold text-slate-300'>
                      <Localized id='capacityToAct.settings.mainEventInterval' />
                      <span className='font-mono text-pink-300'>
                        <Localized>{intervalMs}</Localized>
                        <Localized>{' ms'}</Localized>
                      </span>
                    </span>
                    <ValidatedNumberInput
                      min={MIN_INTERVAL_MS}
                      max={MAX_INTERVAL_MS}
                      step='50'
                      value={intervalMs}
                      normalize={value => Math.round(value / 50) * 50}
                      onValueChange={setIntervalMs}
                      className='mt-3 min-h-12 w-full rounded-xl border border-white/10 bg-slate-950 px-4 font-mono text-white outline-none focus:border-pink-300'
                    />
                    <span className='mt-2 block text-xs text-slate-500'>
                      <Localized id='common.labels.default' />{' '}
                      <Localized>{DEFAULT_INTERVAL_MS}</Localized>
                      <Localized>{' ms'}</Localized>
                    </span>
                  </label>
                </div>
              </TestPanel>

              <TestPanel title={t('common.instructions.title')}>
                <InstructionList
                  accent='pink'
                  items={[
                    {
                      title: 'Match colors',
                      description:
                        'Use the W buttons or E, F, Z, J, O for colored circles.',
                    },
                    {
                      title: 'Ignore distractions',
                      description:
                        'Upper lights use a separate random cycle and may overlap other signals. Do nothing for them.',
                    },
                    {
                      title: 'Push pedals',
                      description:
                        'A red ! on the left or right means click the pedal on that side.',
                    },
                    {
                      title: 'Pull levers',
                      description:
                        'Click the left lever for a deep tone and the right lever for a high tone.',
                    },
                    {
                      title: 'Keep pace',
                      description:
                        'After a two-second pause, colors, warnings, and tones follow the configured main interval.',
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
                <p className='font-mono text-sm font-semibold uppercase tracking-[0.3em] text-pink-300'>
                  <Localized id='common.results.sessionComplete' />
                </p>
                <h1 className='mt-4 text-4xl font-black tracking-tight sm:text-6xl'>
                  <Localized id='capacityToAct.results.capacityResults' />
                </h1>
              </div>
              <div className='flex flex-wrap gap-3 self-start sm:self-auto'>
                <button
                  type='button'
                  onClick={returnToSetupRoute}
                  className='min-h-12 rounded-full border border-white/15 px-6 font-bold text-white transition hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-pink-300'
                >
                  <Localized id='common.settings.changeSettings' />
                </button>
                <button
                  type='button'
                  onClick={startSession}
                  className='min-h-12 rounded-full bg-pink-300 px-6 font-bold text-slate-950 transition hover:bg-pink-200 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-pink-300'
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
                      ['Accuracy', `${summary.accuracy}%`, 'text-pink-300'],
                      [
                        'Average response',
                        summary.averageReactionTime === null
                          ? '—'
                          : `${summary.averageReactionTime} ms`,
                        'text-cyan-300',
                      ],
                      ['Incorrect', String(summary.incorrect), 'text-rose-300'],
                      ['Missed', String(summary.missed), 'text-slate-200'],
                    ].map(([label, value, color]) => (
                      <div
                        key={label}
                        className='rounded-3xl border border-white/10 bg-white/[0.05] p-6'
                      >
                        <p className='text-sm font-semibold uppercase tracking-wider text-slate-500'>
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
              <Localized id='capacityToAct.results.capacityHistory' />
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
        <CapacityHistory sessions={history} />
        <p className='mt-8 max-w-2xl text-sm leading-6 text-slate-600'>
          <Localized id='capacityToAct.instructions.thisIsAPracticeToolNotAClinicalAssessment' />
        </p>
      </section>
    </TestPageShell>
  );
}
