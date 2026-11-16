// Marke am Seitenrand für Stellen mit eigener Notiz (Entscheidung 0111), neben der Marke der
// Verknüpfungen (`LinkBadge`). Zeigt die Zahl der Notizen im Bündel; ein Tipp öffnet die
// Notizen der ersten Stelle mit Notiz.

import type { DocMark, DocSpot } from '../../lib/docs/docNotes';

// Das Blatt ist immer weiß (wie gedruckt): neutral, damit der Akzent der Auswahl bleibt.
const CHIP =
  'inline-flex cursor-pointer items-center gap-[3px] rounded-[6px] border border-line2 bg-surface px-[5px] py-[1px] font-mono text-[10.5px] text-ink shadow-[var(--shadow-sm)] hover:bg-sunken [@media(pointer:coarse)]:px-[8px] [@media(pointer:coarse)]:py-[5px]';

export function NoteBadge({
  marks,
  onOpen,
}: {
  marks: readonly DocMark[];
  onOpen: (spot: DocSpot, box: DOMRect) => void;
}) {
  const withNotes = marks.filter((mark) => (mark.comments ?? []).length > 0);
  const first = withNotes[0];
  if (first === undefined) return null;
  const count = withNotes.reduce((sum, mark) => sum + (mark.comments?.length ?? 0), 0);
  return (
    <button
      type="button"
      aria-label={count === 1 ? '1 Notiz' : `${count} Notizen`}
      title="Notiz öffnen"
      onClick={(event) => onOpen(first, event.currentTarget.getBoundingClientRect())}
      className={CHIP}
    >
      <span aria-hidden="true">✎</span>
      {count}
    </button>
  );
}
