import { Localized, useTextTranslation } from './Localization';
import type { DemoStep } from './GuidedDemoModal';
import { DemoKey, GuidedDemoModal } from './GuidedDemoModal';
import { CarDisplay } from './CarDisplay';
import { DistributiveAttentionBoard } from './DistributiveAttentionBoard';
import {
  CapacityActionControls,
  CapacityStimulusPanel,
} from './CapacityControls';
import { MemoryCell } from './MemoryCell';
import {
  PerceptionInputPair,
  PerceptionStimulusDisplay,
} from './PerceptionControls';
import { createHanoiPegs, HanoiBoard } from './HanoiBoard';
import { HanoiSpeedGraph } from './HanoiSpeedGraph';
import { getStimulus, StimulusSquare, stimulusTypes } from './MonotonyStimulus';
import { TrafficLightDisplay } from './TrafficLightDisplay';

export function ReactionTimeDemo() {
  const t = useTextTranslation();

  const steps: DemoStep[] = [
    {
      title: 'Start and wait',
      description:
        'Press Ready. The full screen turns red; stay still and do not respond yet.',
      visual: (
        <div className='flex h-36 w-full max-w-sm flex-col items-center justify-center rounded-2xl bg-rose-600 text-center shadow-xl'>
          <p className='text-3xl font-black'>
            <Localized id='common.symbols.waitForGreen' />
          </p>
          <p className='mt-2 text-sm text-rose-100'>
            <Localized id='common.labels.donTPressYet' />
          </p>
        </div>
      ),
    },
    {
      title: 'Watch for the cue',
      description:
        'After a random delay, the screen turns green. This is the moment the timer starts.',
      visual: (
        <div className='flex h-36 w-full max-w-sm flex-col items-center justify-center rounded-2xl bg-emerald-400 text-center text-emerald-950 shadow-[0_0_35px_rgba(52,211,153,0.3)]'>
          <p className='text-5xl font-black'>
            <Localized id='common.labels.now' />
          </p>
          <p className='mt-2 text-sm font-bold'>
            <Localized id='common.labels.reactImmediately' />
          </p>
        </div>
      ),
    },
    {
      title: 'Tap or press a key',
      description:
        'Tap anywhere on a touch screen or press any keyboard key as quickly as possible.',
      visual: (
        <div className='flex flex-col items-center gap-5'>
          <div className='flex gap-3'>
            <DemoKey>
              <Localized id='common.actions.tap' />
            </DemoKey>
            <span className='self-center text-slate-500'>
              <Localized id='deductiveReasoning.labels.or' />
            </span>
            <DemoKey>
              <Localized id='common.labels.key' />
            </DemoKey>
          </div>
          <p className='font-mono text-3xl font-black text-cyan-300'>
            <Localized>{'247 ms'}</Localized>
          </p>
        </div>
      ),
    },
    {
      title: 'Review the session',
      description:
        'Complete every round, then review the raw times, average, and deviation. If enabled, the fastest and slowest trials are excluded from statistics.',
      visual: (
        <div className='w-full max-w-md'>
          <p className='text-center font-mono text-4xl font-black text-cyan-300'>
            <Localized>{'251 ms'}</Localized>
          </p>
          <div className='mt-5 grid grid-cols-5 gap-2'>
            <Localized>
              {[198, 246, 252, 255, 341].map((time, index) => (
                <div
                  key={time}
                  className={`rounded-lg bg-slate-950 p-2 text-center font-mono text-xs ${
                    index === 0 || index === 4
                      ? 'text-slate-600 line-through'
                      : 'text-slate-200'
                  }`}
                >
                  <Localized>{time}</Localized>
                </div>
              ))}
            </Localized>
          </div>
        </div>
      ),
    },
  ];

  return (
    <GuidedDemoModal
      title={t('tests.reactionTime.tutorialTitle')}
      introduction='See one trial from the red waiting screen through the saved result.'
      steps={steps}
      theme='cyan'
    />
  );
}

const demoMemoryCells = Array.from({ length: 16 }, (_, index) => index);

function MemoryGridVisual({ selected = false }: { selected?: boolean }) {
  const activeCells = new Set([1, 4, 7, 10, 14]);
  return (
    <div className='grid w-48 grid-cols-4 gap-2 sm:w-56'>
      <Localized>
        {demoMemoryCells.map(cell => {
          const active = activeCells.has(cell);
          return (
            <MemoryCell
              key={cell}
              index={cell}
              status={active ? (selected ? 'selected' : 'flashed') : 'neutral'}
              disabled
              onSelect={() => undefined}
            />
          );
        })}
      </Localized>
    </div>
  );
}

export function ShortTermMemoryDemo() {
  const t = useTextTranslation();

  const steps: DemoStep[] = [
    {
      title: 'Get ready',
      description:
        'A new round begins with a short ready phase. Keep your attention on the whole grid.',
      visual: (
        <div className='text-center'>
          <p className='font-mono text-sm font-bold tracking-[0.2em] text-violet-300'>
            <Localized id='common.labels.round1Of10' />
          </p>
          <p className='mt-4 text-4xl font-black'>
            <Localized id='common.labels.getReadyDetail' />
          </p>
        </div>
      ),
    },
    {
      title: 'Remember the flash',
      description:
        'Several seven-segment displays illuminate briefly. Remember their positions rather than their order.',
      visual: <MemoryGridVisual />,
    },
    {
      title: 'Rebuild the pattern',
      description:
        'After the flash disappears, select every cell you remember. You may select any number and tap again to remove one.',
      visual: <MemoryGridVisual selected />,
    },
    {
      title: 'Submit and continue',
      description:
        'Press Next round when satisfied. After the configured rounds, accuracy and each response are saved to history.',
      visual: (
        <div className='w-full max-w-sm text-center'>
          <div className='rounded-full bg-violet-300 px-7 py-4 font-bold text-slate-950'>
            <Localized id='common.actions.nextRound' />
          </div>
          <p className='mt-5 font-mono text-3xl font-black text-violet-300'>
            <Localized id='common.results.80Accuracy' />
          </p>
        </div>
      ),
    },
  ];

  return (
    <GuidedDemoModal
      title={t('tests.shortTermMemory.tutorialTitle')}
      introduction='Practice the watch, remember, select, and submit rhythm before the real rounds begin.'
      steps={steps}
      theme='violet'
    />
  );
}

function MiniRoad({ signal }: { signal?: 'left' | 'right' }) {
  return (
    <div className='relative h-44 w-full max-w-sm overflow-hidden rounded-2xl bg-emerald-950'>
      <div className='absolute inset-y-0 left-[18%] right-[18%] bg-slate-700'>
        <span className='absolute inset-y-0 left-1/3 border-l-2 border-dashed border-white/40' />
        <span className='absolute inset-y-0 left-2/3 border-l-2 border-dashed border-white/40' />
        <CarDisplay
          color='#22d3ee'
          player
          className='absolute bottom-5 left-1/2 h-12 w-7 -translate-x-1/2'
        />
        <CarDisplay
          color='#fb7185'
          className='absolute left-[12%] top-5 h-12 w-7'
        />
        <CarDisplay
          color='#fbbf24'
          className='absolute right-[12%] top-16 h-12 w-7'
        />
      </div>
      <Localized>
        {signal && (
          <div
            className={`absolute top-6 ${
              signal === 'left' ? 'left-1' : 'right-1'
            }`}
          >
            <TrafficLightDisplay
              active
              compact
            />
          </div>
        )}
      </Localized>
    </div>
  );
}

export function DividedAttentionDemo() {
  const t = useTextTranslation();

  const steps: DemoStep[] = [
    {
      title: 'Keep the car safe',
      description:
        'Your car stays halfway up the screen. Use Left and Right to change lanes and avoid passing cars.',
      visual: <MiniRoad />,
    },
    {
      title: 'Monitor both lights',
      description:
        'The lights beside the road are normally green. Continue steering while watching for either one to turn red.',
      visual: <MiniRoad signal='left' />,
    },
    {
      title: 'Use the matching signal key',
      description:
        'A red left light means Down. A red right light means Up. Respond quickly without losing control of the car.',
      visual: (
        <div className='grid grid-cols-2 gap-6 text-center'>
          <div>
            <p className='mb-3 text-sm font-bold text-slate-400'>
              <Localized id='common.symbols.leftLight' />
            </p>
            <DemoKey>
              <Localized>{'↓'}</Localized>
            </DemoKey>
          </div>
          <div>
            <p className='mb-3 text-sm font-bold text-slate-400'>
              <Localized id='common.symbols.rightLight' />
            </p>
            <DemoKey>
              <Localized>{'↑'}</Localized>
            </DemoKey>
          </div>
        </div>
      ),
    },
    {
      title: 'Balance both tasks',
      description:
        'Continue until time expires. The result combines collisions, avoided cars, missed signals, wrong keys, and signal reaction time.',
      visual: (
        <div className='grid w-full max-w-md grid-cols-3 gap-3 text-center'>
          <Localized>
            {[
              ['2', 'Collisions'],
              ['34', 'Avoided'],
              ['612 ms', 'Signal avg'],
            ].map(([value, label]) => (
              <div
                key={label}
                className='rounded-2xl bg-slate-950 p-4'
              >
                <p className='font-mono text-xl font-black text-emerald-300'>
                  <Localized>{value}</Localized>
                </p>
                <p className='mt-1 text-[10px] uppercase text-slate-500'>
                  <Localized>{label}</Localized>
                </p>
              </div>
            ))}
          </Localized>
        </div>
      ),
    },
  ];

  return (
    <GuidedDemoModal
      title={t('tests.dividedAttention.tutorialTitle')}
      introduction='Learn the steering task and the traffic-light response rules separately before combining them.'
      steps={steps}
      theme='emerald'
    />
  );
}

export function MonotonyDemo() {
  const t = useTextTranslation();

  const steps: DemoStep[] = [
    {
      title: 'Define good and bad types',
      description:
        'Before starting, tap each of the eight symbol types to choose whether it belongs to the good or bad group.',
      visual: (
        <div className='grid grid-cols-4 gap-3'>
          <Localized>
            {stimulusTypes.map(type => {
              const isGood = [
                'side-left',
                'corner-upper-right',
                'corner-bottom-right',
              ].includes(type.id);
              return (
                <div
                  key={type.id}
                  className='relative'
                >
                  <StimulusSquare
                    type={type}
                    mini
                  />
                  <span
                    className={`absolute -bottom-1 -right-1 h-3 w-3 rounded-full border-2 border-slate-950 ${
                      isGood ? 'bg-amber-300' : 'bg-slate-600'
                    }`}
                  />
                </div>
              );
            })}
          </Localized>
        </div>
      ),
    },
    {
      title: 'Inspect one symbol',
      description:
        'Squares appear one at a time. Identify the highlighted corner or side and recall how you classified that type.',
      visual: (
        <div className='w-36'>
          <StimulusSquare type={getStimulus('corner-upper-right')} />
        </div>
      ),
    },
    {
      title: 'Classify immediately',
      description:
        'Press Left for bad and Right for good. On touch devices, use the matching buttons at the bottom of the screen.',
      visual: (
        <div className='flex flex-col items-center gap-3 sm:flex-row sm:gap-4'>
          <DemoKey>
            <Localized id='common.actions.bad' />
          </DemoKey>
          <div className='w-32'>
            <StimulusSquare type={getStimulus('side-left')} />
          </div>
          <DemoKey>
            <Localized id='common.labels.good' />
          </DemoKey>
        </div>
      ),
    },
    {
      title: 'Maintain your pace',
      description:
        'Keep classifying until the sequence ends. Review speed and cumulative accuracy over time; mistakes are marked by type on the graph.',
      visual: (
        <div className='w-full max-w-md rounded-2xl bg-slate-950 p-5'>
          <div className='flex items-end gap-2'>
            <Localized>
              {[42, 58, 50, 72, 65, 82, 76, 91].map((height, index) => (
                <span
                  key={index}
                  className={`flex-1 rounded-t ${
                    index === 3 ? 'bg-rose-400' : 'bg-amber-300'
                  }`}
                  style={{ height: `${height}px` }}
                />
              ))}
            </Localized>
          </div>
          <p className='mt-3 text-center text-xs text-slate-500'>
            <Localized id='common.results.performanceAndMistakesOverTime' />
          </p>
        </div>
      ),
    },
    {
      title: 'Or practice on paper',
      description:
        'Generate paper PDF opens a configurable paper version. Choose the targets, an exact rectangle count or a number of full pages, then download and print the PDF to circle the good symbols by hand.',
      visual: (
        <div className='w-full max-w-sm rounded-sm bg-white p-4 shadow-xl'>
          <div className='grid grid-cols-8 gap-1.5'>
            <Localized>
              {Array.from({ length: 32 }, (_, index) => (
                <StimulusSquare
                  key={index}
                  type={stimulusTypes[(index * 5 + 3) % stimulusTypes.length]}
                  printable
                />
              ))}
            </Localized>
          </div>
        </div>
      ),
    },
  ];

  return (
    <GuidedDemoModal
      title={t('tests.monotony.tutorialTitle')}
      introduction='Learn the classification rule and response keys before beginning the long sequence.'
      steps={steps}
      theme='amber'
    />
  );
}

export function CapacityToActDemo() {
  const t = useTextTranslation();

  const steps: DemoStep[] = [
    {
      title: 'Match colored circles',
      description:
        'When one of the ten circles illuminates, respond with its color. Its position does not change the answer.',
      visual: (
        <CapacityStimulusPanel
          activeCell={6}
          activeColor='red'
          activeTopLight={null}
          activeWarning={null}
          disabled
          compact
          onRespond={() => undefined}
        />
      ),
    },
    {
      title: 'Ignore the upper lights',
      description:
        'The two rounded lights run on a separate random cycle and can overlap another signal. When either illuminates, do nothing.',
      visual: (
        <CapacityStimulusPanel
          activeCell={null}
          activeColor={null}
          activeTopLight='left'
          activeWarning={null}
          disabled
          compact
          onRespond={() => undefined}
        />
      ),
    },
    {
      title: 'Follow the warning signs',
      description:
        'A red ! below the grid means click the pedal on the same side. The pedals sit beside the W controls.',
      visual: (
        <div className='flex w-full flex-col items-center gap-3'>
          <CapacityStimulusPanel
            activeCell={null}
            activeColor={null}
            activeTopLight={null}
            activeWarning='right'
            disabled
            compact
            onRespond={() => undefined}
          />
          <CapacityActionControls
            disabled
            compact
            onRespond={() => undefined}
          />
        </div>
      ),
    },
    {
      title: 'Listen for tones',
      description:
        'A deep tone calls for the left lever; a high tone calls for the right lever. The levers sit beside the circle display.',
      visual: (
        <CapacityStimulusPanel
          activeCell={null}
          activeColor={null}
          activeTopLight={null}
          activeWarning={null}
          disabled
          compact
          onRespond={() => undefined}
        />
      ),
    },
    {
      title: 'Use the W-shaped color controls',
      description:
        'Tap the matching color on touch screens. On a keyboard, use E, F, Z, J, and O in color order. Pedals and levers are click-only.',
      visual: (
        <CapacityActionControls
          disabled
          compact
          onRespond={() => undefined}
        />
      ),
    },
    {
      title: 'Follow both rhythms',
      description:
        'After a two-second preparation pause, colors, warnings, and sounds use the configured main interval while upper distractions appear independently.',
      visual: (
        <div className='grid w-full max-w-md grid-cols-2 gap-3 text-center sm:grid-cols-4'>
          <Localized>
            {[
              ['92.5%', 'Accuracy'],
              ['438 ms', 'Average'],
              ['2', 'Incorrect'],
              ['1', 'Missed'],
            ].map(([value, label]) => (
              <div
                key={label}
                className='rounded-2xl bg-slate-950 p-4'
              >
                <p className='font-mono text-xl font-black text-pink-300'>
                  <Localized>{value}</Localized>
                </p>
                <p className='mt-1 text-[10px] uppercase text-slate-500'>
                  <Localized>{label}</Localized>
                </p>
              </div>
            ))}
          </Localized>
        </div>
      ),
    },
  ];

  return (
    <GuidedDemoModal
      title={t('tests.capacityToAct.tutorialTitle')}
      introduction='Learn every visual and audio signal, its matching control, and which lights to ignore.'
      steps={steps}
      theme='pink'
    />
  );
}

export function TowerOfHanoiDemo() {
  const t = useTextTranslation();

  const demonstrationMoves = [
    { elapsedMs: 1_300 },
    { elapsedMs: 2_100 },
    { elapsedMs: 3_400 },
    { elapsedMs: 4_100 },
    { elapsedMs: 5_500 },
    { elapsedMs: 6_200 },
  ];
  const steps: DemoStep[] = [
    {
      title: 'Start on the left peg',
      description:
        'Every disk begins on the left, arranged from largest at the bottom to smallest at the top.',
      visual: (
        <HanoiBoard
          pegs={createHanoiPegs(4)}
          diskCount={4}
          compact
        />
      ),
    },
    {
      title: 'Choose a top disk',
      description:
        'Drag a movable disk, or tap it once. A selected source rises and receives a cyan outline.',
      visual: (
        <HanoiBoard
          pegs={createHanoiPegs(4)}
          diskCount={4}
          selectedPeg={0}
          compact
        />
      ),
    },
    {
      title: 'Move to another peg',
      description:
        'Drop on a destination or tap its peg. Only top disks move, and a larger disk can never cover a smaller one.',
      visual: (
        <HanoiBoard
          pegs={[[4, 3, 2], [1], []]}
          diskCount={4}
          compact
        />
      ),
    },
    {
      title: 'Build the tower on the right',
      description:
        'The test ends when every disk reaches the right peg. Your move count, duration, efficiency, and speed are saved.',
      visual: (
        <HanoiBoard
          pegs={[[], [], [4, 3, 2, 1]]}
          diskCount={4}
          compact
        />
      ),
    },
    {
      title: 'Review your pace',
      description:
        'The result graph shows cumulative moves per minute over time. Hover or touch it to inspect individual moves.',
      visual: (
        <div className='w-full max-w-xl'>
          <HanoiSpeedGraph
            moves={demonstrationMoves}
            compact
          />
        </div>
      ),
    },
  ];

  return (
    <GuidedDemoModal
      title={t('tests.towerOfHanoi.tutorialTitle')}
      introduction='Learn how to select, move, and legally stack disks before beginning the timed puzzle.'
      steps={steps}
      theme='cyan'
    />
  );
}

export function DistributiveAttentionDemo() {
  const t = useTextTranslation();

  const target = { row: 5, column: 2 };
  const steps: DemoStep[] = [
    {
      title: 'Read both edge signals',
      description:
        'In one-handed mode, one circle above the board and one beside it illuminate. Together they identify a single intersection.',
      visual: (
        <DistributiveAttentionBoard
          mode='one-handed'
          target={target}
          disabled
          compact
        />
      ),
    },
    {
      title: 'Press the intersection',
      description:
        'Tap the matching circle in the 8-by-8 grid. On desktop, click it with your mouse or trackpad.',
      visual: (
        <DistributiveAttentionBoard
          mode='one-handed'
          target={target}
          response={{ ...target, correct: true }}
          disabled
          compact
        />
      ),
    },
    {
      title: 'Reverse the signal',
      description:
        'In two-handed mode, one LED in the large grid illuminates. Find its row and column on the smaller grids.',
      visual: (
        <DistributiveAttentionBoard
          mode='two-handed'
          target={target}
          disabled
          compact
        />
      ),
    },
    {
      title: 'Press both coordinates together',
      description:
        'On touch screens, hold the matching side and top circles simultaneously.',
      visual: (
        <DistributiveAttentionBoard
          mode='two-handed'
          target={target}
          pressedRow={target.row}
          pressedColumn={target.column}
          disabled
          compact
        />
      ),
    },
    {
      title: 'Switch directions in mixed mode',
      description:
        'Mixed mode presents a balanced random sequence of both trial types. Edge LEDs mean press the large grid; a large-grid LED means press both edge coordinates.',
      visual: (
        <div className='grid w-full max-w-xl grid-cols-2 gap-3'>
          <div className='min-w-0'>
            <p className='mb-2 text-center text-[10px] font-bold uppercase tracking-wider text-slate-500 sm:text-xs'>
              <Localized id='common.labels.edgeLeds' />
            </p>
            <DistributiveAttentionBoard
              mode='one-handed'
              target={{ row: 2, column: 6 }}
              disabled
              compact
            />
          </div>
          <div className='min-w-0'>
            <p className='mb-2 text-center text-[10px] font-bold uppercase tracking-wider text-slate-500 sm:text-xs'>
              <Localized id='common.labels.mainGridLed' />
            </p>
            <DistributiveAttentionBoard
              mode='two-handed'
              target={{ row: 5, column: 1 }}
              disabled
              compact
            />
          </div>
        </div>
      ),
    },
    {
      title: 'Use a keyboard chord on desktop',
      description:
        'Rows use Q W E R / A S D F with the left hand. Columns use U I O P / J K L ; with the right. Hold the matching pair together.',
      visual: (
        <div className='w-full max-w-lg space-y-4'>
          <div>
            <p className='mb-2 text-xs font-bold uppercase tracking-wider text-slate-500'>
              <Localized id='common.symbols.leftHandRows18' />
            </p>
            <div className='grid grid-cols-8 gap-1'>
              <Localized>
                {['Q', 'W', 'E', 'R', 'A', 'S', 'D', 'F'].map(key => (
                  <span
                    key={key}
                    className='flex aspect-square min-w-0 items-center justify-center rounded-lg border border-white/20 bg-slate-950 font-mono text-xs font-black text-white shadow-[0_3px_0_rgba(255,255,255,0.08)] sm:text-base'
                  >
                    <Localized>{key}</Localized>
                  </span>
                ))}
              </Localized>
            </div>
          </div>
          <div>
            <p className='mb-2 text-xs font-bold uppercase tracking-wider text-slate-500'>
              <Localized id='common.symbols.rightHandColumns18' />
            </p>
            <div className='grid grid-cols-8 gap-1'>
              <Localized>
                {['U', 'I', 'O', 'P', 'J', 'K', 'L', ';'].map(key => (
                  <span
                    key={key}
                    className='flex aspect-square min-w-0 items-center justify-center rounded-lg border border-white/20 bg-slate-950 font-mono text-xs font-black text-white shadow-[0_3px_0_rgba(255,255,255,0.08)] sm:text-base'
                  >
                    <Localized>{key}</Localized>
                  </span>
                ))}
              </Localized>
            </div>
          </div>
        </div>
      ),
    },
  ];

  return (
    <GuidedDemoModal
      title={t('tests.distributiveAttention.tutorialTitle')}
      introduction='Learn the signal direction, touch gesture, desktop key chord, and how mixed mode alternates between them.'
      steps={steps}
      theme='rose'
    />
  );
}

export function PerceptionDemo() {
  const t = useTextTranslation();

  const steps: DemoStep[] = [
    {
      title: 'Read one signal on each side',
      description:
        'Each outer LED points to the number beside it. Read the illuminated value on both the left and right displays.',
      visual: (
        <div className='w-full max-w-lg'>
          <PerceptionStimulusDisplay
            leftTarget={2}
            rightTarget={4}
            compact
          />
        </div>
      ),
    },
    {
      title: 'Choose each side independently',
      description:
        'Choose a vertical, horizontal, or 2-by-2 layout separately for the left and right. That pair remains fixed throughout the test.',
      visual: (
        <div className='w-full max-w-lg rounded-2xl border border-white/10 bg-slate-950/50 p-4'>
          <div className='mb-3 flex justify-between gap-4 text-[10px] font-bold uppercase tracking-wider text-slate-500 sm:text-xs'>
            <span>
              <Localized id='common.symbols.verticalLeft' />
            </span>
            <span>
              <Localized id='common.symbols.22Right' />
            </span>
          </div>
          <PerceptionInputPair
            leftMethod='vertical'
            rightMethod='matrix'
            disabled
            compact
          />
        </div>
      ),
    },
    {
      title: 'Press the pair simultaneously',
      description:
        'Touch and hold the matching left and right buttons together. The response is recorded only when both sides are pressed.',
      visual: (
        <div className='w-full max-w-lg'>
          <PerceptionInputPair
            method='matrix'
            pressedLeft={2}
            pressedRight={4}
            disabled
            compact
          />
        </div>
      ),
    },
    {
      title: 'Use a key chord on desktop',
      description:
        'Left values 1–4 use Q W E R. Right values 1–4 use U I O P. Hold one key from each group together.',
      visual: (
        <div className='space-y-5 text-center'>
          <div className='flex flex-wrap justify-center gap-2'>
            <Localized>
              {['Q', 'W', 'E', 'R'].map(key => (
                <DemoKey key={key}>
                  <Localized>{key}</Localized>
                </DemoKey>
              ))}
            </Localized>
          </div>
          <p className='font-mono text-xs font-bold uppercase tracking-wider text-slate-500'>
            <Localized id='common.symbols.leftRight' />
          </p>
          <div className='flex flex-wrap justify-center gap-2'>
            <Localized>
              {['U', 'I', 'O', 'P'].map(key => (
                <DemoKey key={key}>
                  <Localized>{key}</Localized>
                </DemoKey>
              ))}
            </Localized>
          </div>
        </div>
      ),
    },
  ];

  return (
    <GuidedDemoModal
      title={t('tests.perception.tutorialTitle')}
      introduction='Learn how to translate two outer LED signals into one coordinated two-hand response.'
      steps={steps}
      theme='cyan'
    />
  );
}
