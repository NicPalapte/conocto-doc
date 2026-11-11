// Leiste zu einem Vorschlag im Begleitdokument (Entscheidung 0080): welche Position
// passt und warum (OZ, Menge, Betonsorte 0106, gemeinsame Wörter mit dem Kurztext), dazu
// „Verknüpfen“, „Nein“ und „Position zeigen“. Erst der Klick legt die Verknüpfung an;
// „Nein“ merkt sich die Ablehnung in den Notizen.

import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useHostWindow } from '../common/hostWindow';
import { keyIsTaken } from '../common/keys';
import type { DocSuggestion } from '../../lib/docs/docSuggest';

const WIDTH = 290;
/** Grobe Höhe, damit die Leiste unten am Fenster nicht abgeschnitten wird. */
const HEIGHT = 180;

const STEP =
  'h-[22px] w-[22px] cursor-pointer rounded-[var(--r-sm)] border border-line bg-surface text-[12px] text-ink hover:border-line2';

const BUTTON =
  'h-[30px] cursor-pointer rounded-[var(--r-sm)] px-[12px] font-mono text-[12px] [@media(pointer:coarse)]:h-[40px] [@media(pointer:coarse)]:text-[14px]';

export function SuggestBar({
  suggestion,
  oz,
  shortText,
  left,
  top,
  onLink,
  onReject,
  onShow,
  onShowAll,
  onClose,
  place = null,
  onStep,
}: {
  suggestion: DocSuggestion;
  oz: string;
  shortText: string;
  left: number;
  top: number;
  onLink: () => void;
  onReject: () => void;
  /** Wählt die Position und zeigt sie; die Leiste bleibt offen zum Entscheiden. */
  onShow: () => void;
  /** Nur bei Beton: filtert nach der Sorte, also alle Positionen mit ihr. */
  onShowAll?: () => void;
  onClose: () => void;
  /** Stelle in der Liste der offenen Vorschläge (Issue #191); `null` = nicht darin. */
  place?: { index: number; total: number } | null;
  /** Voriger / nächster Vorschlag; auch mit ← und →. */
  onStep?: (step: 1 | -1) => void;
}) {
  const host = useHostWindow();
  const ref = useRef<HTMLDivElement>(null);
  // Neue Funktion je Render beim Aufrufer: über Ref, damit der Listener nicht ständig wechselt.
  const stepRef = useRef(onStep);
  useEffect(() => {
    stepRef.current = onStep;
  });
  useEffect(() => {
    const onDown = (event: MouseEvent): void => {
      if (!(ref.current?.contains(event.target as Node) ?? false)) onClose();
    };
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') onClose();
      const step = stepRef.current;
      if (step === undefined || keyIsTaken(event, 'arrows')) return;
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      const direction = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
      if (direction === 0) return;
      // Sonst blättert der Pfeil zusätzlich das PDF zur Seite.
      event.preventDefault();
      step(direction);
    };
    host.document.addEventListener('mousedown', onDown);
    host.document.addEventListener('keydown', onKey);
    return () => {
      host.document.removeEventListener('mousedown', onDown);
      host.document.removeEventListener('keydown', onKey);
    };
  }, [host, onClose]);

  const { amount, sorte } = suggestion;
  const label =
    suggestion.source === 'oz'
      ? 'OZ im Text'
      : suggestion.source === 'menge'
        ? 'Menge passt zu'
        : 'Betonsorte passt zu';
  return createPortal(
    <div
      ref={ref}
      role="dialog"
      aria-label="Vorschlag verknüpfen"
      data-nonmodal=""
      className="ov-window fixed z-[70] flex flex-col gap-[8px] p-[10px]"
      style={{
        left: Math.max(8, Math.min(left, host.innerWidth - WIDTH - 8)),
        top: Math.min(top, host.innerHeight - HEIGHT),
        width: WIDTH,
      }}
    >
      <span className="flex items-center gap-[4px] font-mono text-[11px] text-mute">
        <span className="flex-1">{label}</span>
        {onStep !== undefined && place !== null && place.total > 1 && (
          <>
            <button
              type="button"
              aria-label="Voriger Vorschlag"
              title="Voriger Vorschlag (←)"
              onClick={() => onStep(-1)}
              className={STEP}
            >
              ‹
            </button>
            <span>
              {place.index + 1} / {place.total}
            </span>
            <button
              type="button"
              aria-label="Nächster Vorschlag"
              title="Nächster Vorschlag (→)"
              onClick={() => onStep(1)}
              className={STEP}
            >
              ›
            </button>
          </>
        )}
      </span>
      {sorte !== undefined && (
        <span className="font-mono text-[11.5px] text-ink">
          {sorte.key}
          {sorte.matches > 1 && (
            <span className="text-mute"> · {sorte.matches} Positionen im LV</span>
          )}
        </span>
      )}
      {sorte?.pdf !== undefined && (
        <span className="font-mono text-[11.5px] text-mute">Im PDF nur: {sorte.pdf}</span>
      )}
      <span className="min-w-0 font-sans text-[13px] text-ink">
        <span className="font-mono font-semibold">{oz}</span>
        {shortText !== '' && <span className="block truncate">{shortText}</span>}
      </span>
      {suggestion.words !== undefined && (
        <span className="truncate font-mono text-[11.5px] text-mute">
          {sorte !== undefined ? 'Grenzt ein: ' : 'Auch im Kurztext: '}
          {suggestion.words.join(', ')}
        </span>
      )}
      {amount !== undefined && (
        <span className={`font-mono text-[11.5px] ${amount.same ? 'text-mute' : 'text-amber'}`}>
          PDF {amount.pdf} · LV {amount.lv ?? '-'}
        </span>
      )}
      <span className="flex flex-wrap items-center gap-[6px]">
        <button
          type="button"
          onClick={onLink}
          className={`${BUTTON} border-none bg-accent-fill font-semibold text-white hover:bg-accent-fill-hover`}
        >
          Verknüpfen
        </button>
        <button
          type="button"
          onClick={onReject}
          title="Diesen Vorschlag nicht mehr zeigen"
          className={`${BUTTON} border border-line bg-surface text-ink hover:border-line2`}
        >
          Nein
        </button>
        {sorte !== undefined && sorte.matches > 1 && onShowAll !== undefined && (
          <button
            type="button"
            onClick={onShowAll}
            title="Nach dieser Sorte filtern"
            className={`${BUTTON} border border-line bg-surface text-ink hover:border-line2`}
          >
            Alle {sorte.matches}
          </button>
        )}
        <span className="flex-1" />
        <button
          type="button"
          onClick={onShow}
          title="Position in Graph und Positionskarte zeigen"
          className={`${BUTTON} border-none bg-transparent px-[6px] text-accent-ink hover:underline`}
        >
          Position zeigen ›
        </button>
      </span>
    </div>,
    host.document.body,
  );
}
