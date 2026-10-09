import { Localized } from './Localization';
const segmentPositions: Record<string, string> = {
  a: 'left-[18%] right-[18%] top-0 h-[9%]',
  b: 'right-0 top-[9%] h-[37%] w-[10%]',
  c: 'bottom-[9%] right-0 h-[37%] w-[10%]',
  d: 'bottom-0 left-[18%] right-[18%] h-[9%]',
  e: 'bottom-[9%] left-0 h-[37%] w-[10%]',
  f: 'left-0 top-[9%] h-[37%] w-[10%]',
  g: 'left-[18%] right-[18%] top-[45.5%] h-[9%]',
};

export function SevenSegmentDisplay({
  illuminated,
  className = '',
}: {
  illuminated: boolean;
  className?: string;
}) {
  return (
    <span
      aria-hidden='true'
      className={`relative block aspect-[0.58] h-full ${className}`}
    >
      <Localized>
        {Object.entries(segmentPositions).map(([segment, position]) => (
          <span
            key={segment}
            className={`absolute rounded-full bg-current ${position} ${
              illuminated
                ? 'opacity-100 shadow-[0_0_8px_currentColor]'
                : 'opacity-20'
            }`}
          />
        ))}
      </Localized>
    </span>
  );
}
