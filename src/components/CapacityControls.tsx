import { Localized, useTextTranslation } from './Localization';
export const capacityColors = [
  { id: 'red', label: 'Red', key: 'e', hex: '#fb7185', text: '#0f172a' },
  {
    id: 'yellow',
    label: 'Yellow',
    key: 'f',
    hex: '#facc15',
    text: '#0f172a',
  },
  {
    id: 'green',
    label: 'Green',
    key: 'z',
    hex: '#4ade80',
    text: '#0f172a',
  },
  {
    id: 'white',
    label: 'White',
    key: 'j',
    hex: '#f8fafc',
    text: '#0f172a',
  },
  { id: 'blue', label: 'Blue', key: 'o', hex: '#60a5fa', text: '#0f172a' },
] as const;

export type CapacityColor = (typeof capacityColors)[number]['id'];
export type CapacitySide = 'left' | 'right';
export type CapacityAction =
  CapacityColor | 'left-lever' | 'right-lever' | 'left-pedal' | 'right-pedal';

const buttonPositions: Record<CapacityColor, string> = {
  red: 'col-start-1 row-start-1',
  yellow: 'col-start-2 row-start-2',
  green: 'col-start-3 row-start-1',
  white: 'col-start-4 row-start-2',
  blue: 'col-start-5 row-start-1',
};

export function CapacityDisplay({
  activeCell,
  activeColor,
  compact = false,
}: {
  activeCell: number | null;
  activeColor: CapacityColor | null;
  compact?: boolean;
}) {
  const t = useTextTranslation();

  const color = capacityColors.find(option => option.id === activeColor);

  return (
    <div
      className={`grid w-full grid-cols-5 grid-rows-2 rounded-3xl border border-white/10 bg-slate-950/80 shadow-2xl ${
        compact ? 'max-w-sm gap-2 p-3' : 'max-w-3xl gap-2 p-3 sm:gap-5 sm:p-6'
      }`}
      role='img'
      aria-label={t(
        activeCell === null || !color
          ? 'Ten inactive signal circles'
          : t('common.accessibility.circleActivecellIlluminatedLabel', {
              activeCell: activeCell + 1,
              label: color.label,
            }),
      )}
    >
      <Localized>
        {Array.from({ length: 10 }, (_, index) => {
          const active = index === activeCell && !!color;
          return (
            <span
              key={index}
              className='aspect-square rounded-full border-2 transition-colors duration-75'
              style={{
                backgroundColor: active ? color.hex : '#0f172a',
                borderColor: active ? color.hex : '#334155',
                boxShadow: active
                  ? `0 0 ${compact ? 18 : 30}px ${color.hex}99`
                  : 'inset 0 0 0 3px rgb(2 6 23 / 45%)',
              }}
            />
          );
        })}
      </Localized>
    </div>
  );
}

export function CapacityTopLights({
  activeSide,
  compact = false,
}: {
  activeSide: CapacitySide | null;
  compact?: boolean;
}) {
  const t = useTextTranslation();

  return (
    <div
      className={`grid grid-cols-2 ${compact ? 'gap-12' : 'gap-16 sm:gap-32'}`}
      role='img'
      aria-label={t(
        activeSide
          ? t('common.accessibility.activesideDistractionLightIlluminated', {
              activeSide: activeSide,
            })
          : 'Distraction lights inactive',
      )}
    >
      <Localized>
        {(['left', 'right'] as const).map(side => {
          const active = activeSide === side;
          return (
            <span
              key={side}
              className={`block rounded-xl border transition-colors duration-75 ${
                compact ? 'h-5' : 'h-6 sm:h-8'
              }`}
              style={{
                backgroundColor: active ? '#f8fafc' : '#0f172a',
                borderColor: active ? '#f8fafc' : '#334155',
                boxShadow: active ? '0 0 24px rgb(248 250 252 / 75%)' : 'none',
              }}
            />
          );
        })}
      </Localized>
    </div>
  );
}

export function CapacityWarningDisplay({
  activeSide,
  compact = false,
}: {
  activeSide: CapacitySide | null;
  compact?: boolean;
}) {
  const t = useTextTranslation();

  return (
    <div
      className={`mx-auto grid w-3/5 max-w-xs grid-cols-2 overflow-hidden rounded-xl border border-white/10 bg-slate-950/80 ${
        compact ? 'max-w-40' : 'max-w-56 sm:max-w-xs'
      }`}
      role='img'
      aria-label={t(
        activeSide
          ? t('common.accessibility.activesidePedalWarning', {
              activeSide: activeSide,
            })
          : 'Pedal warnings inactive',
      )}
    >
      <Localized>
        {(['left', 'right'] as const).map(side => {
          const active = activeSide === side;
          return (
            <span
              key={side}
              className={`flex items-center justify-center font-black first:border-r first:border-white/10 ${
                compact ? 'h-10 text-3xl' : 'h-12 text-4xl sm:h-14 sm:text-5xl'
              } ${active ? 'text-red-500' : 'text-slate-900'}`}
              style={{
                textShadow: active ? '0 0 16px rgb(239 68 68 / 90%)' : 'none',
              }}
            >
              <Localized>{'!'}</Localized>
            </span>
          );
        })}
      </Localized>
    </div>
  );
}

function LeverButton({
  side,
  onRespond,
  disabled,
  compact,
}: {
  side: CapacitySide;
  onRespond: (action: CapacityAction) => void;
  disabled: boolean;
  compact: boolean;
}) {
  const t = useTextTranslation();

  return (
    <button
      type='button'
      disabled={disabled}
      onPointerDown={() => onRespond(`${side}-lever`)}
      aria-label={t('common.accessibility.pullSideLever', { side: side })}
      className={`group flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] transition hover:bg-white/[0.08] active:scale-95 disabled:cursor-default ${
        compact ? 'h-24 w-10' : 'h-28 w-10 sm:h-36 sm:w-14'
      }`}
      style={{ touchAction: 'manipulation' }}
    >
      <span className='flex origin-bottom flex-col items-center transition-transform duration-150 group-active:translate-y-2 group-active:scale-y-75'>
        <span className='h-4 w-4 rounded-full bg-pink-300 shadow-[0_0_14px_rgb(249_168_212/45%)] sm:h-5 sm:w-5' />
        <span className='h-10 w-1.5 bg-slate-400 sm:h-14' />
      </span>
      <span className='h-3 w-7 rounded-full bg-slate-700 transition-colors group-active:bg-pink-300 sm:w-9' />
      <span className='mt-1 text-[7px] font-bold uppercase tracking-wider text-slate-500 sm:text-[9px]'>
        <Localized>{side}</Localized>
      </span>
    </button>
  );
}

export function CapacityStimulusPanel({
  activeCell,
  activeColor,
  activeTopLight,
  activeWarning,
  onRespond,
  disabled = false,
  compact = false,
}: {
  activeCell: number | null;
  activeColor: CapacityColor | null;
  activeTopLight: CapacitySide | null;
  activeWarning: CapacitySide | null;
  onRespond: (action: CapacityAction) => void;
  disabled?: boolean;
  compact?: boolean;
}) {
  return (
    <div
      className={`grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center ${
        compact
          ? 'max-w-lg gap-x-2 gap-y-2'
          : 'max-w-5xl gap-x-2 gap-y-2 sm:gap-x-5 sm:gap-y-3'
      }`}
    >
      <div className='col-start-2'>
        <CapacityTopLights
          activeSide={activeTopLight}
          compact={compact}
        />
      </div>
      <div className='col-start-1 row-start-2'>
        <LeverButton
          side='left'
          onRespond={onRespond}
          disabled={disabled}
          compact={compact}
        />
      </div>
      <div className='col-start-2 row-start-2 flex justify-center'>
        <CapacityDisplay
          activeCell={activeCell}
          activeColor={activeColor}
          compact={compact}
        />
      </div>
      <div className='col-start-3 row-start-2'>
        <LeverButton
          side='right'
          onRespond={onRespond}
          disabled={disabled}
          compact={compact}
        />
      </div>
      <div className='col-start-2 row-start-3'>
        <CapacityWarningDisplay
          activeSide={activeWarning}
          compact={compact}
        />
      </div>
    </div>
  );
}

export function CapacityResponsePad({
  onRespond,
  disabled = false,
  compact = false,
}: {
  onRespond: (color: CapacityColor) => void;
  disabled?: boolean;
  compact?: boolean;
}) {
  const t = useTextTranslation();

  return (
    <div
      className={`relative grid w-full grid-cols-5 grid-rows-2 gap-x-1 ${
        compact ? 'max-w-sm gap-y-3' : 'max-w-3xl gap-y-3 sm:gap-y-6'
      }`}
    >
      <svg
        aria-hidden='true'
        viewBox='0 0 100 100'
        preserveAspectRatio='none'
        className='pointer-events-none absolute inset-x-[8%] inset-y-[16%] h-[68%] w-[84%]'
      >
        <polyline
          points='0,0 25,100 50,0 75,100 100,0'
          fill='none'
          stroke='rgb(255 255 255 / 10%)'
          strokeWidth='2'
          vectorEffect='non-scaling-stroke'
        />
      </svg>

      <Localized>
        {capacityColors.map(color => (
          <button
            key={color.id}
            type='button'
            disabled={disabled}
            aria-label={t(
              'common.accessibility.respondLabelKeyboardTouppercase',
              {
                label: color.label,
                toUpperCase: color.key.toUpperCase(),
              },
            )}
            onPointerDown={() => onRespond(color.id)}
            className={`relative z-10 mx-auto flex aspect-[2/3] w-full items-center justify-center rounded-xl border-4 border-slate-950 font-black shadow-xl transition active:scale-95 disabled:cursor-default ${buttonPositions[color.id]} ${
              compact ? 'max-w-14' : 'max-w-14 sm:max-w-20'
            }`}
            style={{
              backgroundColor: color.hex,
              color: color.text,
              touchAction: 'manipulation',
            }}
          >
            <span className='text-center'>
              <span
                className={`block uppercase ${compact ? 'text-[7px]' : 'text-[8px] sm:text-[10px]'}`}
              >
                <Localized>{color.label}</Localized>
              </span>
              <span
                className={`mt-0.5 block font-mono uppercase opacity-60 ${compact ? 'text-[8px]' : 'text-[10px]'}`}
              >
                <Localized>{color.key}</Localized>
              </span>
            </span>
          </button>
        ))}
      </Localized>
    </div>
  );
}

function PedalButton({
  side,
  onRespond,
  disabled,
  compact,
}: {
  side: CapacitySide;
  onRespond: (action: CapacityAction) => void;
  disabled: boolean;
  compact: boolean;
}) {
  const t = useTextTranslation();

  return (
    <button
      type='button'
      disabled={disabled}
      onPointerDown={() => onRespond(`${side}-pedal`)}
      aria-label={t('common.accessibility.pushSidePedal', { side: side })}
      className={`group flex shrink-0 flex-col items-center justify-center rounded-2xl border border-white/15 bg-slate-800 shadow-[inset_0_-6px_0_rgb(2_6_23/45%)] transition hover:bg-slate-700 active:translate-y-1 active:shadow-none disabled:cursor-default ${
        compact ? 'h-14 w-12' : 'h-16 w-12 sm:h-20 sm:w-20'
      }`}
      style={{ touchAction: 'manipulation' }}
    >
      <span
        aria-hidden='true'
        className='text-lg text-slate-400 transition-transform duration-100 group-active:translate-y-1 group-active:scale-y-75 group-active:text-pink-300'
      >
        <Localized>{'▰'}</Localized>
      </span>
      <span className='text-[7px] font-bold uppercase tracking-wider text-slate-400 sm:text-[9px]'>
        <Localized>{side}</Localized>
      </span>
    </button>
  );
}

export function CapacityActionControls({
  onRespond,
  disabled = false,
  compact = false,
}: {
  onRespond: (action: CapacityAction) => void;
  disabled?: boolean;
  compact?: boolean;
}) {
  return (
    <div
      className={`grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center ${
        compact ? 'max-w-lg gap-2' : 'max-w-5xl gap-2 sm:gap-5'
      }`}
    >
      <PedalButton
        side='left'
        onRespond={onRespond}
        disabled={disabled}
        compact={compact}
      />
      <CapacityResponsePad
        onRespond={color => onRespond(color)}
        disabled={disabled}
        compact={compact}
      />
      <PedalButton
        side='right'
        onRespond={onRespond}
        disabled={disabled}
        compact={compact}
      />
    </div>
  );
}
