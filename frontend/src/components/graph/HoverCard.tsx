// Kleine Karte zur Position unter der Maus (Issue #191): OZ, Kurztext, Menge und Einheit.
// Nur Anzeige, nimmt keine Klicks an — Auswahl und Rechtsklick bleiben bei der Blase.

import { formatNumber } from '../../lib/format';

/** Art der Position als kurzes Etikett; Normalpositionen ohne. */
const TYPE_TAG: Record<string, string> = {
  ALTERNATIV: 'Wahl',
  BEDARF: 'Bedarf',
  ZULAGENPOSITION: 'Zulage',
};

export interface HoverCardPosition {
  readonly oz: string;
  readonly shortText: string;
  readonly quantity: number | null;
  readonly unit: string | null;
  readonly positionType: string;
}

export function HoverCard({
  position,
  left,
  top,
}: {
  position: HoverCardPosition;
  left: number;
  top: number;
}) {
  const tag = TYPE_TAG[position.positionType];
  return (
    <div
      role="tooltip"
      aria-label={`Position ${position.oz}`}
      className="pointer-events-none absolute z-[11] w-[240px] rounded-[var(--r-md)] border border-line bg-surface px-[10px] py-[8px] shadow-[var(--shadow-popover)]"
      style={{ left, top }}
    >
      <div className="flex items-center gap-[6px]">
        <span className="font-mono text-[11px] text-mute">{position.oz}</span>
        {tag !== undefined && (
          <span className="rounded-[var(--r-pill)] border border-line px-[6px] text-[10.5px] text-mute">
            {tag}
          </span>
        )}
      </div>
      <div className="mt-[2px] line-clamp-3 text-[12.5px] leading-[1.35] text-ink">
        {position.shortText}
      </div>
      <div className="mt-[4px] font-display text-[15px] font-semibold text-ink">
        {position.quantity === null ? (
          <span className="text-mute">ohne Menge</span>
        ) : (
          `${formatNumber(position.quantity)} ${position.unit ?? ''}`.trim()
        )}
      </div>
    </div>
  );
}
