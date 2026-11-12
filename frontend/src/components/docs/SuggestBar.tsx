// Leiste zu einem Vorschlag im Begleitdokument (Entscheidung 0080): welche Position
// passt und warum (OZ, Menge, Betonsorte 0106, gemeinsame Wörter mit dem Kurztext), dazu
// „Verknüpfen“, „Nein“ und „Position zeigen“. Erst der Klick legt die Verknüpfung an;
// „Nein“ merkt sich die Ablehnung in den Notizen.

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useHostWindow } from '../common/hostWindow';
import { keyIsTaken } from '../common/keys';
import { suggestionKey, type DocSuggestion } from '../../lib/docs/docSuggest';
import { placeNextTo, SUGGEST_GAP as GAP, type Box } from '../../lib/docs/suggestPlace';

const WIDTH = 290;
/** Grobe Höhe, solange die Leiste noch nicht gemessen ist. */
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
  bounds = null,
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
  /** PDF-Ansicht: die Leiste bleibt in ihr, auch wenn die Stelle hinausscrollt. */
  bounds?: HTMLElement | null;
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

  // An der Stelle hängen: je Bild nachsehen, wo sie gerade ist (Blättern, Scrollen, Zoom).
  const key = suggestionKey(suggestion);
  const [spot, setSpot] = useState<Box>({ left, top: top - GAP, right: left, bottom: top - GAP });
  const [height, setHeight] = useState(HEIGHT);
  const [view, setView] = useState<Box | null>(null);
  useEffect(() => {
    let frame = 0;
    const follow = (): void => {
      const anchor = [...host.document.querySelectorAll<HTMLElement>('[data-suggest]')].find(
        (element) => element.dataset.suggest === key,
      );
      if (anchor !== undefined) {
        const rect = anchor.getBoundingClientRect();
        setSpot((prev) =>
          prev.left === rect.left &&
          prev.top === rect.top &&
          prev.right === rect.right &&
          prev.bottom === rect.bottom
            ? prev
            : { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom },
        );
      }
      const area = bounds?.getBoundingClientRect();
      setView((prev) =>
        area === undefined
          ? null
          : prev !== null &&
              prev.left === area.left &&
              prev.top === area.top &&
              prev.right === area.right &&
              prev.bottom === area.bottom
            ? prev
            : { left: area.left, top: area.top, right: area.right, bottom: area.bottom },
      );
      const own = ref.current?.offsetHeight;
      if (own !== undefined && own > 0) setHeight(own);
      frame = host.requestAnimationFrame(follow);
    };
    follow();
    return () => host.cancelAnimationFrame(frame);
  }, [host, key, bounds]);
  const at = placeNextTo(
    spot,
    { width: WIDTH, height },
    view ?? { left: 0, top: 0, right: host.innerWidth, bottom: host.innerHeight },
  );

  const { amount, sorte } = suggestion;
  const label =
    suggestion.source === 'oz'
      ? 'OZ im Text'
      : suggestion.source === 'menge'
        ? 'Menge passt zu'
        : suggestion.source === 'text'
          ? 'Kurztext im Text'
          : 'Betonsorte passt zu';
  return createPortal(
    <div
      ref={ref}
      role="dialog"
      aria-label="Vorschlag verknüpfen"
      data-nonmodal=""
      className="ov-window fixed z-[70] flex flex-col gap-[8px] p-[10px]"
      style={{ left: at.left, top: at.top, width: WIDTH }}
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
