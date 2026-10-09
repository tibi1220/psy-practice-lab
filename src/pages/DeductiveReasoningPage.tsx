import {
  LocalizedDate,
  Localized,
  useTextTranslation,
} from '../components/Localization';
import { useCallback, useEffect, useRef, useState } from 'react';
import { DeductiveBoard, ShapeChoices } from '../components/DeductiveBoard';
import { DeductiveRedoModal } from '../components/DeductiveRedoModal';
import { GuidedDemoModal } from '../components/GuidedDemoModal';
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
  createPracticePuzzle,
  createSolvingGuide,
  EXAMPLE_PUZZLES,
  SHAPE_NAMES,
} from '../lib/deductive-reasoning';
import type { DeductiveLevel, Puzzle } from '../lib/deductive-reasoning';

type Mode = 'rounds' | 'timed';
type Level = DeductiveLevel;
type Answer = { puzzle: Puzzle; selected: number; seconds: number };
type Session = {
  id: string;
  completedAt: string;
  mode: Mode | 'examples';
  level: Level;
  durationSeconds: number;
  answers: Answer[];
};
const STORAGE_KEY = 'psy-deductive-reasoning-sessions';
const primary =
  'min-h-12 rounded-full bg-emerald-300 px-6 font-bold text-slate-950 hover:bg-emerald-200 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-300';
const secondary =
  'min-h-12 rounded-full border border-white/15 px-5 font-semibold hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-emerald-300';
const field =
  'mt-2 min-h-12 w-full rounded-xl border border-white/10 bg-slate-950 px-4 text-white focus:border-emerald-300';

function readHistory(): Session[] {
  try {
    const stored: unknown = JSON.parse(
      localStorage.getItem(STORAGE_KEY) ?? '[]',
    );
    if (!Array.isArray(stored)) return [];
    return stored
      .filter(
        (session): session is Session =>
          !!session &&
          typeof session.id === 'string' &&
          typeof session.completedAt === 'string' &&
          ['examples', 'rounds', 'timed'].includes(session.mode) &&
          ['easy', 'hard', 'extra-hard', 'adaptive'].includes(session.level) &&
          Number.isFinite(session.durationSeconds) &&
          Array.isArray(session.answers) &&
          session.answers.every(
            (answer: Answer) =>
              answer &&
              Number.isFinite(answer.seconds) &&
              Number.isInteger(answer.selected) &&
              answer.puzzle &&
              [4, 5].includes(answer.puzzle.size) &&
              Array.isArray(answer.puzzle.cells) &&
              (answer.puzzle.palette === undefined ||
                ['colored', 'gray', 'black'].includes(answer.puzzle.palette)) &&
              answer.puzzle.cells.length === answer.puzzle.size ** 2 &&
              answer.puzzle.cells.every(
                value =>
                  value === null ||
                  (Number.isInteger(value) &&
                    value >= 0 &&
                    value < answer.puzzle.size),
              ) &&
              Number.isInteger(answer.puzzle.target) &&
              answer.puzzle.target >= 0 &&
              answer.puzzle.target < answer.puzzle.cells.length &&
              Number.isInteger(answer.puzzle.answer) &&
              answer.puzzle.answer >= 0 &&
              answer.puzzle.answer < answer.puzzle.size &&
              answer.selected >= 0 &&
              answer.selected < answer.puzzle.size,
          ),
      )
      .slice(0, 100);
  } catch {
    return [];
  }
}

function Summary({ session }: { session: Session }) {
  const correct = session.answers.filter(
    answer => answer.selected === answer.puzzle.answer,
  ).length;
  return (
    <p className='mt-3 font-mono text-emerald-300'>
      <Localized>{correct}</Localized>
      <Localized>{' / '}</Localized>
      <Localized>{session.answers.length}</Localized>{' '}
      <Localized id='common.results.correctDetail2' />
      <Localized> </Localized>
      <Localized>
        {session.answers.length
          ? Math.round((correct / session.answers.length) * 100)
          : 0}
      </Localized>
      <Localized>{'% · '}</Localized>
      <Localized>{session.durationSeconds.toFixed(1)}</Localized>
      <Localized>{' s'}</Localized>
    </p>
  );
}

function PuzzleSolution({ puzzle }: { puzzle: Puzzle }) {
  const t = useTextTranslation();

  const [fullView, setFullView] = useState(true);
  return (
    <>
      <div
        role='group'
        aria-label={t('deductiveReasoning.labels.solutionDisplay')}
        className='mb-4 flex flex-wrap justify-center gap-2'
      >
        <button
          type='button'
          aria-pressed={!fullView}
          className={`${secondary} ${!fullView ? 'border-emerald-300 bg-emerald-300/10 text-emerald-200' : ''}`}
          onClick={() => setFullView(false)}
        >
          <Localized id='deductiveReasoning.views.solution' />
        </button>
        <button
          type='button'
          aria-pressed={fullView}
          className={`${secondary} ${fullView ? 'border-emerald-300 bg-emerald-300/10 text-emerald-200' : ''}`}
          onClick={() => setFullView(true)}
        >
          <Localized id='deductiveReasoning.views.full' />
        </button>
      </div>
      <DeductiveBoard
        puzzle={puzzle}
        reveal
        showSolution={fullView}
      />
      <p className='mt-3 text-xs leading-5 text-slate-400'>
        <Localized>
          {fullView
            ? 'One valid completed grid. Added symbols are semi-transparent with dashed cell borders; other completions may also be valid.'
            : 'Original clues with the correct shape in the question-mark cell.'}
        </Localized>
      </p>
    </>
  );
}

function AnswerReview({ answers }: { answers: Answer[] }) {
  return (
    <div className='mt-6 grid gap-4 md:grid-cols-2'>
      <Localized>
        {answers.map((answer, index) => (
          <details
            key={index}
            className='rounded-2xl border border-white/10 bg-white/5 p-5'
          >
            <summary className='cursor-pointer font-semibold'>
              <Localized id='common.labels.question' />{' '}
              <Localized>{index + 1}</Localized>
              <Localized>{' ·'}</Localized>
              <Localized> </Localized>
              <Localized>
                {answer.selected === answer.puzzle.answer
                  ? 'Correct'
                  : 'Incorrect'}{' '}
              </Localized>
              <Localized>{'· '}</Localized>
              <Localized>{answer.seconds.toFixed(1)}</Localized>
              <Localized>{' s'}</Localized>
            </summary>
            <p className='my-4 text-sm text-slate-300'>
              <Localized id='common.labels.yourAnswer' />{' '}
              <Localized>{SHAPE_NAMES[answer.selected]}</Localized>
              <Localized id='common.results.correctAnswer' />
              <Localized> </Localized>
              <Localized>{SHAPE_NAMES[answer.puzzle.answer]}</Localized>
              <Localized>{'.'}</Localized>
            </p>
            <PuzzleSolution puzzle={answer.puzzle} />
            <div className='mt-4 flex flex-wrap justify-center gap-3'>
              <DeductiveRedoModal
                puzzle={answer.puzzle}
                question={index + 1}
              />
              <SolvingWalkthrough
                puzzle={answer.puzzle}
                question={index + 1}
              />
            </div>
            <Localized>
              {answer.puzzle.rationale && (
                <p className='mt-4 text-sm leading-6 text-slate-400'>
                  <Localized>{answer.puzzle.rationale}</Localized>
                </p>
              )}
            </Localized>
          </details>
        ))}
      </Localized>
    </div>
  );
}

function SolvingWalkthrough({
  puzzle,
  question,
}: {
  puzzle: Puzzle;
  question: number;
}) {
  const t = useTextTranslation();

  const steps = useCallback(() => {
    const guide = createSolvingGuide(puzzle, t);
    return [
      {
        title: 'Focus on the target',
        description: t(
          'deductiveReasoning.messages.findTheMissingShapeAtRowPuzzleColumnPuzzle2',
          {
            puzzle: Math.floor(puzzle.target / puzzle.size) + 1,
            puzzle2: (puzzle.target % puzzle.size) + 1,
            guide: guide.shortest
              ? 'This is a shortest chain of single-cell row and column deductions.'
              : 'This route uses forced placements first, then checks remaining target alternatives if needed.',
          },
        ),
        visual: (
          <div className='w-full'>
            <DeductiveBoard puzzle={puzzle} />
          </div>
        ),
      },
      ...guide.steps.map((step, index) => {
        const notes = Object.fromEntries(
          step.cells.flatMap((value, cell) =>
            puzzle.cells[cell] === null &&
            cell !== puzzle.target &&
            value !== null
              ? [[cell, value]]
              : [],
          ),
        );
        return {
          title:
            step.index === puzzle.target
              ? t('deductiveReasoning.messages.answerStep', {
                  step: SHAPE_NAMES[step.value],
                })
              : t('deductiveReasoning.messages.placeStepAtRStep2CStep3', {
                  step: SHAPE_NAMES[step.value],
                  step2: Math.floor(step.index / puzzle.size) + 1,
                  step3: (step.index % puzzle.size) + 1,
                }),
          description: step.description,
          visual: (
            <div className='w-full'>
              <DeductiveBoard
                puzzle={puzzle}
                notes={notes}
                selectedCell={step.index}
                reveal={step.index === puzzle.target}
              />
              <p className='mt-3 text-center text-xs text-slate-400'>
                <Localized id='deductiveReasoning.labels.deduction' />{' '}
                <Localized>{index + 1}</Localized>{' '}
                <Localized id='distributiveAttention.labels.of' />{' '}
                <Localized>{guide.steps.length}</Localized>{' '}
                <Localized id='deductiveReasoning.labels.highlightedCellIsTheCurrentStep' />
              </p>
            </div>
          ),
        };
      }),
    ];
  }, [puzzle, t]);
  return (
    <GuidedDemoModal
      title={t('deductiveReasoning.messages.questionQuestionFastSolvingRoute', {
        question: question,
      })}
      introduction='Follow a focused route from the original clues to the missing shape.'
      triggerLabel='Show fastest solving route'
      eyebrow='Solution walkthrough'
      theme='emerald'
      steps={steps}
    />
  );
}

function DeductiveDemo() {
  const t = useTextTranslation();

  const example = EXAMPLE_PUZZLES[0];
  const [choice, setChoice] = useState<number | null>(null);
  return (
    <GuidedDemoModal
      title={t('deductiveReasoning.tutorial.deductiveReasoningWalkthrough')}
      theme='emerald'
      introduction='Find the missing shape using the row and column rules. Demo answers are not saved.'
      steps={[
        {
          title: 'One of each shape',
          description:
            'Every row and column contains each shape exactly once. There are no smaller box rules.',
          visual: <DeductiveBoard puzzle={example} />,
        },
        {
          title: 'Look down the target column',
          description:
            'Column 3 already has a cross, star, and triangle. Only the circle is missing. You do not need to solve every blank.',
          visual: (
            <DeductiveBoard
              puzzle={example}
              reveal
            />
          ),
        },
        {
          title: 'Try an answer',
          description:
            'During a test, the answer buttons submit immediately. To make notes, select an empty cell first; then the buttons place a note instead.',
          visual: (
            <div className='w-full'>
              <DeductiveBoard puzzle={example} />
              <ShapeChoices
                size={4}
                label='Demo answer'
                onChoose={setChoice}
              />
              <p
                aria-live='polite'
                className='mt-4 text-center text-emerald-200'
              >
                <Localized>
                  {choice === null
                    ? 'Choose the missing shape.'
                    : choice === example.answer
                      ? 'Correct! The missing shape is a circle.'
                      : 'Try again: which shape is missing from column 3?'}
                </Localized>
              </p>
            </div>
          ),
        },
      ]}
    />
  );
}

export default function DeductiveReasoningPage() {
  const t = useTextTranslation();

  const [view, setView] = useState<'setup' | 'test' | 'result'>('setup');
  const [mode, setMode] = useState<Mode>('timed');
  const [level, setLevel] = useState<Level>('adaptive');
  const [roundCount, setRoundCount] = useState(20);
  const [minutes, setMinutes] = useState(6);
  const [puzzle, setPuzzle] = useState<Puzzle>(EXAMPLE_PUZZLES[0]);
  const [notes, setNotes] = useState<Record<number, number>>({});
  const [selectedCell, setSelectedCell] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<{
    selected: number;
    correct: boolean;
  } | null>(null);
  const [remaining, setRemaining] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [session, setSession] = useState<Session | null>(null);
  const [history, setHistory] = useState<Session[]>(readHistory);
  const [storageError, setStorageError] = useState(false);
  const activeRef = useRef(false);
  const submittedRef = useRef(false);
  const answersRef = useRef<Answer[]>([]);
  const startedRef = useRef(0);
  const questionStartedRef = useRef(0);
  const deadlineRef = useRef(0);
  const returnToSetup = useCallback(() => {
    activeRef.current = false;
    setView('setup');
    setNotes({});
    setSelectedCell(null);
    setFeedback(null);
    submittedRef.current = false;
  }, []);
  const { beginTestRoute, completeTestRoute, returnToSetupRoute } =
    useTestRoute({
      basePath: '/deductive-reasoning',
      view,
      onReturnToSetup: returnToSetup,
    });

  const finish = useCallback(() => {
    if (!activeRef.current) return;
    activeRef.current = false;
    setFeedback(null);
    submittedRef.current = false;
    const completed: Session = {
      id: createLocalId(),
      completedAt: new Date().toISOString(),
      mode,
      level,
      durationSeconds:
        (Math.min(performance.now(), deadlineRef.current) -
          startedRef.current) /
        1000,
      answers: [...answersRef.current],
    };
    const updated = [completed, ...history].slice(0, 100);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {
      setStorageError(true);
    }
    setHistory(updated);
    setSession(completed);
    setView('result');
    completeTestRoute();
  }, [mode, level, history, completeTestRoute]);

  useEffect(() => {
    if (view !== 'test' || mode !== 'timed') return;
    const timer = window.setInterval(() => {
      const timeLeft = Math.max(0, deadlineRef.current - performance.now());
      setRemaining(Math.ceil(timeLeft / 1000));
      if (timeLeft === 0) finish();
    }, 200);
    return () => window.clearInterval(timer);
  }, [view, mode, finish]);

  const nextPuzzle = (completed: Answer[]) => {
    return createPracticePuzzle(level, completed);
  };

  useEffect(() => {
    if (view !== 'test' || feedback === null) return;
    const timer = window.setTimeout(() => {
      if (!activeRef.current) return;
      const completed = answersRef.current;
      if (
        performance.now() >= deadlineRef.current ||
        (mode === 'rounds' && completed.length >= roundCount)
      ) {
        finish();
        return;
      }
      setPuzzle(createPracticePuzzle(level, completed));
      setNotes({});
      setSelectedCell(null);
      setFeedback(null);
      submittedRef.current = false;
      questionStartedRef.current = performance.now();
    }, 600);
    return () => window.clearTimeout(timer);
  }, [view, feedback, mode, roundCount, level, finish]);

  const start = () => {
    const first = nextPuzzle([]);
    const now = performance.now();
    startedRef.current = now;
    questionStartedRef.current = now;
    deadlineRef.current = mode === 'timed' ? now + minutes * 60_000 : Infinity;
    answersRef.current = [];
    activeRef.current = true;
    submittedRef.current = false;
    setFeedback(null);
    setAnswers([]);
    setPuzzle(first);
    setNotes({});
    setSelectedCell(null);
    setRemaining(minutes * 60);
    setSession(null);
    setView('test');
    beginTestRoute();
  };

  const choose = (value: number) => {
    if (!activeRef.current || submittedRef.current) return;
    const now = performance.now();
    if (now >= deadlineRef.current) {
      finish();
      return;
    }
    if (selectedCell !== null) {
      setNotes(current => ({ ...current, [selectedCell]: value }));
      return;
    }
    const completed = [
      ...answersRef.current,
      {
        puzzle,
        selected: value,
        seconds: (now - questionStartedRef.current) / 1000,
      },
    ];
    answersRef.current = completed;
    submittedRef.current = true;
    setAnswers(completed);
    setFeedback({ selected: value, correct: value === puzzle.answer });
  };

  if (view === 'test')
    return (
      <main className='min-h-dvh bg-slate-950 px-4 py-6 text-white'>
        <div className='mx-auto max-w-2xl'>
          <header className='mb-6 flex items-center justify-between gap-4'>
            <div>
              <p className='font-mono text-sm text-emerald-300'>
                <Localized id='common.labels.question' />{' '}
                <Localized>{answers.length + (feedback ? 0 : 1)}</Localized>
                <Localized>
                  {mode === 'timed' ? '' : ` of ${roundCount}`}
                </Localized>
              </p>
              <h1 className='mt-1 text-xl font-bold'>
                <Localized id='deductiveReasoning.labels.findTheMissingShape' />
              </h1>
            </div>
            <Localized>
              {mode === 'timed' && (
                <p
                  role='timer'
                  aria-label={t('common.settings.timeRemaining')}
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
          <DeductiveBoard
            puzzle={puzzle}
            notes={notes}
            selectedCell={selectedCell}
            onSelectCell={
              feedback
                ? undefined
                : index =>
                    setSelectedCell(current =>
                      current === index ? null : index,
                    )
            }
          />
          <p
            aria-live='polite'
            className={`mt-5 text-center text-sm ${feedback ? (feedback.correct ? 'text-emerald-300' : 'text-rose-400') : 'text-slate-300'}`}
          >
            <Localized>
              {feedback
                ? feedback.correct
                  ? 'Correct!'
                  : 'Incorrect.'
                : selectedCell === null
                  ? 'Choose a shape below to submit your answer.'
                  : `Note for row ${Math.floor(selectedCell / puzzle.size) + 1}, column ${(selectedCell % puzzle.size) + 1}.`}
            </Localized>
          </p>
          <ShapeChoices
            size={puzzle.size}
            palette={puzzle.palette}
            feedback={feedback}
            label={selectedCell === null ? 'Answer' : 'Place note'}
            onChoose={choose}
          />
          <Localized>
            {selectedCell !== null && (
              <div className='mt-4 flex justify-center gap-3'>
                <button
                  type='button'
                  className={secondary}
                  onClick={() => setSelectedCell(null)}
                >
                  <Localized id='common.actions.returnToAnswering' />
                </button>
                <button
                  type='button'
                  className={secondary}
                  onClick={() =>
                    setNotes(current => {
                      const next = { ...current };
                      delete next[selectedCell];
                      return next;
                    })
                  }
                >
                  <Localized id='common.labels.eraseNote' />
                </button>
              </div>
            )}
          </Localized>
          <div className='mt-4 flex justify-center'>
            <button
              type='button'
              disabled={!!feedback || Object.keys(notes).length === 0}
              className={`${secondary} disabled:cursor-not-allowed disabled:opacity-40`}
              onClick={() => {
                setNotes({});
                setSelectedCell(null);
              }}
            >
              <Localized id='deductiveReasoning.actions.clearMarkedCells' />
            </button>
          </div>
          <p className='mt-5 text-center text-sm leading-6 text-slate-500'>
            <Localized id='deductiveReasoning.instructions.noRepeatedShapeInAnyRowOrColumnTap' />
          </p>
          <div className='mt-6 flex justify-between gap-3'>
            <button
              type='button'
              className={secondary}
              onClick={returnToSetupRoute}
            >
              <Localized id='common.actions.cancelSession' />
            </button>
            <button
              type='button'
              className={secondary}
              onClick={finish}
            >
              <Localized id='common.actions.finishSession' />
            </button>
          </div>
        </div>
      </main>
    );

  return (
    <TestPageShell accent='emerald'>
      <Localized>
        {view === 'setup' ? (
          <TestSetupLayout
            accent='emerald'
            eyebrow='Deductive reasoning'
            title={t('deductiveReasoning.setup.title')}
            description={
              <p>
                <Localized id='deductiveReasoning.instructions.useRowAndColumnRulesToSolve44And' />
              </p>
            }
            actions={
              <>
                <button
                  type='button'
                  className={primary}
                  onClick={start}
                >
                  <Localized id='common.actions.startTest' />
                </button>
                <DeductiveDemo />
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
                    <option value='rounds'>
                      <Localized id='common.settings.randomizedQuestionsUntimed' />
                    </option>
                    <option value='timed'>
                      <Localized id='common.settings.timedUnlimitedQuestions' />
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
                    <option value='easy'>
                      <Localized id='deductiveReasoning.labels.easy44' />
                    </option>
                    <option value='hard'>
                      <Localized id='deductiveReasoning.labels.hard55' />
                    </option>
                    <option value='extra-hard'>
                      <Localized id='deductiveReasoning.labels.extraHard55GreyBlackShapes' />
                    </option>
                    <option value='adaptive'>
                      <Localized id='deductiveReasoning.labels.adaptive44ToMonochrome55' />
                    </option>
                  </select>
                </label>
                <p className='mt-2 text-xs leading-5 text-slate-500'>
                  <Localized id='deductiveReasoning.instructions.adaptivePracticeAdvancesAfterFourCorrectAnswersInThe' />
                </p>
                <Localized>
                  {mode === 'rounds' && (
                    <label className='mt-5 block text-sm font-semibold'>
                      <Localized id='common.labels.numberOfQuestions' />
                      <ValidatedNumberInput
                        className={field}
                        value={roundCount}
                        min={1}
                        max={100}
                        normalize={Math.round}
                        onValueChange={setRoundCount}
                      />
                    </label>
                  )}
                </Localized>
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
                      <span className='mt-2 block font-normal text-slate-500'>
                        <Localized id='common.actions.chooseYourPracticeDurationAnswerAsManyQuestionsAs' />
                      </span>
                    </label>
                  )}
                </Localized>
              </TestPanel>
              <TestPanel title={t('common.instructions.title')}>
                <InstructionList
                  accent='emerald'
                  items={[
                    {
                      title: 'Apply the rule',
                      description:
                        'Each shape appears exactly once in each row and column. There are no box rules.',
                    },
                    {
                      title: 'Find the target',
                      description:
                        'Solve only the question-mark cell. Some other blanks may have several possibilities.',
                    },
                    {
                      title: 'Make notes',
                      description:
                        'Select a blank, then choose a shape to place a note. Clear all marked cells to reset your notes. Return to answering before submitting.',
                    },
                    {
                      title: 'Submit and continue',
                      description:
                        'An answer button submits immediately. Your selected shape flashes green for a correct answer or red for an incorrect answer before the next question. Review answers after finishing.',
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
                <Localized id='deductiveReasoning.results.deductiveReasoningResults' />
              </h1>
              <Summary session={session} />
              <p className='mt-3 text-slate-400'>
                <Localized>
                  {session.mode === 'examples'
                    ? 'PDF examples'
                    : `${session.level} randomized practice`}{' '}
                </Localized>
                <Localized id='common.results.averageAnswerTime' />
                <Localized> </Localized>
                <Localized>
                  {session.answers.length
                    ? (
                        session.answers.reduce(
                          (sum, answer) => sum + answer.seconds,
                          0,
                        ) / session.answers.length
                      ).toFixed(1)
                    : '0.0'}{' '}
                </Localized>
                <Localized>{'s'}</Localized>
              </p>
              <button
                type='button'
                className={`${primary} mt-6`}
                onClick={returnToSetupRoute}
              >
                <Localized id='common.settings.changeSettings' />
              </button>
              <AnswerReview answers={session.answers} />
            </section>
          )
        )}
      </Localized>
      <section className='border-t border-white/10 py-10'>
        <h2 className='text-2xl font-bold'>
          <Localized id='deductiveReasoning.results.deductiveReasoningHistory' />
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
                  <Localized>{' ·'}</Localized>
                  <Localized> </Localized>
                  <Localized>
                    {saved.mode === 'examples'
                      ? 'PDF examples'
                      : `${saved.mode} · ${saved.level}`}
                  </Localized>
                </summary>
                <Summary session={saved} />
                <AnswerReview answers={saved.answers} />
              </details>
            ))
          )}
        </Localized>
      </section>
    </TestPageShell>
  );
}
