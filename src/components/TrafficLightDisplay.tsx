export function TrafficLightDisplay({
  active,
  compact = false,
}: {
  active: boolean;
  compact?: boolean;
}) {
  const lightSize = compact ? "h-7 w-7" : "h-8 w-8 sm:h-12 sm:w-12";

  return (
    <div
      className={`rounded-full bg-slate-950/95 shadow-2xl ring-2 ring-white/15 backdrop-blur ${
        compact ? "p-1.5" : "p-2 sm:p-2.5"
      }`}
    >
      <div
        className={`${lightSize} rounded-full ${
          active
            ? "bg-rose-500 shadow-[0_0_26px_rgba(244,63,94,0.95)]"
            : "bg-rose-950"
        }`}
      />
      <div
        className={`${lightSize} rounded-full ${compact ? "mt-1.5" : "mt-2 sm:mt-2.5"} ${
          active
            ? "bg-emerald-950"
            : "bg-emerald-400 shadow-[0_0_26px_rgba(52,211,153,0.85)]"
        }`}
      />
    </div>
  );
}
