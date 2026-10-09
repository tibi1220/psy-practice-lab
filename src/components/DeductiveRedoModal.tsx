import { Localized, useTextTranslation } from './Localization';
import * as Dialog from '@radix-ui/react-dialog';
import { useRef, useState } from 'react';
import { DeductiveBoard, ShapeChoices } from './DeductiveBoard';
import { SHAPE_NAMES } from '../lib/deductive-reasoning';
import type { Puzzle } from '../lib/deductive-reasoning';

const button =
  'min-h-11 rounded-full border border-white/15 px-5 font-bold transition hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300 disabled:cursor-not-allowed disabled:opacity-40';

function RedoTask({ puzzle }: { puzzle: Puzzle }) {
  const [notes, setNotes] = useState<Record<number, number>>({});
  const [selectedCell, setSelectedCell] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<{
    selected: number;
    correct: boolean;
  } | null>(null);
  const submitted = useRef(false);
  const reset = () => {
    submitted.current = false;
    setNotes({});
    setSelectedCell(null);
    setFeedback(null);
  };
  const choose = (value: number) => {
    if (submitted.current) return;
    if (selectedCell !== null) {
      setNotes(current => ({ ...current, [selectedCell]: value }));
      return;
    }
    submitted.current = true;
    setFeedback({ selected: value, correct: value === puzzle.answer });
  };
  return (
    <>
      <DeductiveBoard
        puzzle={puzzle}
        notes={notes}
        selectedCell={selectedCell}
        reveal={!!feedback}
        onSelectCell={
          feedback
            ? undefined
            : index =>
                setSelectedCell(current => (current === index ? null : index))
        }
      />
      <p
        role='status'
        className={`mt-5 text-center text-sm ${feedback ? (feedback.correct ? 'text-emerald-300' : 'text-rose-400') : 'text-slate-300'}`}
      >
        <Localized>
          {feedback
            ? feedback.correct
              ? 'Correct!'
              : `Incorrect. The correct shape is ${SHAPE_NAMES[puzzle.answer].toLowerCase()}.`
            : selectedCell === null
              ? 'Choose the missing shape to submit your answer.'
              : `Place a note at row ${Math.floor(selectedCell / puzzle.size) + 1}, column ${(selectedCell % puzzle.size) + 1}.`}
        </Localized>
      </p>
      <ShapeChoices
        size={puzzle.size}
        palette={puzzle.palette}
        feedback={feedback}
        label={selectedCell === null ? 'Redo answer' : 'Place note'}
        onChoose={choose}
      />
      <Localized>
        {selectedCell !== null && !feedback && (
          <div className='mt-4 flex flex-wrap justify-center gap-2'>
            <button
              type='button'
              className={button}
              onClick={() => setSelectedCell(null)}
            >
              <Localized id='common.actions.returnToAnswering' />
            </button>
            <button
              type='button'
              className={button}
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
      <div className='mt-4 flex flex-wrap justify-center gap-3'>
        <Localized>
          {feedback ? (
            <button
              type='button'
              className={button}
              onClick={reset}
            >
              <Localized id='common.actions.tryAgain' />
            </button>
          ) : (
            <button
              type='button'
              className={button}
              disabled={Object.keys(notes).length === 0}
              onClick={() => {
                setNotes({});
                setSelectedCell(null);
              }}
            >
              <Localized id='deductiveReasoning.actions.clearMarkedCells' />
            </button>
          )}
        </Localized>
      </div>
      <p className='mt-5 text-center text-sm leading-6 text-slate-400'>
        <Localized id='common.symbols.eachShapeAppearsOnceInEveryRowAndColumn' />
      </p>
    </>
  );
}

export function DeductiveRedoModal({
  puzzle,
  question,
}: {
  puzzle: Puzzle;
  question: number;
}) {
  const t = useTextTranslation();

  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <button
          type='button'
          className={`${button} min-h-14 px-7`}
        >
          <Localized id='common.symbols.redoTask' />
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className='demo-modal-overlay fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm' />
        <div className='pointer-events-none fixed inset-0 z-50 grid place-items-center p-4'>
          <Dialog.Content className='demo-modal-content pointer-events-auto relative flex max-h-[min(92dvh,48rem)] w-full max-w-2xl flex-col overflow-hidden rounded-[2rem] border border-white/15 bg-slate-950 text-white shadow-2xl shadow-black/60 focus:outline-none lg:max-h-[92dvh] lg:min-h-[min(80dvh,64rem)]'>
            <header className='flex shrink-0 items-start justify-between gap-5 border-b border-white/10 px-5 py-5 sm:px-7'>
              <div>
                <p className='font-mono text-xs font-bold uppercase tracking-[0.25em] text-emerald-300'>
                  <Localized id='common.labels.practiceRetry' />
                </p>
                <Dialog.Title className='mt-2 text-2xl font-black sm:text-3xl'>
                  <Localized id='common.labels.question' />{' '}
                  <Localized>{question}</Localized>{' '}
                  <Localized id='common.symbols.redoTaskDetail' />
                </Dialog.Title>
                <Dialog.Description className='mt-2 text-sm leading-6 text-slate-400'>
                  <Localized id='common.results.solveTheSameTaskAgainFromItsOriginalClues' />
                </Dialog.Description>
              </div>
              <Dialog.Close asChild>
                <button
                  type='button'
                  aria-label={t('common.actions.closeRedoTask')}
                  className={`${button} h-11 w-11 shrink-0 px-0 text-xl`}
                >
                  <Localized>{'×'}</Localized>
                </button>
              </Dialog.Close>
            </header>
            <div className='min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-7 sm:py-6'>
              <RedoTask puzzle={puzzle} />
            </div>
            <footer className='flex shrink-0 justify-end border-t border-white/10 px-5 py-4 sm:px-7'>
              <Dialog.Close asChild>
                <button
                  type='button'
                  className={button}
                >
                  <Localized id='common.actions.close' />
                </button>
              </Dialog.Close>
            </footer>
          </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
