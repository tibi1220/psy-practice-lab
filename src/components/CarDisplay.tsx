import { Localized } from './Localization';
export const carGeometry = {
  bodyRadius: 0.2,
  windowX: 0.18,
  windowY: 0.18,
  windowWidth: 0.64,
  windowHeight: 0.25,
  windowRadius: 0.08,
  lightWidth: 0.18,
} as const;

export function CarDisplay({
  color,
  player = false,
  className = '',
}: {
  color: string;
  player?: boolean;
  className?: string;
}) {
  return (
    <svg
      viewBox='0 0 60 98'
      aria-hidden='true'
      className={className}
      style={{
        filter: player
          ? 'drop-shadow(0 0 8px rgb(34 211 238 / 65%))'
          : undefined,
      }}
    >
      <rect
        x='2'
        y='0'
        width='56'
        height='98'
        rx='12'
        fill={color}
      />
      <rect
        x={2 + 56 * carGeometry.windowX}
        y={98 * carGeometry.windowY}
        width={56 * carGeometry.windowWidth}
        height={98 * carGeometry.windowHeight}
        rx={56 * carGeometry.windowRadius}
        fill={player ? '#164e63' : '#0f172acc'}
      />
      <rect
        x='9'
        y='8'
        width='10'
        height='3'
        rx='1.5'
        fill='#ffffffb8'
      />
      <rect
        x='41'
        y='8'
        width='10'
        height='3'
        rx='1.5'
        fill='#ffffffb8'
      />
      <Localized>
        {[22, 68].map(y => (
          <g
            key={y}
            fill='#0f172a'
          >
            <rect
              x='0'
              y={y}
              width='5'
              height='18'
              rx='2'
            />
            <rect
              x='55'
              y={y}
              width='5'
              height='18'
              rx='2'
            />
          </g>
        ))}
      </Localized>
    </svg>
  );
}
