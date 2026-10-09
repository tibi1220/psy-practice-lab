import { useMemo, useRef, useState } from "react";
import type { PointerEvent } from "react";
import { motionPlacements } from "../lib/motion-planning";
import type { MotionMove, MotionPuzzle, MotionState, Position } from "../lib/motion-planning";

export function MotionBoard({ puzzle, state, move, path = [] }: { puzzle: MotionPuzzle; state: MotionState; move?: (move: MotionMove) => void; path?: Position[] }) {
  const [selected, setSelected] = useState<number | null>(null);
  const [preview, setPreview] = useState<Position | null>(null);
  const svg = useRef<SVGSVGElement>(null);
  const drag = useRef<{ piece: number; offset: Position; pointer: number } | null>(null);
  const placements = useMemo(() => selected === null ? new Map<string, Position[]>() : motionPlacements(puzzle, state, selected), [puzzle, state, selected]);
  const point = (event: PointerEvent) => {
    const bounds = svg.current!.getBoundingClientRect();
    return { x: (event.clientX - bounds.left) / bounds.width * puzzle.columns, y: (event.clientY - bounds.top) / bounds.height * puzzle.rows };
  };
  const commit = (piece: number, to: Position) => {
    setSelected(null); setPreview(null); move?.({ piece, to });
  };
  const displayedPath = preview ? placements.get(`${preview.x},${preview.y}`) ?? [] : path;
  return <div className="mx-auto w-full" style={{ maxWidth: `min(28rem, ${45 * puzzle.columns / puzzle.rows}dvh)` }}>
    <svg ref={svg} viewBox={`0 0 ${puzzle.columns * 70} ${puzzle.rows * 70}`} className={`w-full rounded-2xl border border-white/15 bg-slate-900 ${move ? "touch-none select-none" : ""}`} role="group" aria-label="Planning puzzle grid"
      onPointerMove={event => {
        if (!drag.current || drag.current.pointer !== event.pointerId) return;
        const p = point(event), to = { x: Math.floor(p.x - drag.current.offset.x + 0.5), y: Math.floor(p.y - drag.current.offset.y + 0.5) };
        const legal = motionPlacements(puzzle, state, drag.current.piece);
        setPreview(legal.has(`${to.x},${to.y}`) ? to : null);
      }}
      onPointerUp={event => {
        const current = drag.current;
        if (!current || current.pointer !== event.pointerId) return;
        const p = point(event), to = { x: Math.floor(p.x - current.offset.x + 0.5), y: Math.floor(p.y - current.offset.y + 0.5) };
        drag.current = null;
        if (svg.current?.hasPointerCapture(event.pointerId)) svg.current.releasePointerCapture(event.pointerId);
        if (motionPlacements(puzzle, state, current.piece).has(`${to.x},${to.y}`) && (to.x !== state[current.piece].x || to.y !== state[current.piece].y)) commit(current.piece, to);
        else setPreview(null);
      }}
      onPointerCancel={() => { drag.current = null; setPreview(null); }}>
      {Array.from({ length: puzzle.columns * puzzle.rows }, (_, index) => {
        const x = index % puzzle.columns, y = Math.floor(index / puzzle.columns);
        return <rect key={index} x={x * 70 + 1} y={y * 70 + 1} width={68} height={68} rx={4} fill="#1e293b" stroke="#475569" strokeOpacity={0.35} />;
      })}
      <circle cx={(puzzle.target.x + 0.5) * 70} cy={(puzzle.target.y + 0.5) * 70} r={27} fill="#020617" stroke="#e2e8f0" strokeWidth={2}><title>Black target: row {puzzle.target.y + 1}, column {puzzle.target.x + 1}</title></circle>
      {puzzle.walls.map((wall, index) => <g key={index} role="img" aria-label={`Fixed obstacle at row ${wall.y + 1}, column ${wall.x + 1}, ${wall.width} by ${wall.height} cells`}>
        <rect x={wall.x * 70 + 5} y={wall.y * 70 + 5} width={wall.width * 70 - 10} height={wall.height * 70 - 10} rx={6} fill="#64748b" />
        <path d={`M ${wall.x * 70 + 12} ${wall.y * 70 + 12} L ${(wall.x + wall.width) * 70 - 12} ${(wall.y + wall.height) * 70 - 12} M ${(wall.x + wall.width) * 70 - 12} ${wall.y * 70 + 12} L ${wall.x * 70 + 12} ${(wall.y + wall.height) * 70 - 12}`} stroke="#334155" strokeWidth={4} />
        {[[0, 0], [1, 0], [0, 1], [1, 1]].map(([x, y], bolt) => <circle key={bolt} cx={wall.x * 70 + 12 + x * (wall.width * 70 - 24)} cy={wall.y * 70 + 12 + y * (wall.height * 70 - 24)} r={4} fill="#0f172a" />)}
      </g>)}
      {puzzle.pieces.map((piece, index) => {
        const p = state[index];
        const label = `${piece.name}, row ${p.y + 1}, column ${p.x + 1}${index ? `, ${piece.width} by ${piece.height} cells` : ""}`;
        const choose = () => { setPreview(null); setSelected(selected === index ? null : index); };
        return <g key={index} role={move ? "button" : "img"} aria-label={label} aria-pressed={move ? selected === index : undefined} tabIndex={move ? 0 : undefined} className={move ? "cursor-grab focus:outline-none" : ""}
          onClick={event => { if (move && event.detail === 0) choose(); }}
          onKeyDown={event => { if (move && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); choose(); } if (event.key === "Escape") { setSelected(null); setPreview(null); } }}
          onPointerDown={event => {
            if (!move || event.button !== 0) return;
            event.preventDefault(); setSelected(index); setPreview(null);
            const cursor = point(event);
            drag.current = { piece: index, offset: { x: cursor.x - p.x, y: cursor.y - p.y }, pointer: event.pointerId };
            svg.current?.setPointerCapture(event.pointerId);
          }}>
          {index === 0 ? <circle cx={(p.x + 0.5) * 70} cy={(p.y + 0.5) * 70} r={23} fill={piece.color} stroke={selected === index ? "#fff" : "#be123c"} strokeWidth={selected === index ? 4 : 2} /> : <rect x={p.x * 70 + 7} y={p.y * 70 + 7} width={piece.width * 70 - 14} height={piece.height * 70 - 14} rx={10} fill={piece.color} stroke={selected === index ? "#fff" : "#0f172a"} strokeWidth={selected === index ? 4 : 2} />}
          {index > 0 && <text x={(p.x + piece.width / 2) * 70} y={(p.y + piece.height / 2) * 70 + 5} textAnchor="middle" fill="#0f172a" fontSize={18} fontWeight="bold" pointerEvents="none">{index}</text>}
        </g>;
      })}
      <circle cx={(puzzle.target.x + 0.5) * 70} cy={(puzzle.target.y + 0.5) * 70} r={27} fill="none" stroke="#020617" strokeWidth={5} pointerEvents="none" />
      <circle cx={(puzzle.target.x + 0.5) * 70} cy={(puzzle.target.y + 0.5) * 70} r={30} fill="none" stroke="#e2e8f0" strokeWidth={1} pointerEvents="none" />
      {displayedPath.length > 1 && <polyline points={displayedPath.map(p => `${(p.x + 0.5) * 70},${(p.y + 0.5) * 70}`).join(" ")} fill="none" stroke="#fbbf24" strokeWidth={4} strokeDasharray="6 6" pointerEvents="none" />}
      {move && selected !== null && [...placements.values()].filter(route => route.length > 1).map(route => {
        const to = route[route.length - 1];
        const choose = () => commit(selected, to);
        return <g key={`${to.x},${to.y}`} role="button" tabIndex={0} aria-label={`Move ${puzzle.pieces[selected].name} to row ${to.y + 1}, column ${to.x + 1}`} className="cursor-pointer focus:outline-none" onClick={choose} onKeyDown={event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); choose(); } }}>
          <rect x={to.x * 70 + 2} y={to.y * 70 + 2} width={66} height={66} rx={5} fill="#6ee7b7" fillOpacity={0.08} stroke="#6ee7b7" strokeDasharray="4 4" />
          <circle cx={(to.x + 0.5) * 70} cy={(to.y + 0.5) * 70} r={7} fill="#6ee7b7" />
        </g>;
      })}
      {preview && selected !== null && <rect x={preview.x * 70 + 5} y={preview.y * 70 + 5} width={puzzle.pieces[selected].width * 70 - 10} height={puzzle.pieces[selected].height * 70 - 10} rx={8} fill={puzzle.pieces[selected].color} fillOpacity={0.4} stroke="#fff" strokeWidth={3} pointerEvents="none" />}
    </svg>
    {move && <p role="status" className="mt-3 min-h-10 text-center text-sm text-slate-400">{selected === null ? "Drag a piece, or select it and tap a highlighted destination." : `${puzzle.pieces[selected].name} selected. Highlighted cells mark reachable top-left positions. Escape cancels selection.`}</p>}
  </div>;
}
