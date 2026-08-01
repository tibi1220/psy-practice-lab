import { SevenSegmentDisplay } from "./SevenSegmentDisplay";

export type MemoryCellStatus = "neutral" | "flashed" | "selected";

const segmentColorClasses: Record<MemoryCellStatus, string> = {
  neutral: "text-slate-600",
  flashed: "text-violet-200",
  selected: "text-cyan-200",
};

export function MemoryCell({
  index,
  status,
  disabled,
  onSelect,
}: {
  index: number;
  status: MemoryCellStatus;
  disabled: boolean;
  onSelect: () => void;
}) {
  const illuminated = status !== "neutral";

  return (
    <div className="relative w-full" style={{ aspectRatio: "1 / 1" }}>
      <button
        type="button"
        disabled={disabled}
        aria-label={`Cell ${index + 1}`}
        aria-pressed={status === "selected"}
        onClick={onSelect}
        className={`absolute inset-0 h-full w-full overflow-hidden rounded-[18%] border border-white/10 bg-white/[0.035] p-[18%] disabled:cursor-default ${segmentColorClasses[status]} ${
          disabled
            ? ""
            : "cursor-pointer hover:border-cyan-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
        }`}
      >
        <span className="flex h-full items-center justify-center">
          <SevenSegmentDisplay illuminated={illuminated} />
        </span>
      </button>
    </div>
  );
}
