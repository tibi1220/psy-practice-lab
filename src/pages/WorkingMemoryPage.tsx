import {
  LocalizedDate,
  Localized,
  useTextTranslation,
} from '../components/Localization';
import { useCallback, useEffect, useRef, useState } from 'react';
import { GuidedDemoModal } from '../components/GuidedDemoModal';
import {
  DotField,
  SpatialQuestion,
  WorkingMemoryReview,
  WorkingMemoryRound,
} from '../components/WorkingMemoryTask';
import {
  practicePrimary,
  practiceSecondary,
} from '../components/ReasoningPractice';
import {
  InstructionList,
  TestPageShell,
  TestPanel,
  TestSetupLayout,
} from '../components/TestPage';
import { ValidatedNumberInput } from '../components/ValidatedNumberInput';
import { useTestRoute } from '../hooks/useTestRoute';
import { createLocalId } from '../lib/create-local-id';
import {
  createMemoryTask,
  isMemoryResponse,
  isMemoryTask,
  memoryScore,
  memoryDifficulty,
  MEMORY_LENGTHS,
  memoryTiming,
} from '../lib/working-memory';
import type { MemoryResponse, MemoryTask } from '../lib/working-memory';

type Level = 'adaptive' | 'easy' | 'medium' | 'hard';
type Mode = 'timed' | 'untimed';
type Trial = { task: MemoryTask; response: MemoryResponse; seconds: number };
type Session = {
  id: string;
  completedAt: string;
  mode: Mode;
  level: Level;
  durationSeconds: number;
  trials: Trial[];
};
const STORAGE_KEY = 'psy-working-memory-sessions';
const field =
  'mt-2 min-h-12 w-full rounded-xl border border-white/10 bg-slate-950 px-4 text-white focus:border-emerald-300';
const demoTask = createMemoryTask(3, () => 0.37);
function readHistory(): Session[] {
  try {
    const value: unknown = JSON.parse(
      localStorage.getItem(STORAGE_KEY) ?? '[]',
    );
    if (!Array.isArray(value)) return [];
    return value
      .filter(
        (session): session is Session =>
          session &&
          typeof session.id === 'string' &&
          Number.isFinite(Date.parse(session.completedAt)) &&
          ['timed', 'untimed'].includes(session.mode) &&
          ['adaptive', 'easy', 'medium', 'hard'].includes(session.level) &&
          Number.isFinite(session.durationSeconds) &&
          session.durationSeconds >= 0 &&
          Array.isArray(session.trials) &&
          session.trials.length <= 50 &&
          session.trials.every(
            (trial: Trial) =>
              trial &&
              isMemoryTask(trial.task) &&
              isMemoryResponse(trial.task, trial.response) &&
              trial.response.recalled.length === trial.task.sequence.length &&
              trial.response.judgments.length === trial.task.spatial.length &&
              Number.isFinite(trial.seconds) &&
              trial.seconds >= 0,
          ),
      )
      .slice(0, 100);
  } catch {
    return [];
  }
}
function Summary({ trials }: { trials: Trial[] }) {
  const scores = trials.map(trial => memoryScore(trial.task, trial.response));
  const positions = trials.reduce(
    (total, trial) => total + trial.task.sequence.length,
    0,
  );
  return (
    <div className='mt-4 rounded-2xl border border-emerald-300/20 bg-emerald-300/10 p-5'>
      <p className='font-mono text-xl font-bold text-emerald-300'>
        <Localized>
          {scores.filter(score => score.perfectRecall).length}
        </Localized>
        <Localized>{' / '}</Localized>
        <Localized>{trials.length} </Localized>
        <Localized id='workingMemory.labels.sequencesRecalledPerfectly' />
      </p>
      <p className='mt-2 text-sm text-slate-300'>
        <Localized id='workingMemory.labels.orderedDotRecall' />
        <Localized> </Localized>
        <Localized>
          {scores.reduce((total, score) => total + score.recalled, 0)}
        </Localized>
        <Localized>{' /'}</Localized>
        <Localized> </Localized>
        <Localized>{positions}</Localized>{' '}
        <Localized id='common.labels.spatialAnswersDetail' />
        <Localized> </Localized>
        <Localized>
          {scores.reduce((total, score) => total + score.spatial, 0)}
        </Localized>
        <Localized>{' /'}</Localized>
        <Localized> </Localized>
        <Localized>{positions}</Localized>
      </p>
    </div>
  );
}
function Review({ trials }: { trials: Trial[] }) {
  return (
    <div className='mt-6 space-y-4'>
      <Localized>
        {trials.map((trial, index) => {
          const score = memoryScore(trial.task, trial.response);
          return (
            <details
              key={index}
              className='rounded-2xl border border-white/10 bg-white/5 p-5'
            >
              <summary className='cursor-pointer font-semibold'>
                <Localized id='common.labels.task' />{' '}
                <Localized>{index + 1}</Localized>
                <Localized>{' · '}</Localized>
                <Localized>{score.recalled}</Localized>
                <Localized>{'/'}</Localized>
                <Localized>{trial.task.sequence.length} </Localized>
                <Localized id='common.labels.dotsInOrder' />{' '}
                <Localized>{score.spatial}</Localized>
                <Localized>{'/'}</Localized>
                <Localized>{trial.task.spatial.length} </Localized>
                <Localized id='common.labels.spatialAnswers' />{' '}
                <Localized>{trial.seconds.toFixed(1)}</Localized>
                <Localized>{' s'}</Localized>
              </summary>
              <div className='mt-5'>
                <WorkingMemoryReview
                  task={trial.task}
                  response={trial.response}
                />
              </div>
            </details>
          );
        })}
      </Localized>
    </div>
  );
}
function DemoPractice() {
  const [attempt, setAttempt] = useState(0);
  const [started, setStarted] = useState(false);
  const [response, setResponse] = useState<MemoryResponse | null>(null);
  if (!started || response)
    return (
      <div className='w-full'>
        <Localized>
          {response && (
            <>
              <Summary trials={[{ task: demoTask, response, seconds: 0 }]} />
              <WorkingMemoryReview
                task={demoTask}
                response={response}
              />
            </>
          )}
        </Localized>
        <div className='mt-4 text-center'>
          <button
            type='button'
            className={practicePrimary}
            onClick={() => {
              setResponse(null);
              setAttempt(current => current + 1);
              setStarted(true);
            }}
          >
            <Localized>
              {response ? 'Try demo again' : 'Begin practice task'}
            </Localized>
          </button>
        </div>
      </div>
    );
  return (
    <div className='w-full'>
      <WorkingMemoryRound
        key={attempt}
        task={demoTask}
        flashSeconds={1.5}
        spatialSeconds={15}
        submit={setResponse}
      />
    </div>
  );
}
function WorkingMemoryDemo() {
  const t = useTextTranslation();

  return (
    <GuidedDemoModal
      title={t('workingMemory.tutorial.workingMemoryWalkthrough')}
      theme='emerald'
      introduction='Keep dot locations in mind while answering spatial questions. Practice answers are not saved.'
      steps={[
        {
          title: 'Remember a highlighted dot',
          description:
            'One dot lights up briefly. Remember its position and its place in the sequence. The same dot field returns for the next flash and for recall.',
          visual: (
            <div className='w-full'>
              <DotField
                dots={demoTask.dots}
                highlighted={demoTask.sequence[0]}
              />
            </div>
          ),
        },
        {
          title: 'Process another task',
          description:
            'After each dot, answer a Yes/No spatial question. Check reflection across a vertical divider, matching under rotation, or line-figure addition/subtraction. Keep the remembered dots in mind.',
          visual: (
            <div className='w-full'>
              <SpatialQuestion
                task={demoTask.spatial[0]}
                explanation
              />
            </div>
          ),
        },
        {
          title: 'Recall the order',
          description:
            'After the final spatial question, select all remembered dots in their original order. Numbers show your selection order. Undo or clear choices before submitting.',
          visual: (
            <div className='w-full'>
              <DotField
                dots={demoTask.dots}
                selected={demoTask.sequence}
              />
            </div>
          ),
        },
        {
          title: 'Try a complete task',
          description:
            'Start the practice task to try all phases. Each spatial question has 15 seconds in this demo. A timeout counts as unanswered and continues to the next phase.',
          visual: <DemoPractice />,
        },
      ]}
    />
  );
}

export default function WorkingMemoryPage() {
  const t = useTextTranslation();

  const [view, setView] = useState<'setup' | 'test' | 'result'>('setup');
  const [mode, setMode] = useState<Mode>('timed');
  const [level, setLevel] = useState<Level>('adaptive');
  const [minutes, setMinutes] = useState(9);
  const [taskCount, setTaskCount] = useState(9);
  const [flashSeconds, setFlashSeconds] = useState(1.5);
  const [spatialSeconds, setSpatialSeconds] = useState(10);
  const [task, setTask] = useState<MemoryTask | null>(null);
  const [trials, setTrials] = useState<Trial[]>([]);
  const [remaining, setRemaining] = useState(0);
  const [session, setSession] = useState<Session | null>(null);
  const [history, setHistory] = useState(readHistory);
  const [storageError, setStorageError] = useState(false);
  const active = useRef(false);
  const trialsRef = useRef<Trial[]>([]);
  const started = useRef(0);
  const taskStarted = useRef(0);
  const deadline = useRef(Infinity);
  const returnToSetup = useCallback(() => {
    active.current = false;
    setView('setup');
  }, []);
  const { beginTestRoute, completeTestRoute, returnToSetupRoute } =
    useTestRoute({
      basePath: '/working-memory',
      view,
      onReturnToSetup: returnToSetup,
    });
  const finish = useCallback(() => {
    if (!active.current) return;
    active.current = false;
    const completed: Session = {
      id: createLocalId(),
      completedAt: new Date().toISOString(),
      mode,
      level,
      durationSeconds:
        (Math.min(performance.now(), deadline.current) - started.current) /
        1000,
      trials: [...trialsRef.current],
    };
    const updated = [completed, ...history].slice(0, 100);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      setStorageError(false);
    } catch {
      setStorageError(true);
    }
    setSession(completed);
    setHistory(updated);
    setView('result');
    completeTestRoute();
  }, [mode, level, history, completeTestRoute]);
  useEffect(() => {
    if (view !== 'test' || mode !== 'timed') return;
    const timer = window.setInterval(() => {
      const time = Math.max(0, deadline.current - performance.now());
      setRemaining(Math.ceil(time / 1000));
      if (time === 0) finish();
    }, 100);
    return () => window.clearInterval(timer);
  }, [view, mode, finish]);
  const makeTask = (completed: Trial[]) => {
    const successful = (trial: Trial) => {
      const score = memoryScore(trial.task, trial.response);
      return (
        score.perfectRecall &&
        score.spatial >= Math.ceil(trial.task.spatial.length / 2)
      );
    };
    const difficulty = memoryDifficulty(
      completed.length,
      level,
      completed.filter(successful).length,
    );
    return createMemoryTask(
      MEMORY_LENGTHS[difficulty],
      Math.random,
      completed.length,
      difficulty,
    );
  };
  const start = () => {
    const first = makeTask([]);
    const now = performance.now();
    started.current = now;
    taskStarted.current = now;
    deadline.current = mode === 'timed' ? now + minutes * 60_000 : Infinity;
    trialsRef.current = [];
    active.current = true;
    setTask(first);
    setTrials([]);
    setSession(null);
    setRemaining(minutes * 60);
    setView('test');
    beginTestRoute();
  };
  const submit = (response: MemoryResponse) => {
    if (!active.current || !task) return;
    const now = performance.now();
    if (now >= deadline.current) {
      finish();
      return;
    }
    const completed = [
      ...trialsRef.current,
      { task, response, seconds: (now - taskStarted.current) / 1000 },
    ];
    trialsRef.current = completed;
    setTrials(completed);
    if (completed.length >= taskCount) {
      finish();
      return;
    }
    setTask(makeTask(completed));
    taskStarted.current = performance.now();
  };

  const timing = memoryTiming(
    task?.difficulty ?? 0,
    flashSeconds,
    spatialSeconds,
  );
  if (view === 'test' && task)
    return (
      <main className='min-h-dvh bg-slate-950 px-4 py-6 text-white'>
        <div className='mx-auto max-w-4xl'>
          <header className='mb-6 flex items-start justify-between gap-4'>
            <div>
              <p className='font-mono text-sm text-emerald-300'>
                <Localized id='common.labels.task' />{' '}
                <Localized>{trials.length + 1}</Localized>{' '}
                <Localized id='distributiveAttention.labels.of' />{' '}
                <Localized>{taskCount}</Localized>
                <Localized>{' · '}</Localized>
                <Localized>{task.sequence.length} </Localized>
                <Localized id='common.labels.dotsLevel' />{' '}
                <Localized>{(task.difficulty ?? 0) + 1}</Localized>
              </p>
              <p className='mt-1 text-xs text-slate-400'>
                <Localized>{timing.flashSeconds}</Localized>{' '}
                <Localized id='common.settings.sPerDot' />{' '}
                <Localized>{timing.spatialSeconds}</Localized>{' '}
                <Localized id='common.settings.sPerSpatialQuestion' />
              </p>
              <h1 className='mt-2 text-2xl font-bold'>
                <Localized id='tests.workingMemory.name' />
              </h1>
            </div>
            <Localized>
              {mode === 'timed' && (
                <p
                  role='timer'
                  aria-label={t('workingMemory.labels.sessionTimeRemaining')}
                  className='font-mono text-2xl'
                >
                  <Localized>{Math.floor(remaining / 60)}</Localized>
                  <Localized>{':'}</Localized>
                  <Localized>
                    {String(remaining % 60).padStart(2, '0')}
                  </Localized>
                </p>
              )}
            </Localized>
          </header>
          <WorkingMemoryRound
            key={trials.length}
            task={task}
            flashSeconds={timing.flashSeconds}
            spatialSeconds={timing.spatialSeconds}
            submit={submit}
          />
          <footer className='mt-8 flex justify-between gap-3'>
            <button
              type='button'
              className={practiceSecondary}
              onClick={returnToSetupRoute}
            >
              <Localized id='common.actions.cancelSession' />
            </button>
            <button
              type='button'
              className={practiceSecondary}
              onClick={finish}
            >
              <Localized id='common.actions.finishSession' />
            </button>
          </footer>
        </div>
      </main>
    );
  return (
    <TestPageShell accent='emerald'>
      <Localized>
        {view === 'setup' ? (
          <TestSetupLayout
            accent='emerald'
            eyebrow='Working memory · gridChallenge'
            title={t('workingMemory.labels.rememberWhileYouReason')}
            description='Remember a sequence of highlighted dots while answering interleaved spatial questions, then recall the dots in order.'
            actions={
              <>
                <button
                  type='button'
                  className={practicePrimary}
                  onClick={start}
                >
                  <Localized id='common.actions.startTest' />
                </button>
                <WorkingMemoryDemo />
              </>
            }
          >
            <div className='space-y-4'>
              <TestPanel title={t('common.settings.title')}>
                <label className='block text-sm font-semibold'>
                  <Localized id='common.settings.practiceMode' />
                  <select
                    className={field}
                    value={mode}
                    onChange={event => setMode(event.target.value as Mode)}
                  >
                    <option value='timed'>
                      <Localized id='workingMemory.labels.timedSession' />
                    </option>
                    <option value='untimed'>
                      <Localized id='workingMemory.labels.untimedSession' />
                    </option>
                  </select>
                </label>
                <label className='mt-5 block text-sm font-semibold'>
                  <Localized id='common.business.difficulty' />
                  <select
                    className={field}
                    value={level}
                    onChange={event => setLevel(event.target.value as Level)}
                  >
                    <option value='adaptive'>
                      <Localized id='workingMemory.labels.adaptive3To8Dots' />
                    </option>
                    <option value='easy'>
                      <Localized id='workingMemory.labels.easy3Dots' />
                    </option>
                    <option value='medium'>
                      <Localized id='workingMemory.labels.medium4Dots' />
                    </option>
                    <option value='hard'>
                      <Localized id='workingMemory.labels.hard5To8Dots' />
                    </option>
                  </select>
                </label>
                <p className='mt-2 text-xs leading-5 text-slate-500'>
                  <Localized id='workingMemory.instructions.adaptivePracticeIncreasesDifficultyEveryTwoTasksFasterAfter' />
                </p>
                <Localized>
                  {mode === 'timed' && (
                    <label className='mt-5 block text-sm font-semibold'>
                      <Localized id='common.settings.testLengthMinutes' />
                      <ValidatedNumberInput
                        className={field}
                        value={minutes}
                        min={1}
                        max={30}
                        normalize={Math.round}
                        onValueChange={setMinutes}
                      />
                    </label>
                  )}
                </Localized>
                <label className='mt-5 block text-sm font-semibold'>
                  <Localized id='workingMemory.labels.numberOfTasks' />
                  <ValidatedNumberInput
                    className={field}
                    value={taskCount}
                    min={1}
                    max={50}
                    normalize={Math.round}
                    onValueChange={setTaskCount}
                  />
                </label>
                <label className='mt-5 block text-sm font-semibold'>
                  <Localized id='workingMemory.labels.initialDotExposureSeconds' />
                  <ValidatedNumberInput
                    className={field}
                    value={flashSeconds}
                    min={0.5}
                    max={5}
                    normalize={value => Math.round(value * 10) / 10}
                    onValueChange={setFlashSeconds}
                  />
                </label>
                <label className='mt-5 block text-sm font-semibold'>
                  <Localized id='workingMemory.labels.initialTimePerSpatialQuestionSeconds' />
                  <ValidatedNumberInput
                    className={field}
                    value={spatialSeconds}
                    min={3}
                    max={30}
                    normalize={Math.round}
                    onValueChange={setSpatialSeconds}
                  />
                </label>
              </TestPanel>
              <TestPanel title={t('common.instructions.title')}>
                <InstructionList
                  accent='emerald'
                  items={[
                    {
                      title: 'Watch each dot',
                      description:
                        'A dot briefly lights up. Remember its location and its place in the sequence. The dot positions stay fixed throughout each task.',
                    },
                    {
                      title: 'Answer between dots',
                      description:
                        'Answer Yes or No to symmetry, rotation, and figure addition/subtraction questions while keeping the sequence in mind. Timeouts count as unanswered and continue automatically.',
                    },
                    {
                      title: 'Recall in order',
                      description:
                        'After the last spatial question, select all remembered dots in the order they appeared. Undo or clear selections before submitting.',
                    },
                    {
                      title: 'Review both skills',
                      description:
                        'Memory and spatial answers are scored separately. The session ends at the task limit or time limit; only submitted sequences are included in results.',
                    },
                  ]}
                />
              </TestPanel>
            </div>
          </TestSetupLayout>
        ) : (
          session && (
            <section className='py-10'>
              <p className='font-mono text-sm uppercase tracking-widest text-emerald-300'>
                <Localized id='common.results.sessionComplete' />
              </p>
              <h1 className='mt-4 text-4xl font-black'>
                <Localized id='workingMemory.results.workingMemoryResults' />
              </h1>
              <Summary trials={session.trials} />
              <p className='mt-3 text-sm text-slate-400'>
                <Localized>{session.durationSeconds.toFixed(1)}</Localized>{' '}
                <Localized id='common.labels.sTotal' />{' '}
                <Localized>{session.mode}</Localized>
                <Localized>{' ·'}</Localized>
                <Localized> </Localized>
                <Localized>{session.level}</Localized>{' '}
                <Localized id='common.labels.submittedSequencesOnly' />
              </p>
              <button
                type='button'
                className={`${practicePrimary} mt-6`}
                onClick={returnToSetupRoute}
              >
                <Localized id='common.settings.changeSettings' />
              </button>
              <Review trials={session.trials} />
            </section>
          )
        )}
      </Localized>
      <section className='border-t border-white/10 py-10'>
        <h2 className='text-2xl font-bold'>
          <Localized id='workingMemory.results.workingMemoryHistory' />
        </h2>
        <p className='mt-2 text-sm text-slate-500'>
          <Localized id='common.results.savedOnThisDeviceUpTo100Sessions' />
        </p>
        <Localized>
          {storageError && (
            <p
              role='status'
              className='mt-3 text-amber-300'
            >
              <Localized id='common.results.browserStorageIsUnavailableThisResultIsAvailableUntil' />
            </p>
          )}
        </Localized>
        <Localized>
          {history.length === 0 ? (
            <p className='mt-6 text-slate-400'>
              <Localized id='common.results.completeASessionToSeeYourResultsHere' />
            </p>
          ) : (
            history.map(saved => (
              <details
                key={saved.id}
                className='mt-4 rounded-2xl border border-white/10 p-5'
              >
                <summary className='cursor-pointer'>
                  <LocalizedDate value={saved.completedAt} />
                  <Localized>{' · '}</Localized>
                  <Localized>{saved.mode}</Localized>
                  <Localized>{' ·'}</Localized>
                  <Localized> </Localized>
                  <Localized>{saved.level}</Localized>
                </summary>
                <Summary trials={saved.trials} />
                <Review trials={saved.trials} />
              </details>
            ))
          )}
        </Localized>
      </section>
    </TestPageShell>
  );
}
