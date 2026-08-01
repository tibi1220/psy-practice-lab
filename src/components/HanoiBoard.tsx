import type { DragEvent, KeyboardEvent, MouseEvent } from "react";

const pegLabels = ["Left", "Middle", "Right"] as const;

export function createHanoiPegs(height: number): number[][] {
  return [
    Array.from({ length: height }, (_, index) => height - index),
    [],
    [],
  ];
}

export function HanoiBoard({
  pegs,
  diskCount,
  selectedPeg = null,
  invalidPeg = null,
  onSelectSource,
  onDestination,
  onMove,
  compact = false,
}: {
  pegs: number[][];
  diskCount: number;
  selectedPeg?: number | null;
  invalidPeg?: number | null;
  onSelectSource?: (pegIndex: number) => void;
  onDestination?: (pegIndex: number) => void;
  onMove?: (sourcePeg: number, destinationPeg: number) => void;
  compact?: boolean;
}) {
  const diskHeight = compact
    ? "1rem"
    : `clamp(1.15rem, ${Math.min(5, 32 / diskCount)}vh, 2.5rem)`;

  const selectDisk = (event: MouseEvent, pegIndex: number) => {
    event.stopPropagation();
    if (selectedPeg !== null && selectedPeg !== pegIndex) {
      onDestination?.(pegIndex);
    } else {
      onSelectSource?.(pegIndex);
    }
  };

  const dropDisk = (event: DragEvent, destinationPeg: number) => {
    event.preventDefault();
    const sourceValue =
      event.dataTransfer.getData("application/x-hanoi-peg") ||
      event.dataTransfer.getData("text/plain");
    const sourcePeg = Number(sourceValue);
    if (Number.isInteger(sourcePeg)) onMove?.(sourcePeg, destinationPeg);
  };

  const handlePegKeyDown = (
    event: KeyboardEvent<HTMLDivElement>,
    pegIndex: number,
  ) => {
    if (selectedPeg === null || (event.key !== "Enter" && event.key !== " ")) {
      return;
    }
    event.preventDefault();
    onDestination?.(pegIndex);
  };

  return (
    <div
      className={`grid w-full grid-cols-3 gap-2 rounded-[2rem] border border-white/10 bg-slate-950/80 p-3 shadow-2xl sm:gap-4 sm:p-5 ${
        compact ? "h-52 max-w-xl" : "h-full min-h-72 max-h-[65dvh] max-w-6xl"
      }`}
      aria-label={`Tower of Hanoi board with ${diskCount} disks`}
    >
      {pegs.map((peg, pegIndex) => {
        const topDisk = peg.at(-1);
        const selected = selectedPeg === pegIndex;
        const invalid = invalidPeg === pegIndex;

        return (
          <div
            key={pegLabels[pegIndex]}
            role="button"
            tabIndex={selectedPeg === null ? -1 : 0}
            aria-label={`${pegLabels[pegIndex]} peg, ${peg.length} disks${selected ? ", selected source" : ""}`}
            onClick={() => {
              if (selectedPeg !== null) onDestination?.(pegIndex);
            }}
            onKeyDown={(event) => handlePegKeyDown(event, pegIndex)}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => dropDisk(event, pegIndex)}
            className={`relative flex min-w-0 cursor-pointer flex-col-reverse items-center rounded-2xl border px-1 pb-4 pt-5 outline-none transition sm:px-3 ${
              selected
                ? "border-cyan-300/70 bg-cyan-300/10"
                : invalid
                  ? "animate-[pulse_300ms_ease-in-out_2] border-rose-400/80 bg-rose-400/10"
                  : "border-white/5 bg-white/[0.025] hover:bg-white/[0.05]"
            } focus-visible:border-cyan-300`}
          >
            <span
              aria-hidden="true"
              className="pointer-events-none absolute bottom-3 left-1/2 top-8 w-2 -translate-x-1/2 rounded-t-full bg-slate-600 shadow-lg sm:w-3"
            />
            <span
              aria-hidden="true"
              className="pointer-events-none absolute bottom-2 left-[5%] right-[5%] h-3 rounded-full bg-slate-600 shadow-lg"
            />

            {peg.map((disk) => {
              const isTop = disk === topDisk;
              const hue = 185 + (disk / Math.max(1, diskCount)) * 115;
              return (
                <button
                  key={disk}
                  type="button"
                  draggable={isTop && !!onMove}
                  disabled={!isTop || !onSelectSource}
                  aria-label={`Disk ${disk}${isTop ? ", movable" : ""}`}
                  onClick={(event) => selectDisk(event, pegIndex)}
                  onDragStart={(event) => {
                    event.dataTransfer.effectAllowed = "move";
                    event.dataTransfer.setData(
                      "application/x-hanoi-peg",
                      String(pegIndex),
                    );
                    event.dataTransfer.setData("text/plain", String(pegIndex));
                    onSelectSource?.(pegIndex);
                  }}
                  className={`relative z-10 shrink-0 rounded-lg border border-white/25 shadow-[0_5px_12px_rgb(2_6_23/45%)] outline-none transition-transform ${
                    isTop && onSelectSource
                      ? "cursor-grab hover:-translate-y-0.5 active:cursor-grabbing active:translate-y-0.5"
                      : "cursor-default"
                  } ${selected && isTop ? "-translate-y-1 ring-2 ring-cyan-200" : ""}`}
                  style={{
                    width: `${24 + (disk / Math.max(1, diskCount)) * 70}%`,
                    height: diskHeight,
                    background: `linear-gradient(180deg, hsl(${hue} 85% 70%), hsl(${hue} 72% 48%))`,
                    touchAction: "manipulation",
                  }}
                >
                  <span className="sr-only">Move disk {disk}</span>
                </button>
              );
            })}

            <span className="pointer-events-none absolute left-1/2 top-2 z-20 -translate-x-1/2 text-[9px] font-bold uppercase tracking-widest text-slate-500 sm:text-xs">
              {pegLabels[pegIndex]}
            </span>
          </div>
        );
      })}
    </div>
  );
}
