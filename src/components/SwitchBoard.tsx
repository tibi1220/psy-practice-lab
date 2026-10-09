import { Localized, useTextTranslation } from './Localization';
import { DeductiveShape } from './DeductiveBoard';
import { SHAPE_NAMES } from '../lib/deductive-reasoning';
import { applyChain, applyCode, formatCode } from '../lib/switch-reasoning';
import type { Code, SwitchPuzzle } from '../lib/switch-reasoning';

function ShapeSequence({ shapes, label }: { shapes: Code; label: string }) {
  const t = useTextTranslation();

  return (
    <div
      role='group'
      aria-label={t(label)}
    >
      <p className='mb-2 text-center text-xs font-semibold uppercase tracking-widest text-slate-400'>
        <Localized>{label}</Localized>
      </p>
      <div className='grid grid-cols-4 gap-2'>
        <Localized>
          {shapes.map((shape, index) => (
            <div
              key={index}
              role='img'
              aria-label={t('common.accessibility.positionIndexShape', {
                index: index + 1,
                shape: SHAPE_NAMES[shape],
              })}
              className='flex aspect-square items-center justify-center rounded-xl border border-white/10 bg-white/5'
            >
              <DeductiveShape value={shape} />
            </div>
          ))}
        </Localized>
      </div>
    </div>
  );
}

export function SwitchBoard({
  puzzle,
  onChoose,
  reveal = false,
  selected,
}: {
  puzzle: SwitchPuzzle;
  onChoose?: (index: number) => void;
  reveal?: boolean;
  selected?: number;
}) {
  const t = useTextTranslation();

  const intermediate = applyChain(puzzle.input, puzzle.fixedCodes);
  return (
    <div className='mx-auto w-full max-w-md'>
      <ShapeSequence
        shapes={puzzle.input}
        label='Input'
      />
      <Localized>
        {puzzle.fixedCodes.map((code, index) => (
          <div
            key={index}
            className='my-3 text-center'
          >
            <p
              aria-hidden='true'
              className='text-slate-500'
            >
              <Localized>{'↓'}</Localized>
            </p>
            <p className='my-2 text-xs uppercase tracking-widest text-slate-400'>
              <Localized id='common.labels.fixedCode' />{' '}
              <Localized>{index + 1}</Localized>
            </p>
            <p className='inline-block rounded-xl border border-white/15 bg-white/10 px-6 py-3 font-mono text-2xl'>
              <Localized>{formatCode(code)}</Localized>
            </p>
          </div>
        ))}
      </Localized>
      <Localized>
        {reveal && puzzle.fixedCodes.length > 0 && (
          <div className='my-4'>
            <ShapeSequence
              shapes={intermediate}
              label='After fixed code'
            />
          </div>
        )}
      </Localized>
      <p
        aria-hidden='true'
        className='my-3 text-center text-slate-500'
      >
        <Localized>{'↓'}</Localized>
      </p>
      <p className='mb-3 text-center text-sm font-semibold text-cyan-200'>
        <Localized>
          {reveal ? 'Correct code highlighted' : 'Choose the missing code'}
        </Localized>
      </p>
      <div
        role='group'
        aria-label={t('common.labels.codeChoices')}
        className='grid grid-cols-3 gap-2'
      >
        <Localized>
          {puzzle.options.map((code, index) => (
            <button
              key={formatCode(code)}
              type='button'
              disabled={!onChoose}
              onClick={() => onChoose?.(index)}
              aria-label={t('common.accessibility.codeFormatcode', {
                formatCode: formatCode(code),
              })}
              className={`min-h-14 rounded-xl border px-1 font-mono text-lg font-bold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 sm:text-2xl ${reveal && index === puzzle.answer ? 'border-cyan-300 bg-cyan-300/15 text-cyan-200' : reveal && index === selected ? 'border-rose-300 text-rose-200' : 'border-white/15 bg-white/5 hover:bg-white/15'}`}
            >
              <Localized>{formatCode(code)}</Localized>
            </button>
          ))}
        </Localized>
      </div>
      <p
        aria-hidden='true'
        className='my-3 text-center text-slate-500'
      >
        <Localized>{'↓'}</Localized>
      </p>
      <ShapeSequence
        shapes={puzzle.output}
        label='Output'
      />
      <Localized>
        {reveal && (
          <p className='mt-5 text-sm leading-6 text-slate-300'>
            <Localized>
              {puzzle.fixedCodes.length > 0
                ? 'Start from the sequence after the fixed code. '
                : 'Start from the input sequence. '}
            </Localized>
            <Localized>
              {puzzle.options[puzzle.answer]
                .map(
                  (position, index) =>
                    `${SHAPE_NAMES[intermediate[position - 1]]} moves from position ${position} to position ${index + 1}`,
                )
                .join('; ')}
            </Localized>
            <Localized>{'.'}</Localized>
          </p>
        )}
      </Localized>
      <Localized>
        {reveal && selected !== undefined && selected !== puzzle.answer && (
          <p className='mt-3 text-sm leading-6 text-rose-200'>
            <Localized id='common.labels.yourCodeProduces' />
            <Localized> </Localized>
            <Localized>
              {applyCode(intermediate, puzzle.options[selected])
                .map(shape => SHAPE_NAMES[shape])
                .join(', ')}
            </Localized>
            <Localized>{'.'}</Localized>
          </p>
        )}
      </Localized>
    </div>
  );
}
