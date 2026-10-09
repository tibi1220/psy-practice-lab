import { Localized, useTextTranslation } from '../components/Localization';
import { useRef, useState } from 'react';
import { GuidedDemoModal } from '../components/GuidedDemoModal';
import { MotionBoard } from '../components/MotionBoard';
import ReasoningPractice, {
  practicePrimary,
  practiceSecondary,
} from '../components/ReasoningPractice';
import type { PracticeConfig } from '../components/ReasoningPractice';
import {
  applyMotionMove,
  createMotionPuzzle,
  initialMotionState,
  isMotionCorrect,
  isMotionPuzzle,
  isMotionResponse,
  motionPath,
  motionSolved,
  motionDifficulty,
  optimalMotionSolution,
  MOTION_TEMPLATES,
  replayMotion,
  solveMotion,
} from '../lib/motion-planning';
import type {
  MotionMove,
  MotionPuzzle,
  MotionResponse,
} from '../lib/motion-planning';

function MotionQuestion({
  puzzle,
  submit,
  demo = false,
}: {
  puzzle: MotionPuzzle;
  submit: (response: MotionResponse) => void;
  demo?: boolean;
}) {
  const [state, setState] = useState(() => initialMotionState(puzzle));
  const [moves, setMoves] = useState<MotionMove[]>([]);
  const submitted = useRef(false);
  const solved = motionSolved(puzzle, state);
  const move = (next: MotionMove) => {
    if (solved || submitted.current || moves.length >= 500) return;
    const updated = applyMotionMove(puzzle, state, next);
    if (!updated) return;
    setState(updated);
    setMoves([...moves, next]);
  };
  const finish = (skipped: boolean) => {
    if (demo) {
      submit({ moves, skipped });
      return;
    }
    if (submitted.current) return;
    submitted.current = true;
    submit({ moves, skipped });
  };
  return (
    <div>
      <div className='mb-4 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm'>
        <p className='font-mono text-emerald-300'>
          <Localized>{moves.length}</Localized>{' '}
          <Localized id='common.results.moves' />
        </p>
        <p className='text-slate-400'>
          <Localized id='motionPlanning.labels.targetRow' />{' '}
          <Localized>{puzzle.target.y + 1}</Localized>
          <Localized id='motionPlanning.labels.column' />{' '}
          <Localized>{puzzle.target.x + 1}</Localized>
        </p>
      </div>
      <MotionBoard
        puzzle={puzzle}
        state={state}
        move={solved ? undefined : move}
      />
      <p className='mx-auto mt-4 max-w-lg text-center text-sm leading-6 text-slate-400'>
        <Localized id='motionPlanning.instructions.moveTheRedBallToTheBlackTargetColored' />
      </p>
      <Localized>
        {solved && (
          <p
            role='status'
            className='mt-5 text-center font-bold text-emerald-300'
          >
            <Localized id='motionPlanning.labels.solvedIn' />{' '}
            <Localized>{moves.length}</Localized>{' '}
            <Localized id='motionPlanning.labels.moves' />
          </p>
        )}
      </Localized>
      <Localized>
        {moves.length >= 500 && !solved && (
          <p
            role='status'
            className='mt-4 text-center text-amber-300'
          >
            <Localized id='motionPlanning.labels.moveLimitReachedSkipThisPuzzleToContinue' />
          </p>
        )}
      </Localized>
      <div className='mt-5 flex justify-center gap-3'>
        <Localized>
          {solved ? (
            demo ? (
              <button
                type='button'
                className={practicePrimary}
                onClick={() => {
                  setState(initialMotionState(puzzle));
                  setMoves([]);
                }}
              >
                <Localized id='common.actions.tryAgain' />
              </button>
            ) : (
              <button
                type='button'
                className={practicePrimary}
                onClick={() => finish(false)}
              >
                <Localized id='motionPlanning.actions.nextPuzzle' />
              </button>
            )
          ) : (
            <button
              type='button'
              className={practiceSecondary}
              onClick={() => finish(true)}
            >
              <Localized>
                {demo ? 'Show demo feedback' : 'Skip puzzle'}
              </Localized>
            </button>
          )}
        </Localized>
      </div>
    </div>
  );
}

function SolutionWalkthrough({ puzzle }: { puzzle: MotionPuzzle }) {
  const t = useTextTranslation();

  return (
    <GuidedDemoModal
      title={t('motionPlanning.labels.shortestPlanningSolution')}
      triggerLabel='View shortest solution'
      eyebrow='Solution walkthrough'
      theme='emerald'
      introduction='Work backwards from the target and open space for the ball. Each step places one piece along a clear path; highlighted paths can turn.'
      steps={() => {
        const solution = optimalMotionSolution(puzzle);
        if (!solution)
          return [
            {
              title: 'Solution unavailable',
              description:
                'This saved layout exceeds the solution search limit.',
              visual: (
                <MotionBoard
                  puzzle={puzzle}
                  state={initialMotionState(puzzle)}
                />
              ),
            },
          ];
        let state = initialMotionState(puzzle);
        const steps = [
          {
            title: t('motionPlanning.messages.planLengthMoves', {
              length: solution.length,
            }),
            description:
              'The black ring marks the target, including when a block covers it. Numbered coloured blocks can move; bolted grey obstacles cannot. This is a shortest solution under the practice move rules.',
            visual: (
              <MotionBoard
                puzzle={puzzle}
                state={state}
              />
            ),
          },
        ];
        solution.forEach((move, index) => {
          const path = motionPath(puzzle, state, move)!;
          state = applyMotionMove(puzzle, state, move)!;
          steps.push({
            title: t('motionPlanning.messages.moveIndexName', {
              index: index + 1,
              name: puzzle.pieces[move.piece].name,
            }),
            description: t(
              'motionPlanning.messages.placeMoveAtRowMove2ColumnMove3FollowThe',
              {
                move:
                  move.piece === 0 ? 'the ball' : "the block's top-left corner",
                move2: move.to.y + 1,
                move3: move.to.x + 1,
                index:
                  index === solution.length - 1
                    ? ' The ball has reached the target.'
                    : ' Leave the remaining pieces in place.',
              },
            ),
            visual: (
              <MotionBoard
                puzzle={puzzle}
                state={state}
                path={path}
              />
            ),
          });
        });
        return steps;
      }}
    />
  );
}
function MotionReview({
  puzzle,
  response,
}: {
  puzzle: MotionPuzzle;
  response: MotionResponse;
}) {
  const optimal = optimalMotionSolution(puzzle)?.length;
  const final =
    replayMotion(puzzle, response.moves) ?? initialMotionState(puzzle);
  return (
    <div>
      <p className='mb-4 text-sm text-slate-300'>
        <Localized>{response.skipped ? 'Skipped' : 'Solved'}</Localized>
        <Localized>{' · '}</Localized>
        <Localized>{response.moves.length} </Localized>
        <Localized id='motionPlanning.labels.movesThisIsYourFinalPosition' />
      </p>
      <p className='mb-4 font-mono font-bold text-emerald-300'>
        <Localized id='motionPlanning.results.optimalNumberOfSteps' />{' '}
        <Localized>{optimal ?? 'Unavailable'}</Localized>
        <Localized>
          {!response.skipped && optimal !== undefined
            ? ` · ${response.moves.length === optimal ? 'Optimal solution!' : `${response.moves.length - optimal} extra moves`}`
            : ''}
        </Localized>
      </p>
      <MotionBoard
        puzzle={puzzle}
        state={final}
      />
      <div className='mt-5 flex justify-center'>
        <SolutionWalkthrough puzzle={puzzle} />
      </div>
    </div>
  );
}
function MotionDemo() {
  const t = useTextTranslation();

  const [message, setMessage] = useState('');
  const puzzle = MOTION_TEMPLATES[0];
  const solution = solveMotion(puzzle)!;
  const opened = applyMotionMove(
    puzzle,
    initialMotionState(puzzle),
    solution[0],
  )!;
  return (
    <GuidedDemoModal
      title={t('motionPlanning.tutorial.complexPlanningWalkthrough')}
      theme='emerald'
      introduction='Move the red ball to the target while making space around blocks. Demo moves do not affect your results.'
      steps={[
        {
          title: 'Find the target',
          description:
            'The red ball must reach the black circle. Think about which blocks stop it, and where those blocks can fit. Coloured blocks move freely without rotating.',
          visual: (
            <MotionBoard
              puzzle={puzzle}
              state={initialMotionState(puzzle)}
            />
          ),
        },
        {
          title: 'Open a route',
          description:
            'In this example, moving the tall green block away opens a path for the ball. The purple block can stay where it is. Plan the destination of every piece before moving.',
          visual: (
            <MotionBoard
              puzzle={puzzle}
              state={opened}
              path={motionPath(
                puzzle,
                initialMotionState(puzzle),
                solution[0],
              )!}
            />
          ),
        },
        {
          title: 'Try the puzzle',
          description:
            'Drag a piece to a highlighted destination, or select it and tap a highlighted cell. With a keyboard, focus a piece and press Enter, then focus a destination and press Enter. Reach the target in two moves. In harder tasks, bolted grey obstacles cannot move.',
          visual: (
            <div className='w-full'>
              <MotionQuestion
                puzzle={puzzle}
                demo
                submit={() =>
                  setMessage(
                    'Keep practising, or continue to the test. The green block can move to row 3, column 3, freeing a path for the ball.',
                  )
                }
              />
              <p
                role='status'
                className='mt-3 text-center text-emerald-300'
              >
                <Localized>{message}</Localized>
              </p>
            </div>
          ),
        },
      ]}
    />
  );
}
const config: PracticeConfig<MotionPuzzle, MotionResponse> = {
  basePath: '/motion-planning',
  title: 'Complex planning',
  headline: 'Clear a path. Plan each move.',
  description:
    'Rearrange coloured blocks and move the red ball to the black target in as few moves as possible. Practice inspired by motionChallenge.',
  difficultyLabels: ['Easy · movable barriers', 'Hard · 6–11 optimal moves'],
  instructions: [
    {
      title: 'Plan before moving',
      description:
        "Identify the ball's black target and decide which blocks must move. A target can start underneath a block.",
    },
    {
      title: 'Move one piece',
      description:
        'Drag a piece or select it and tap a highlighted destination. Positions refer to its top-left corner. A placement counts as one move; its collision-free path can turn.',
    },
    {
      title: 'Respect the obstacles',
      description:
        'Pieces cannot overlap, rotate, or leave the grid. Bolted grey obstacles remain fixed. Numbered coloured blocks can move in all four directions.',
    },
    {
      title: 'Solve and continue',
      description:
        'Reach the target, then choose Next puzzle. Skip if stuck. Solve as many puzzles as possible in the six-minute default session. Only submitted or skipped puzzles are saved.',
    },
    {
      title: 'Review your planning',
      description:
        'Results record solve rate, time, and moves, with a shortest-solution popup for each layout. Later rounds add tighter spaces and longer dependencies: intermediate after two puzzles, hard after four, and expert after seven. Expert puzzles need 9–11 optimal moves.',
    },
  ],
  createPuzzle: createMotionPuzzle,
  createProgressivePuzzle: context =>
    createMotionPuzzle(
      false,
      Math.random,
      motionDifficulty(context.completed, context.level),
    ),
  difficultyName: puzzle =>
    ['Introductory', 'Intermediate', 'Hard', 'Expert'][puzzle.difficulty ?? 0],
  adaptiveDescription:
    'Later rounds progress from introductory to intermediate (round 3), hard (round 5), and expert (round 8). Hard mode starts with complex layouts and progresses to expert; easy mode stays introductory.',
  reviewSummary: (puzzle, response) =>
    `${response.moves.length} moves · Optimal steps: ${optimalMotionSolution(puzzle)?.length ?? 'Unavailable'}`,
  isPuzzle: isMotionPuzzle,
  isResponse: isMotionResponse,
  isCorrect: isMotionCorrect,
  Question: MotionQuestion,
  renderReview: (puzzle, response) => (
    <MotionReview
      puzzle={puzzle}
      response={response}
    />
  ),
  demo: <MotionDemo />,
};
export default function MotionPlanningPage() {
  return <ReasoningPractice config={config} />;
}
