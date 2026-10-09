import { Localized, useTextTranslation } from './Localization';
import type { PointerEvent } from 'react';

export type DistributiveMode = 'one-handed' | 'two-handed';
export type DistributiveAxis = 'row' | 'column';
export type GridCoordinate = { row: number; column: number };

export const rowKeyCodes = [
  'KeyQ',
  'KeyW',
  'KeyE',
  'KeyR',
  'KeyA',
  'KeyS',
  'KeyD',
  'KeyF',
] as const;
export const rowKeyLabels = ['Q', 'W', 'E', 'R', 'A', 'S', 'D', 'F'];
export const columnKeyCodes = [
  'KeyU',
  'KeyI',
  'KeyO',
  'KeyP',
  'KeyJ',
  'KeyK',
  'KeyL',
  'Semicolon',
] as const;
export const columnKeyLabels = ['U', 'I', 'O', 'P', 'J', 'K', 'L', ';'];

function AxisCell({
  axis,
  index,
  mode,
  lit,
  pressed,
  disabled,
  compact,
  onPointerDown,
  onPointerUp,
}: {
  axis: DistributiveAxis;
  index: number;
  mode: DistributiveMode;
  lit: boolean;
  pressed: boolean;
  disabled: boolean;
  compact: boolean;
  onPointerDown?: (
    axis: DistributiveAxis,
    index: number,
    pointerId: number,
  ) => void;
  onPointerUp?: (axis: DistributiveAxis, pointerId: number) => void;
}) {
  const t = useTextTranslation();

  const label = axis === 'row' ? rowKeyLabels[index] : columnKeyLabels[index];
  const interactive = mode === 'two-handed' && !disabled;

  const releasePointer = (event: PointerEvent<HTMLButtonElement>) => {
    if (!interactive) return;
    onPointerUp?.(axis, event.pointerId);
  };

  return (
    <button
      type='button'
      disabled={!interactive}
      aria-label={`${axis} ${index + 1}${lit ? ', LED illuminated' : ''}${interactive ? t('common.accessibility.keyLabel', { label: label }) : ''}`}
      onPointerDown={event => {
        if (!interactive) return;
        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
        onPointerDown?.(axis, index, event.pointerId);
      }}
      onPointerUp={releasePointer}
      onPointerCancel={releasePointer}
      className={`relative flex aspect-square w-full items-center justify-center rounded-full border transition duration-75 ${
        lit
          ? 'border-rose-100 bg-rose-400 shadow-[0_0_20px_rgb(251_113_133/85%)]'
          : pressed
            ? 'scale-90 border-cyan-200 bg-cyan-300 shadow-[0_0_18px_rgb(103_232_249/65%)]'
            : 'border-slate-600 bg-slate-900 shadow-[inset_0_0_0_3px_rgb(2_6_23/45%)]'
      } ${interactive ? 'touch-none cursor-pointer active:scale-90' : 'cursor-default'}`}
      style={{ touchAction: 'none' }}
    >
      <Localized>
        {mode === 'two-handed' && (
          <span
            className={`font-mono font-black ${
              pressed ? 'text-slate-950' : 'text-slate-500'
            } ${compact ? 'text-[7px]' : 'text-[7px] sm:text-[10px]'}`}
          >
            <Localized>{label}</Localized>
          </span>
        )}
      </Localized>
    </button>
  );
}

export function DistributiveAttentionBoard({
  mode,
  target,
  pressedRow = null,
  pressedColumn = null,
  response = null,
  disabled = false,
  compact = false,
  onLargeCellPress,
  onAxisPointerDown,
  onAxisPointerUp,
}: {
  mode: DistributiveMode;
  target: GridCoordinate | null;
  pressedRow?: number | null;
  pressedColumn?: number | null;
  response?: (GridCoordinate & { correct: boolean }) | null;
  disabled?: boolean;
  compact?: boolean;
  onLargeCellPress?: (row: number, column: number) => void;
  onAxisPointerDown?: (
    axis: DistributiveAxis,
    index: number,
    pointerId: number,
  ) => void;
  onAxisPointerUp?: (axis: DistributiveAxis, pointerId: number) => void;
}) {
  const t = useTextTranslation();

  const gap = compact ? 'gap-1' : 'gap-1 sm:gap-1.5';

  return (
    <div
      className={`relative grid aspect-square grid-cols-9 grid-rows-9 ${gap} ${
        compact ? 'w-full max-w-md' : 'w-[min(94vw,78dvh)] max-w-4xl'
      }`}
      aria-label={t('common.accessibility.modeDistributiveAttentionBoard', {
        mode: mode,
      })}
    >
      <span
        aria-hidden='true'
        className='pointer-events-none col-start-2 col-end-10 row-start-2 row-end-10 rounded-2xl border border-white/10 bg-slate-950/80 shadow-2xl'
      />

      <Localized>
        {Array.from({ length: 8 }, (_, column) => (
          <div
            key={column}
            className='relative z-10'
            style={{ gridColumn: column + 2, gridRow: 1 }}
          >
            <AxisCell
              axis='column'
              index={column}
              mode={mode}
              lit={mode === 'one-handed' && target?.column === column}
              pressed={pressedColumn === column}
              disabled={disabled}
              compact={compact}
              onPointerDown={onAxisPointerDown}
              onPointerUp={onAxisPointerUp}
            />
          </div>
        ))}
      </Localized>

      <Localized>
        {Array.from({ length: 8 }, (_, row) => (
          <div
            key={row}
            className='relative z-10'
            style={{ gridColumn: 1, gridRow: row + 2 }}
          >
            <AxisCell
              axis='row'
              index={row}
              mode={mode}
              lit={mode === 'one-handed' && target?.row === row}
              pressed={pressedRow === row}
              disabled={disabled}
              compact={compact}
              onPointerDown={onAxisPointerDown}
              onPointerUp={onAxisPointerUp}
            />
          </div>
        ))}
      </Localized>

      <Localized>
        {Array.from({ length: 64 }, (_, index) => {
          const row = Math.floor(index / 8);
          const column = index % 8;
          const lit =
            mode === 'two-handed' &&
            target?.row === row &&
            target.column === column;
          const responded = response?.row === row && response.column === column;

          return (
            <button
              key={index}
              type='button'
              disabled={disabled || mode !== 'one-handed'}
              aria-label={t('common.accessibility.gridRowRowColumnColumnLit', {
                row: row + 1,
                column: column + 1,
                lit: lit ? ', LED illuminated' : '',
              })}
              onPointerDown={event => {
                if (disabled || mode !== 'one-handed') return;
                event.preventDefault();
                onLargeCellPress?.(row, column);
              }}
              className={`relative z-10 aspect-square rounded-full border transition duration-75 ${
                responded
                  ? response.correct
                    ? 'border-emerald-100 bg-emerald-400 shadow-[0_0_16px_rgb(52_211_153/80%)]'
                    : 'border-red-100 bg-red-500 shadow-[0_0_16px_rgb(239_68_68/80%)]'
                  : lit
                    ? 'scale-105 border-rose-100 bg-rose-400 shadow-[0_0_18px_rgb(251_113_133/90%)]'
                    : 'border-slate-700 bg-slate-900 shadow-[inset_0_0_0_2px_rgb(2_6_23/55%)]'
              } ${mode === 'one-handed' && !disabled ? 'cursor-pointer hover:border-slate-500 active:scale-90' : 'cursor-default'}`}
              style={{
                gridColumn: column + 2,
                gridRow: row + 2,
                touchAction: 'manipulation',
              }}
            />
          );
        })}
      </Localized>
    </div>
  );
}
