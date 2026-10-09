import { useTextTranslation } from './Localization';
import type { CSSProperties } from 'react';

export type StimulusType = {
  id: string;
  label: string;
  shortLabel: string;
  kind: 'corner' | 'side';
  markerStyle: CSSProperties;
};

export const stimulusTypes: StimulusType[] = [
  {
    id: 'corner-upper-left',
    label: 'Upper left corner',
    shortLabel: 'Upper left',
    kind: 'corner',
    markerStyle: { left: '-30%', top: '-10%', transform: 'rotate(135deg)' },
  },
  {
    id: 'corner-upper-right',
    label: 'Upper right corner',
    shortLabel: 'Upper right',
    kind: 'corner',
    markerStyle: { right: '-30%', top: '-10%', transform: 'rotate(225deg)' },
  },
  {
    id: 'corner-bottom-right',
    label: 'Bottom right corner',
    shortLabel: 'Bottom right',
    kind: 'corner',
    markerStyle: {
      right: '-30%',
      bottom: '-10%',
      transform: 'rotate(315deg)',
    },
  },
  {
    id: 'corner-bottom-left',
    label: 'Bottom left corner',
    shortLabel: 'Bottom left',
    kind: 'corner',
    markerStyle: { left: '-30%', bottom: '-10%', transform: 'rotate(45deg)' },
  },
  {
    id: 'side-top',
    label: 'Top side',
    shortLabel: 'Top',
    kind: 'side',
    markerStyle: {
      top: 0,
      width: '100%',
      height: '24%',
      borderRadius: '0 0 999px 999px',
    },
  },
  {
    id: 'side-right',
    label: 'Right side',
    shortLabel: 'Right',
    kind: 'side',
    markerStyle: {
      right: 0,
      width: '24%',
      height: '100%',
      borderRadius: '999px 0 0 999px',
    },
  },
  {
    id: 'side-bottom',
    label: 'Bottom side',
    shortLabel: 'Bottom',
    kind: 'side',
    markerStyle: {
      bottom: 0,
      width: '100%',
      height: '24%',
      borderRadius: '999px 999px 0 0',
    },
  },
  {
    id: 'side-left',
    label: 'Left side',
    shortLabel: 'Left',
    kind: 'side',
    markerStyle: {
      left: 0,
      width: '24%',
      height: '100%',
      borderRadius: '0 999px 999px 0',
    },
  },
];

export function getStimulus(typeId: string) {
  return (
    stimulusTypes.find(stimulus => stimulus.id === typeId) ?? stimulusTypes[0]
  );
}

export function createMonotonySequence(itemCount: number) {
  const sequence = Array.from(
    { length: itemCount },
    (_, index) => stimulusTypes[index % stimulusTypes.length].id,
  );

  for (let index = sequence.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [sequence[index], sequence[randomIndex]] = [
      sequence[randomIndex],
      sequence[index],
    ];
  }

  return sequence;
}

export function StimulusSquare({
  type,
  compact = false,
  mini = false,
  printable = false,
  borderWidth,
  cornerRadius,
}: {
  type: StimulusType;
  compact?: boolean;
  mini?: boolean;
  printable?: boolean;
  borderWidth?: CSSProperties['borderWidth'];
  cornerRadius?: CSSProperties['borderRadius'];
}) {
  const t = useTextTranslation();

  const cornerShape =
    type.kind === 'corner'
      ? {
          width: '88%',
          height: '44%',
          borderRadius: '999px 999px 0 0',
        }
      : {};

  return (
    <div
      className={`relative aspect-square overflow-hidden rounded-[12%] border-2 ${
        printable
          ? 'w-full border-black bg-white shadow-none'
          : `border-slate-500 bg-slate-100 shadow-2xl ${
              mini ? 'w-11 sm:w-12' : compact ? 'w-16 sm:w-20' : 'w-full'
            }`
      }`}
      aria-label={t('common.accessibility.labelHighlighted', {
        label: type.label,
      })}
      style={{ borderWidth, borderRadius: cornerRadius }}
    >
      <span
        aria-hidden='true'
        className={`absolute ${
          printable
            ? 'bg-black shadow-none'
            : 'bg-amber-400 shadow-[0_0_18px_rgba(251,191,36,0.45)]'
        }`}
        style={{ ...cornerShape, ...type.markerStyle }}
      />
    </div>
  );
}
