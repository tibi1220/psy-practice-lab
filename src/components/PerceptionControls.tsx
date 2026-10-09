import { Localized, useTextTranslation } from './Localization';
import type { PointerEvent } from 'react';

export type PerceptionSide = 'left' | 'right';
export type PerceptionValue = 1 | 2 | 3 | 4;
export type PerceptionInputMethod = 'vertical' | 'horizontal' | 'matrix';

export const perceptionInputMethods: Array<{
  id: PerceptionInputMethod;
  label: string;
  description: string;
}> = [
  {
    id: 'vertical',
    label: 'Vertical',
    description: '1–4 from top to bottom',
  },
  {
    id: 'horizontal',
    label: 'Horizontal',
    description: '4–1 from outside to inside',
  },
  {
    id: 'matrix',
    label: '2 × 2',
    description: 'Mirrored four-button blocks',
  },
];

export const leftPerceptionKeyCodes = ['KeyQ', 'KeyW', 'KeyE', 'KeyR'] as const;
export const rightPerceptionKeyCodes = [
  'KeyU',
  'KeyI',
  'KeyO',
  'KeyP',
] as const;
export const leftPerceptionKeyLabels = ['Q', 'W', 'E', 'R'];
export const rightPerceptionKeyLabels = ['U', 'I', 'O', 'P'];

const values: PerceptionValue[] = [1, 2, 3, 4];

function StimulusColumn({
  side,
  activeValue,
  compact,
}: {
  side: PerceptionSide;
  activeValue: PerceptionValue | null;
  compact: boolean;
}) {
  const t = useTextTranslation();

  return (
    <div
      className={`grid grid-rows-4 ${compact ? 'w-16 gap-1' : 'w-20 gap-1.5 sm:w-24'}`}
      aria-label={t('common.accessibility.sideSignalDisplay', { side: side })}
    >
      <Localized>
        {values.map(value => {
          const lit = activeValue === value;
          const led = (
            <span
              aria-hidden='true'
              className={`${compact ? 'h-3 w-3' : 'h-4 w-4 sm:h-5 sm:w-5'} shrink-0 rounded-full border transition-colors duration-75 ${
                lit
                  ? 'border-cyan-100 bg-cyan-300 shadow-[0_0_18px_rgb(103_232_249/95%)]'
                  : 'border-slate-600 bg-slate-900 shadow-[inset_0_0_0_2px_rgb(2_6_23/65%)]'
              }`}
            />
          );

          return (
            <div
              key={value}
              className={`flex items-center ${side === 'left' ? 'flex-row' : 'flex-row-reverse'}`}
            >
              <Localized>{led}</Localized>
              <div
                className={`${compact ? 'h-11 text-lg' : 'h-12 text-xl sm:h-14 sm:text-2xl'} flex min-w-0 flex-1 items-center justify-center rounded-xl border border-white/10 bg-slate-900 font-mono font-black text-white shadow-inner shadow-black/30`}
              >
                <Localized>{value}</Localized>
              </div>
            </div>
          );
        })}
      </Localized>
    </div>
  );
}

export function PerceptionStimulusDisplay({
  leftTarget,
  rightTarget,
  compact = false,
}: {
  leftTarget: PerceptionValue | null;
  rightTarget: PerceptionValue | null;
  compact?: boolean;
}) {
  return (
    <div className='flex w-full items-start justify-between gap-10'>
      <StimulusColumn
        side='left'
        activeValue={leftTarget}
        compact={compact}
      />
      <StimulusColumn
        side='right'
        activeValue={rightTarget}
        compact={compact}
      />
    </div>
  );
}

function getVisualOrder(
  side: PerceptionSide,
  method: PerceptionInputMethod,
): PerceptionValue[] {
  if (method === 'vertical') return [1, 2, 3, 4];
  if (method === 'horizontal') {
    return side === 'left' ? [4, 3, 2, 1] : [1, 2, 3, 4];
  }
  return side === 'left' ? [3, 2, 4, 1] : [2, 3, 1, 4];
}

function InputGrid({
  side,
  method,
  pressedValue,
  responseCorrect,
  disabled,
  compact,
  onPointerDown,
  onPointerUp,
}: {
  side: PerceptionSide;
  method: PerceptionInputMethod;
  pressedValue: PerceptionValue | null;
  responseCorrect: boolean | null;
  disabled: boolean;
  compact: boolean;
  onPointerDown?: (
    side: PerceptionSide,
    value: PerceptionValue,
    pointerId: number,
  ) => void;
  onPointerUp?: (side: PerceptionSide, pointerId: number) => void;
}) {
  const t = useTextTranslation();

  const order = getVisualOrder(side, method);
  const keyLabels =
    side === 'left' ? leftPerceptionKeyLabels : rightPerceptionKeyLabels;
  const gridClass =
    method === 'vertical'
      ? compact
        ? 'w-16 grid-cols-1'
        : 'w-20 grid-cols-1 sm:w-24'
      : method === 'horizontal'
        ? compact
          ? 'w-full grid-cols-4'
          : 'w-[min(46vw,26rem)] grid-cols-4'
        : compact
          ? 'w-28 grid-cols-2'
          : 'w-36 grid-cols-2 sm:w-44';

  const releasePointer = (event: PointerEvent<HTMLButtonElement>) => {
    onPointerUp?.(side, event.pointerId);
  };

  return (
    <div
      className={`grid gap-1.5 ${gridClass}`}
      aria-label={t('common.accessibility.sideMethodInputGrid', {
        side: side,
        method: method,
      })}
    >
      <Localized>
        {order.map(value => {
          const pressed = pressedValue === value;
          const feedbackClass =
            pressed && responseCorrect !== null
              ? responseCorrect
                ? 'scale-95 border-emerald-100 bg-emerald-400 text-emerald-950 shadow-[0_0_18px_rgb(52_211_153/70%)]'
                : 'scale-95 border-red-100 bg-red-500 text-white shadow-[0_0_18px_rgb(239_68_68/70%)]'
              : pressed
                ? 'scale-95 border-cyan-100 bg-cyan-300 text-slate-950 shadow-[0_0_18px_rgb(103_232_249/65%)]'
                : 'border-slate-600 bg-slate-900 text-white shadow-[inset_0_0_0_2px_rgb(2_6_23/50%)]';

          return (
            <button
              key={value}
              type='button'
              disabled={disabled}
              aria-label={t(
                '{{side}} response {{value}}, keyboard {{keyLabels}}',
                { side: side, value: value, keyLabels: keyLabels[value - 1] },
              )}
              onPointerDown={event => {
                if (disabled) return;
                event.preventDefault();
                event.currentTarget.setPointerCapture(event.pointerId);
                onPointerDown?.(side, value, event.pointerId);
              }}
              onPointerUp={releasePointer}
              onPointerCancel={releasePointer}
              className={`${compact ? 'text-lg' : 'text-xl sm:text-2xl'} relative aspect-square touch-none rounded-xl border font-mono font-black transition duration-75 ${feedbackClass} ${disabled ? 'cursor-default' : 'cursor-pointer active:scale-95'}`}
              style={{ touchAction: 'none' }}
            >
              <Localized>{value}</Localized>
              <Localized>
                {!compact && (
                  <span
                    className={`absolute bottom-1 right-1.5 text-[8px] font-bold ${pressed ? 'text-slate-950/60' : 'text-slate-500'}`}
                  >
                    <Localized>{keyLabels[value - 1]}</Localized>
                  </span>
                )}
              </Localized>
            </button>
          );
        })}
      </Localized>
    </div>
  );
}

export function PerceptionInputPair({
  method,
  leftMethod,
  rightMethod,
  pressedLeft = null,
  pressedRight = null,
  leftCorrect = null,
  rightCorrect = null,
  disabled = false,
  compact = false,
  onPointerDown,
  onPointerUp,
}: {
  method?: PerceptionInputMethod;
  leftMethod?: PerceptionInputMethod;
  rightMethod?: PerceptionInputMethod;
  pressedLeft?: PerceptionValue | null;
  pressedRight?: PerceptionValue | null;
  leftCorrect?: boolean | null;
  rightCorrect?: boolean | null;
  disabled?: boolean;
  compact?: boolean;
  onPointerDown?: (
    side: PerceptionSide,
    value: PerceptionValue,
    pointerId: number,
  ) => void;
  onPointerUp?: (side: PerceptionSide, pointerId: number) => void;
}) {
  const resolvedLeftMethod = leftMethod ?? method ?? 'vertical';
  const resolvedRightMethod = rightMethod ?? method ?? 'vertical';
  const includesHorizontal =
    resolvedLeftMethod === 'horizontal' || resolvedRightMethod === 'horizontal';

  return (
    <div
      className={`flex w-full items-end justify-between ${includesHorizontal ? 'gap-2' : 'gap-5'}`}
    >
      <InputGrid
        side='left'
        method={resolvedLeftMethod}
        pressedValue={pressedLeft}
        responseCorrect={leftCorrect}
        disabled={disabled}
        compact={compact}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
      />
      <InputGrid
        side='right'
        method={resolvedRightMethod}
        pressedValue={pressedRight}
        responseCorrect={rightCorrect}
        disabled={disabled}
        compact={compact}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
      />
    </div>
  );
}
