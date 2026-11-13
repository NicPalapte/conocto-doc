// Kennzeichen „LV2" an einer Position, wenn mehrere LVs offen sind (Entscheidung 0110).
// Bei nur einem LV trägt keine Position eine Kennung — dann zeigt es nichts.

export function LvBadge({ lv, className = '' }: { lv: string | undefined; className?: string }) {
  if (lv === undefined) return null;
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-[var(--r-pill)] border border-line bg-surface px-[5px] font-mono text-[10.5px] leading-[16px] text-dim ${className}`}
    >
      {lv}
    </span>
  );
}
