// Vorschläge in der Kopfleiste des Dokuments (Issue #191, Runde 3): ‹ › blättert durch die
// offenen Vorschläge wie durch die eigenen Stellen. Die Schalter je Art (OZ, Mengen, Beton,
// Entscheidung 0087) liegen im Menü „Vorschläge ▾“, damit sie in schmalen Bereichen nicht
// umbrechen.

import { useCallback, useRef, useState } from 'react';
import { DOC_TOOL as TOOL } from './PdfInput';
import { useDismiss } from '../common/useDismiss';
import { Popover } from '../ui/Popover';
import { LINK_SOURCES, SUGGEST_BORDER, type LinkSource } from '../../lib/docs/docSuggest';

const SOURCE_LABEL: Readonly<Record<LinkSource, string>> = {
  oz: 'OZ',
  menge: 'Mengen',
  beton: 'Beton',
};

type Anchor = { left: number; top: number };

const below = (element: HTMLElement): Anchor => {
  const box = element.getBoundingClientRect();
  return { left: box.left, top: box.bottom + 4 };
};

/**
 * Eine Art ohne offene Vorschläge (alle übernommen oder abgelehnt) fehlt im Menü. Blättern geht
 * nur durch eingeblendete Arten; `index` ist die Stelle des offenen Vorschlags, sonst `null`.
 */
export function SuggestNav({
  counts,
  suggest,
  setSuggest,
  index,
  total,
  onStep,
}: {
  counts: Readonly<Record<LinkSource, number>>;
  suggest: Readonly<Record<LinkSource, boolean>>;
  setSuggest: (source: LinkSource, on: boolean) => void;
  index: number | null;
  total: number;
  onStep: (step: 1 | -1, at: Anchor) => void;
}) {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLSpanElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const hide = useCallback(() => setOpen(false), []);
  useDismiss([anchorRef, popoverRef], open, hide);
  const step = (direction: 1 | -1, button: HTMLElement): void => {
    setOpen(false);
    onStep(direction, below(anchorRef.current ?? button));
  };
  return (
    <span
      ref={anchorRef}
      role="group"
      aria-label="Vorschläge"
      className="flex shrink-0 items-center gap-[2px]"
    >
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        title="Arten von Vorschlägen ein- und ausblenden"
        onClick={() => setOpen((current) => !current)}
        className={`${TOOL} gap-[4px] aria-expanded:border-accent aria-expanded:bg-accent-soft`}
      >
        Vorschläge ▾
      </button>
      <button
        type="button"
        aria-label="Voriger Vorschlag"
        title="Voriger Vorschlag, dann mit ← → weiter"
        disabled={total === 0}
        onClick={(event) => step(-1, event.currentTarget)}
        className={TOOL}
      >
        ‹
      </button>
      <span className="font-mono text-[11.5px] whitespace-nowrap text-mute">
        {index === null ? '–' : index + 1} / {total}
      </span>
      <button
        type="button"
        aria-label="Nächster Vorschlag"
        title="Nächster Vorschlag, dann mit ← → weiter"
        disabled={total === 0}
        onClick={(event) => step(1, event.currentTarget)}
        className={TOOL}
      >
        ›
      </button>
      <Popover ref={popoverRef} open={open} width={180} align="right" anchorRef={anchorRef}>
        <div
          role="dialog"
          aria-label="Arten von Vorschlägen"
          className="flex flex-col gap-[4px] p-[4px]"
        >
          {LINK_SOURCES.filter((source) => counts[source] > 0).map((source) => (
            <button
              key={source}
              type="button"
              aria-pressed={suggest[source]}
              title={
                suggest[source]
                  ? `${SOURCE_LABEL[source]}-Vorschläge ausblenden`
                  : `${SOURCE_LABEL[source]}-Vorschläge zeigen`
              }
              onClick={() => setSuggest(source, !suggest[source])}
              className={`${TOOL} justify-start gap-[6px] ${
                suggest[source] ? '' : 'text-mute line-through decoration-line2'
              }`}
            >
              <span
                aria-hidden="true"
                className={`w-[10px] border-b-2 border-dashed ${SUGGEST_BORDER[source]}`}
              />
              {SOURCE_LABEL[source]} {counts[source]}
            </button>
          ))}
        </div>
      </Popover>
    </span>
  );
}
