import { Localized, useTextTranslation } from './Localization';
import { useMemo, useState } from 'react';

export type HanoiTimedMove = {
  elapsedMs: number;
};

const chart = {
  width: 700,
  height: 250,
  left: 56,
  right: 24,
  top: 22,
  bottom: 38,
};

export function HanoiSpeedGraph({
  moves,
  compact = false,
}: {
  moves: HanoiTimedMove[];
  compact?: boolean;
}) {
  const t = useTextTranslation();

  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const points = useMemo(
    () =>
      moves.map((move, index) => ({
        elapsedMs: move.elapsedMs,
        speed: ((index + 1) * 60_000) / Math.max(1, move.elapsedMs),
      })),
    [moves],
  );

  if (points.length === 0) return null;

  const plotWidth = chart.width - chart.left - chart.right;
  const plotHeight = chart.height - chart.top - chart.bottom;
  const maxTime = Math.max(1, points.at(-1)?.elapsedMs ?? 1);
  const maxSpeed = Math.max(1, ...points.map(point => point.speed)) * 1.1;
  const xFor = (elapsedMs: number) =>
    chart.left + (elapsedMs / maxTime) * plotWidth;
  const yFor = (speed: number) =>
    chart.top + plotHeight - (speed / maxSpeed) * plotHeight;
  const linePoints = points
    .map(point => `${xFor(point.elapsedMs)},${yFor(point.speed)}`)
    .join(' ');
  const activePoint = hoveredIndex === null ? null : points[hoveredIndex];

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-white/10 bg-slate-950/70 ${
        compact ? 'p-2' : 'p-3 sm:p-5'
      }`}
    >
      <svg
        viewBox={`0 0 ${chart.width} ${chart.height}`}
        className='block w-full touch-none'
        role='img'
        aria-label={t('common.results.cumulativeMoveSpeedOverElapsedTime')}
        onPointerMove={event => {
          const bounds = event.currentTarget.getBoundingClientRect();
          const pointerX =
            ((event.clientX - bounds.left) / bounds.width) * chart.width;
          const targetTime = ((pointerX - chart.left) / plotWidth) * maxTime;
          let nearestIndex = 0;
          let nearestDistance = Number.POSITIVE_INFINITY;
          points.forEach((point, index) => {
            const distance = Math.abs(point.elapsedMs - targetTime);
            if (distance < nearestDistance) {
              nearestDistance = distance;
              nearestIndex = index;
            }
          });
          setHoveredIndex(nearestIndex);
        }}
        onPointerLeave={() => setHoveredIndex(null)}
      >
        <Localized>
          {[0, 0.5, 1].map(ratio => {
            const y = chart.top + plotHeight * ratio;
            return (
              <g key={ratio}>
                <line
                  x1={chart.left}
                  x2={chart.width - chart.right}
                  y1={y}
                  y2={y}
                  stroke='rgb(255 255 255 / 8%)'
                />
                <text
                  x={chart.left - 8}
                  y={y + 4}
                  textAnchor='end'
                  fill='#64748b'
                  fontSize='11'
                >
                  <Localized>{Math.round(maxSpeed * (1 - ratio))}</Localized>
                </text>
              </g>
            );
          })}
        </Localized>

        <polyline
          points={linePoints}
          fill='none'
          stroke='#67e8f9'
          strokeWidth='4'
          strokeLinecap='round'
          strokeLinejoin='round'
        />

        <Localized>
          {activePoint && hoveredIndex !== null && (
            <g>
              <line
                x1={xFor(activePoint.elapsedMs)}
                x2={xFor(activePoint.elapsedMs)}
                y1={chart.top}
                y2={chart.top + plotHeight}
                stroke='#f8fafc'
                strokeDasharray='5 5'
                opacity='0.55'
              />
              <circle
                cx={xFor(activePoint.elapsedMs)}
                cy={yFor(activePoint.speed)}
                r='7'
                fill='#67e8f9'
                stroke='#083344'
                strokeWidth='3'
              />
            </g>
          )}
        </Localized>

        <text
          x={chart.left + plotWidth / 2}
          y={chart.height - 8}
          textAnchor='middle'
          fill='#64748b'
          fontSize='12'
        >
          <Localized id='common.results.elapsedTime' />
        </text>
        <text
          x='15'
          y={chart.top + plotHeight / 2}
          textAnchor='middle'
          fill='#64748b'
          fontSize='12'
          transform={`rotate(-90 15 ${chart.top + plotHeight / 2})`}
        >
          <Localized id='common.actions.movesMin' />
        </text>
      </svg>

      <Localized>
        {activePoint && hoveredIndex !== null && (
          <div className='pointer-events-none absolute right-4 top-4 rounded-xl border border-cyan-300/20 bg-slate-900/95 px-3 py-2 text-xs shadow-xl'>
            <p className='font-semibold text-white'>
              <Localized id='common.actions.move' />{' '}
              <Localized>{hoveredIndex + 1}</Localized>
            </p>
            <p className='mt-1 font-mono text-cyan-300'>
              <Localized>{activePoint.speed.toFixed(1)}</Localized>{' '}
              <Localized id='common.results.movesMin' />
            </p>
            <p className='font-mono text-slate-400'>
              <Localized>
                {(activePoint.elapsedMs / 1_000).toFixed(1)}
              </Localized>
              <Localized>{' s'}</Localized>
            </p>
          </div>
        )}
      </Localized>
    </div>
  );
}
