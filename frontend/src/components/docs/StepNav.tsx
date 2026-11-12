// Ein Blätterer in der Kopfleiste des Dokuments (Issue #191, Runde 3, Nico 11.11.: Variante A):
// ‹ 1 / 8 › geht entweder durch die offenen Vorschläge oder durch die „Verknüpfungen“, also
// die eigenen Stellen (angestrichen oder verknüpft; Name von Nico, 11.11.). Was er durchgeht,
// wählt das Menü davor; dort stehen auch die Schalter je Art von Vorschlag
// (OZ, Mengen, Beton, Entscheidung 0087) als Häkchenliste.

import { useCallback, useRef, useState, type ReactNode } from 'react';
import { DOC_TOOL as TOOL } from './PdfInput';
import { useDismiss } from '../common/useDismiss';
import { Popover } from '../ui/Popover';
import { LINK_SOURCES, SUGGEST_BORDER, type LinkSource } from '../../lib/docs/docSuggest';

export type StepMode = 'vorschlaege' | 'stellen';

const SOURCE_LABEL: Readonly<Record<LinkSource, string>> = {
  oz: 'OZ',
  menge: 'Mengen',
  beton: 'Beton',
  text: 'Kurztext',
};

const MODE_LABEL: Readonly<Record<StepMode, string>> = {
  vorschlaege: 'Vorschläge',
  stellen: 'Verknüpfungen',
};

const STEP_LABEL: Readonly<Record<StepMode, readonly [string, string]>> = {
  vorschlaege: ['Voriger Vorschlag', 'Nächster Vorschlag'],
  stellen: ['Vorige Verknüpfung', 'Nächste Verknüpfung'],
};

const ROW =
  'flex h-[28px] w-full cursor-pointer items-center gap-[8px] rounded-[var(--r-sm)] border-none bg-transparent px-[8px] text-left font-mono text-[12px] text-ink hover:bg-sunken';

type Anchor = { left: number; top: number };

function Row({
  role,
  checked,
  onClick,
  children,
  count,
}: {
  role: 'menuitemradio' | 'menuitemcheckbox';
  checked: boolean;
  onClick: () => void;
  children: ReactNode;
  count: number;
}) {
  return (
    <button type="button" role={role} aria-checked={checked} onClick={onClick} className={ROW}>
      <span aria-hidden="true" className="w-[10px] text-accent">
        {checked ? (role === 'menuitemradio' ? '●' : '✓') : ''}
      </span>
      <span className={`flex flex-1 items-center gap-[6px] ${checked ? '' : 'text-mute'}`}>
        {children}
      </span>
      <span className="text-mute">{count}</span>
    </button>
  );
}

/**
 * `mode` ist schon bereinigt: gibt es nur eine Art zum Durchgehen, ist sie gewählt. Eine Art
 * von Vorschlag ohne offene Vorschläge fehlt in der Liste.
 */
export function StepNav({
  mode,
  setMode,
  suggestTotal,
  markTotal,
  counts,
  suggest,
  setSuggest,
  index,
  total,
  onStep,
}: {
  mode: StepMode;
  setMode: (mode: StepMode) => void;
  /** Offene Vorschläge in allen Arten, auch ausgeblendeten; 0 = keine Wahl „Vorschläge“. */
  suggestTotal: number;
  markTotal: number;
  counts: Readonly<Record<LinkSource, number>>;
  suggest: Readonly<Record<LinkSource, boolean>>;
  setSuggest: (source: LinkSource, on: boolean) => void;
  /** Stelle im gewählten Modus, sonst `null`. */
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
    const box = (anchorRef.current ?? button).getBoundingClientRect();
    onStep(direction, { left: box.left, top: box.bottom + 4 });
  };
  const [prevLabel, nextLabel] = STEP_LABEL[mode];
  const sources = LINK_SOURCES.filter((source) => counts[source] > 0);
  return (
    <span
      ref={anchorRef}
      role="group"
      aria-label="Durchgehen"
      className="flex shrink-0 items-center gap-[2px]"
    >
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        title="Was ‹ › durchgeht; Arten von Vorschlägen ein- und ausblenden"
        onClick={() => setOpen((current) => !current)}
        className={`${TOOL} gap-[4px] aria-expanded:border-accent aria-expanded:bg-accent-soft`}
      >
        {MODE_LABEL[mode]} ▾
      </button>
      <button
        type="button"
        aria-label={prevLabel}
        title={`${prevLabel} (in der Leiste auch ←)`}
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
        aria-label={nextLabel}
        title={`${nextLabel} (in der Leiste auch →)`}
        disabled={total === 0}
        onClick={(event) => step(1, event.currentTarget)}
        className={TOOL}
      >
        ›
      </button>
      <Popover ref={popoverRef} open={open} width={200} align="right" anchorRef={anchorRef}>
        <div role="menu" aria-label="Durchgehen" className="flex flex-col p-[4px]">
          <span className="px-[8px] pt-[2px] pb-[4px] font-mono text-[10.5px] text-mute">
            Durchgehen
          </span>
          {suggestTotal > 0 && (
            <Row
              role="menuitemradio"
              checked={mode === 'vorschlaege'}
              onClick={() => setMode('vorschlaege')}
              count={suggestTotal}
            >
              Vorschläge
            </Row>
          )}
          {markTotal > 0 && (
            <Row
              role="menuitemradio"
              checked={mode === 'stellen'}
              onClick={() => setMode('stellen')}
              count={markTotal}
            >
              Verknüpfungen
            </Row>
          )}
          {sources.length > 0 && (
            <>
              <span aria-hidden="true" className="mx-[4px] my-[4px] h-px bg-line" />
              <span className="px-[8px] pb-[4px] font-mono text-[10.5px] text-mute">
                Vorschläge zeigen
              </span>
              {sources.map((source) => (
                <Row
                  key={source}
                  role="menuitemcheckbox"
                  checked={suggest[source]}
                  onClick={() => setSuggest(source, !suggest[source])}
                  count={counts[source]}
                >
                  <span
                    aria-hidden="true"
                    className={`w-[10px] border-b-2 border-dashed ${SUGGEST_BORDER[source]}`}
                  />
                  {SOURCE_LABEL[source]}
                </Row>
              ))}
            </>
          )}
        </div>
      </Popover>
    </span>
  );
}
