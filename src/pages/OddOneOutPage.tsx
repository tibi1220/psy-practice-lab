import { Localized, useTextTranslation } from '../components/Localization';
import { useState } from 'react';
import ReasoningPractice from '../components/ReasoningPractice';
import type { PracticeConfig } from '../components/ReasoningPractice';
import { GuidedDemoModal } from '../components/GuidedDemoModal';
import {
  createOddPuzzle,
  isOddPuzzle,
  oddDifficulty,
  oddExplanation,
} from '../lib/odd-one-out';
import type { OddPuzzle } from '../lib/odd-one-out';

function OddSymbol({ puzzle, index }: { puzzle: OddPuzzle; index: number }) {
  const item = puzzle.objects[index];
  const color = '#e2e8f0';
  return (
    <svg
      viewBox='0 0 100 100'
      aria-hidden='true'
      className='h-full w-full'
    >
      <Localized>
        {puzzle.rule === 'rotation' && (
          <path
            d='M50 15 80 80H20Z'
            fill={color}
            transform={`rotate(${item.rotation * 90} 50 50)`}
          />
        )}
      </Localized>
      <Localized>
        {puzzle.rule === 'lines' && (
          <>
            <rect
              x='15'
              y='10'
              width='70'
              height='80'
              rx='3'
              fill='#1e293b'
              stroke='#94a3b8'
              strokeWidth='2'
            />
            <Localized>
              {item.lines === 1 ? (
                <path
                  d='M50 25V75'
                  stroke={color}
                  strokeWidth='4'
                />
              ) : (
                <path
                  d='M40 25V75M60 25V75'
                  stroke={color}
                  strokeWidth='4'
                />
              )}
            </Localized>
          </>
        )}
      </Localized>
      <Localized>
        {puzzle.rule === 'containment' && (
          <>
            <Localized>
              {index % 3 === 0 ? (
                <ellipse
                  cx='47'
                  cy='50'
                  rx='35'
                  ry='29'
                  fill='none'
                  stroke={color}
                  strokeWidth='3'
                />
              ) : index % 3 === 1 ? (
                <rect
                  x='15'
                  y='15'
                  width='65'
                  height='70'
                  fill='none'
                  stroke={color}
                  strokeWidth='3'
                />
              ) : (
                <path
                  d='M50 10 90 85H10Z'
                  fill='none'
                  stroke={color}
                  strokeWidth='3'
                />
              )}
            </Localized>
            <rect
              x={item.contained ? 38 : 72}
              y={index % 3 === 2 ? 57 : 40}
              width='24'
              height='18'
              fill={color}
              stroke='#0f172a'
              strokeWidth='2'
            />
          </>
        )}
      </Localized>
      <Localized>
        {puzzle.rule === 'alternating' && (
          <path
            d='M50 8 61 35 91 38 68 58 75 89 50 73 25 89 32 58 9 38 39 35Z'
            fill={item.filled ? color : 'none'}
            stroke={color}
            strokeWidth='3'
          />
        )}
      </Localized>
      <Localized>
        {puzzle.rule === 'sides' && (
          <path
            d={
              item.sides === 3
                ? 'M50 15 80 80H20Z'
                : [
                    'M20 20H80V80H20Z',
                    'M30 20H70L85 80H15Z',
                    'M30 20H85L70 80H15Z',
                  ][index % 3]
            }
            fill={item.filled ? color : 'none'}
            stroke={color}
            strokeWidth='3'
          />
        )}
      </Localized>
      <Localized>
        {puzzle.rule === 'angular' &&
          (item.sides === 0 ? (
            <ellipse
              cx='50'
              cy='50'
              rx='32'
              ry='27'
              fill={item.filled ? color : 'none'}
              stroke={color}
              strokeWidth='3'
            />
          ) : (
            <polygon
              points={Array.from(
                { length: item.sides },
                (_, i) =>
                  `${50 + 35 * Math.cos((i * 2 * Math.PI) / item.sides - Math.PI / 2)},${50 + 35 * Math.sin((i * 2 * Math.PI) / item.sides - Math.PI / 2)}`,
              ).join(' ')}
              transform={`rotate(${item.rotation * 23} 50 50)`}
              fill={item.filled ? color : 'none'}
              stroke={color}
              strokeWidth='3'
            />
          ))}
      </Localized>
      <Localized>
        {puzzle.rule === 'broken-line' &&
          Array.from({ length: 5 }, (_, i) => (
            <path
              key={i}
              d={
                i === item.gap
                  ? `M17 ${22 + i * 14}H42M58 ${22 + i * 14}H83`
                  : `M17 ${22 + i * 14}H83`
              }
              fill='none'
              stroke={color}
              strokeWidth='3'
            />
          ))}
      </Localized>
      <Localized>
        {puzzle.rule === 'symbol-count' && (
          <>
            <Localized>
              {Array.from({ length: item.circles ?? 0 }, (_, i) => (
                <circle
                  key={`c${i}`}
                  cx={20 + (i % 3) * 29}
                  cy={19 + Math.floor(i / 3) * 19}
                  r='6'
                  fill='none'
                  stroke={color}
                  strokeWidth='2'
                />
              ))}
            </Localized>
            <Localized>
              {Array.from({ length: item.squares ?? 0 }, (_, i) => (
                <rect
                  key={`s${i}`}
                  x={14 + i * 29}
                  y='63'
                  width='12'
                  height='12'
                  fill='none'
                  stroke={color}
                  strokeWidth='2'
                />
              ))}
            </Localized>
          </>
        )}
      </Localized>
      <Localized>
        {puzzle.rule === 'rotation-pairs' && (
          <>
            <path
              d='M16 21H54V31H40V62H30V31H16Z'
              fill={color}
              transform={`rotate(${item.rotation * 90} 35 42)`}
            />
            <path
              d='M61 53H89V61H79V83H71V61H61Z'
              fill={color}
              transform={`rotate(${(item.innerRotation ?? 0) * 90} 75 68)`}
            />
          </>
        )}
      </Localized>
    </svg>
  );
}

function OddBoard({
  puzzle,
  submit,
  selected,
  reveal = false,
}: {
  puzzle: OddPuzzle;
  submit?: (index: number) => void;
  selected?: number;
  reveal?: boolean;
}) {
  const t = useTextTranslation();

  return (
    <div className='@container'>
      <p className='mb-5 text-center text-slate-300'>
        <Localized>
          {reveal
            ? 'The correct object is highlighted.'
            : 'Select the one object that does not fit the rule. Read in numbered order.'}
        </Localized>
      </p>
      <div
        role='group'
        aria-label={t('oddOneOut.labels.nineObjectsInNumberedOrder')}
        className='grid grid-cols-3 gap-3 @3xl:grid-cols-9'
      >
        <Localized>
          {puzzle.objects.map((item, index) => (
            <button
              key={index}
              type='button'
              disabled={!submit}
              onClick={() => submit?.(index)}
              aria-label={t('oddOneOut.messages.selectObjectIndexPuzzle', {
                index: index + 1,
                puzzle:
                  puzzle.rule === 'rotation'
                    ? t('oddOneOut.messages.trianglePointingItem', {
                        item: ['up', 'right', 'down', 'left'][item.rotation],
                      })
                    : puzzle.rule === 'lines'
                      ? t('oddOneOut.messages.boxWithLinesItem', {
                          lines: item.lines,
                          item: item.lines === 1 ? 'line' : 'lines',
                        })
                      : puzzle.rule === 'alternating'
                        ? t('oddOneOut.messages.itemStar', {
                            item: item.filled ? 'filled' : 'outlined',
                          })
                        : puzzle.rule === 'sides'
                          ? `${item.filled ? 'filled' : 'outlined'} ${item.sides === 3 ? 'triangle' : 'quadrilateral'}`
                          : puzzle.rule === 'angular'
                            ? item.sides === 0
                              ? 'ellipse'
                              : t('oddOneOut.messages.sidesSidedPolygon', {
                                  sides: item.sides,
                                })
                            : puzzle.rule === 'broken-line'
                              ? t('oddOneOut.messages.fiveStrokesItem', {
                                  item:
                                    item.gap === -1
                                      ? 'no gap'
                                      : t(
                                          'oddOneOut.messages.gapInStrokeItem',
                                          {
                                            item: (item.gap ?? 0) + 1,
                                          },
                                        ),
                                })
                              : puzzle.rule === 'symbol-count'
                                ? t(
                                    'oddOneOut.messages.circlesCirclesAndSquaresSquares',
                                    {
                                      circles: item.circles,
                                      squares: item.squares,
                                    },
                                  )
                                : puzzle.rule === 'rotation-pairs'
                                  ? t(
                                      'oddOneOut.messages.largeTRotatedItemDegreesSmallTRotatedItem2',
                                      {
                                        item: item.rotation * 90,
                                        item2: (item.innerRotation ?? 0) * 90,
                                      },
                                    )
                                  : t(
                                      'oddOneOut.messages.rectangleItemAnOuterShape',
                                      {
                                        item: item.contained
                                          ? 'inside'
                                          : 'crossing',
                                      },
                                    ),
              })}
              className={`min-w-0 rounded-xl border-2 p-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300 ${reveal && index === puzzle.answer ? 'border-emerald-300 bg-emerald-300/10' : reveal && index === selected ? 'border-rose-300 bg-rose-300/10' : 'border-white/10 bg-white/5 hover:border-white/30'}`}
            >
              <div className='aspect-square'>
                <OddSymbol
                  puzzle={puzzle}
                  index={index}
                />
              </div>
              <span className='font-mono text-sm text-slate-400'>
                <Localized>{index + 1}</Localized>
              </span>
            </button>
          ))}
        </Localized>
      </div>
      <Localized>
        {reveal && (
          <p className='mt-5 text-sm leading-6 text-slate-300'>
            <Localized>{oddExplanation(puzzle, t)}</Localized>
          </p>
        )}
      </Localized>
    </div>
  );
}

const demoPuzzle = createOddPuzzle(false, () => 0.5, 'alternating');
const gapDemo = createOddPuzzle(true, () => 0.5, 'broken-line', 2);
function OddDemo() {
  const t = useTextTranslation();

  const [message, setMessage] = useState(
    'Choose the star that breaks the alternating pattern.',
  );
  const [gapMessage, setGapMessage] = useState(
    'Track the gap from one object to the next.',
  );
  return (
    <GuidedDemoModal
      title={t('oddOneOut.tutorial.oddOneOutWalkthrough')}
      theme='emerald'
      introduction='Find the governing rule, then identify the exception. Demo answers are not saved.'
      steps={[
        {
          title: 'Compare all nine objects',
          description:
            'Read in numbered order. Look for a shared property or a repeating sequence: orientation, fill, line count, containment, or number of sides.',
          visual: <OddBoard puzzle={demoPuzzle} />,
        },
        {
          title: 'Find the exception',
          description:
            'Here, filled and outlined stars should alternate. Only one star breaks the pattern.',
          visual: (
            <OddBoard
              puzzle={demoPuzzle}
              reveal
            />
          ),
        },
        {
          title: 'Try a selection',
          description:
            'Select one object. In the real test, this submits immediately and takes you to the next question.',
          visual: (
            <div className='w-full'>
              <OddBoard
                puzzle={demoPuzzle}
                submit={index =>
                  setMessage(
                    index === demoPuzzle.answer
                      ? 'Correct! Object 5 breaks the alternating fill pattern.'
                      : 'Try again: look for two consecutive stars with the same fill.',
                  )
                }
              />
              <p
                role='status'
                className='mt-4 text-center text-emerald-200'
              >
                <Localized>{message}</Localized>
              </p>
            </div>
          ),
        },
        {
          title: 'Try a harder pattern',
          description:
            'Some rules concern relationships and sequences rather than a single unusual shape. In these five-stroke objects, the gap moves through the strokes, wrapping after the fifth. Select the exception.',
          visual: (
            <div className='w-full'>
              <OddBoard
                puzzle={gapDemo}
                submit={index =>
                  setGapMessage(
                    index === gapDemo.answer
                      ? 'Correct.'
                      : 'Try again: predict which stroke should have the gap at each numbered position.',
                  )
                }
              />
              <p
                role='status'
                className='mt-4 text-center text-emerald-200'
              >
                <Localized>{gapMessage}</Localized>
                {gapMessage === 'Correct.' && (
                  <>
                    {' '}
                    <Localized>{oddExplanation(gapDemo, t)}</Localized>
                  </>
                )}
              </p>
            </div>
          ),
        },
      ]}
    />
  );
}
const config: PracticeConfig<OddPuzzle, number> = {
  basePath: '/odd-one-out',
  title: 'Odd one out',
  headline: 'Find the rule. Spot the exception.',
  defaultMinutes: 5,
  description:
    'Find the object that breaks a shared rule among nine objects, inspired by the scales ix inductive reasoning tasks.',
  difficultyLabels: [
    'Easy · fill, rotation, and shape properties',
    'Hard · stroke sequences and shape relationships',
  ],
  adaptiveDescription:
    'After six answers, add moving gaps, shape-count relationships, and paired rotations. After twelve, gaps shift farther and count differences become subtler. Hard mode starts with relationship rules. Easy mode keeps simple properties.',
  createProgressivePuzzle: context =>
    createOddPuzzle(
      false,
      Math.random,
      undefined,
      oddDifficulty(context.completed, context.level),
    ),
  difficultyName: puzzle =>
    ['Shape properties', 'Relationships and sequences', 'Subtle relationships'][
      puzzle.difficulty ?? 0
    ],
  instructions: [
    {
      title: 'Read in order',
      description:
        'Use the numbered order from 1 to 9, even when the layout wraps on a smaller screen.',
    },
    {
      title: 'Infer the rule',
      description:
        'Compare orientation, fill, straight or curved edges, containment, and counts. Harder rules use a moving gap, differences between circle and square counts, or rotations within each pair.',
    },
    {
      title: 'Find one exception',
      description:
        'Eight objects fit the rule. Select the one object that does not.',
    },
    {
      title: 'Continue and review',
      description:
        'Selecting an object submits immediately. Review the correct object and rule after finishing.',
    },
  ],
  createPuzzle: createOddPuzzle,
  isPuzzle: isOddPuzzle,
  isResponse: (_puzzle, value): value is number =>
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= 0 &&
    value < 9,
  isCorrect: (puzzle, response) => response === puzzle.answer,
  Question: OddBoard,
  renderReview: (puzzle, response) => (
    <>
      <p className='mb-4 text-sm text-slate-300'>
        <Localized id='oddOneOut.labels.yourAnswerObject' />{' '}
        <Localized>{response + 1}</Localized>
        <Localized id='oddOneOut.results.correctAnswerObject' />
        <Localized> </Localized>
        <Localized>{puzzle.answer + 1}</Localized>
        <Localized>{'.'}</Localized>
      </p>
      <OddBoard
        puzzle={puzzle}
        selected={response}
        reveal
      />
    </>
  ),
  demo: <OddDemo />,
};
export default function OddOneOutPage() {
  return <ReasoningPractice config={config} />;
}
