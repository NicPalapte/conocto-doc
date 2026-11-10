// Karte „Betonsorten" im Überblick (Entscheidung 0104). Eine Zeile je Sorte; ein
// Klick filtert nach der Sorte (Facette `betonsorte`) und klappt sie auf: dann
// stehen darunter die Angaben zur Festlegung und die Positionen. „← Alle Sorten" hebt den
// Filter wieder auf. Aufgeklappt ist, was gefiltert ist — kein eigener Zustand daneben.
// Was einer Position fehlt, zeigt die Positionskarte (`fehlendeAngabenOf`).

import { formatCount, formatNumber, formatPositions } from '../../lib/format';
import { angabeText } from '../../lib/export/betonSorten';
import type { BetonSorte, BetonSortenListe, Menge } from '../../lib/beton/sorten';

const PILL = 'whitespace-nowrap rounded-full px-[8px] py-[2px] font-mono text-[11px]';

function mengeText(menge: Menge | undefined): string {
  return menge === undefined ? '—' : `${formatNumber(menge.sum)} ${menge.label}`.trim();
}

function fehlendText(sorte: BetonSorte): string {
  const fehlend = sorte.angaben.filter((angabe) => angabe.fehlt > 0).length;
  if (fehlend === 0) return 'vollständig';
  return fehlend === 1 ? '1 Angabe fehlt' : `${fehlend} Angaben fehlen`;
}

function Detail({
  sorte,
  selectedId,
  onPickPosition,
}: {
  sorte: BetonSorte;
  selectedId: string | null;
  onPickPosition: (nodeId: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-[12px] border-b border-solid border-line bg-panel px-[10px] py-[10px]">
      <div className="min-w-0 flex-1 basis-[240px]">
        <p className="m-0 pb-[4px] font-mono text-[11px] tracking-[0.6px] text-mute">
          ANGABEN · DIN EN 206 / DIN 1045-2
        </p>
        {sorte.angaben.map((angabe) => (
          <div
            key={angabe.key}
            className="flex items-baseline gap-[8px] border-b border-solid border-line py-[4px] text-[12px]"
          >
            <span className="min-w-0 flex-1 text-dim">{angabe.label}</span>
            <span className={angabe.fehlt === 0 ? 'text-right text-ink' : 'text-right text-amber'}>
              {angabeText(sorte, angabe.key)}
            </span>
          </div>
        ))}
      </div>
      <div className="min-w-0 flex-[2] basis-[280px]" role="list" aria-label="Positionen">
        {sorte.positions.map((position) => (
          <button
            key={position.nodeId}
            type="button"
            role="listitem"
            onClick={() => onPickPosition(position.nodeId)}
            className={`flex w-full cursor-pointer flex-wrap items-baseline gap-x-[8px] gap-y-[2px] border-none border-b border-solid border-line px-[4px] py-[5px] text-left text-[12px] ${
              position.nodeId === selectedId ? 'bg-accent-soft' : 'bg-transparent'
            }`}
          >
            <span className="w-[76px] shrink-0 text-dim">{position.oz}</span>
            <span className="min-w-0 flex-1 truncate text-ink">{position.shortText}</span>
            <span className="shrink-0 text-ink">
              {position.quantity === null
                ? '—'
                : `${formatNumber(position.quantity)} ${position.unit ?? ''}`.trim()}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function BetonSortenCard({
  liste,
  active,
  selectedId,
  onPickSorte,
  onPickPosition,
}: {
  liste: BetonSortenListe;
  active: ReadonlySet<string>;
  selectedId: string | null;
  onPickSorte: (key: string) => void;
  onPickPosition: (nodeId: string) => void;
}) {
  if (liste.sorten.length === 0) {
    return (
      <p className="font-mono text-[11px] text-mute">Keine Betonsorten im aktuellen Filter.</p>
    );
  }
  const open = active.size === 1 ? [...active][0] : null;

  return (
    <>
      <div className="flex flex-wrap items-center gap-[8px] pb-[8px]">
        <span className="min-w-0 flex-1 text-[12px] text-dim">
          {liste.sorten.length === 1 ? '1 Sorte' : `${formatCount(liste.sorten.length)} Sorten`} ·{' '}
          {formatPositions(liste.positions)} · {formatNumber(liste.kubik)} m³
        </span>
        {open !== null && (
          <button
            type="button"
            onClick={() => onPickSorte(open)}
            title="Filter auf diese Sorte aufheben"
            className="cursor-pointer rounded-[var(--r-sm)] border border-solid border-line bg-surface px-[10px] py-[4px] font-mono text-[12px] text-ink hover:bg-sunken"
          >
            ← Alle Sorten
          </button>
        )}
      </div>
      <div role="list" aria-label="Betonsorten">
        {liste.sorten.map((sorte) => {
          const isActive = active.has(sorte.key);
          const complete = sorte.fehlend === 0;
          const details = [
            `${formatCount(sorte.positions.length)} Pos.`,
            mengeText(sorte.mengen[0]),
            ...sorte.bauweise,
            ...sorte.stahlFasern,
          ];
          return (
            <div key={sorte.key} role="listitem">
              <button
                type="button"
                aria-pressed={isActive}
                aria-expanded={open === sorte.key}
                onClick={() => onPickSorte(sorte.key)}
                title="Klicken filtert nach dieser Sorte"
                className={`flex w-full cursor-pointer flex-wrap items-center gap-x-[8px] gap-y-[2px] border-none border-b border-solid border-line px-[6px] py-[6px] text-left text-[12px] ${
                  isActive
                    ? 'bg-accent-soft shadow-[inset_2px_0_0_var(--accent)]'
                    : 'bg-transparent'
                }`}
              >
                <span className="font-semibold text-ink">{sorte.festigkeit ?? sorte.key}</span>
                <span className="min-w-0 flex-1 truncate text-dim">{sorte.klassen}</span>
                <span
                  className={`${PILL} ${complete ? 'bg-greenS text-greenD' : 'bg-amberS text-amber'}`}
                >
                  {fehlendText(sorte)}
                </span>
                <span className="w-full text-[11px] text-mute">{details.join(' · ')}</span>
              </button>
              {open === sorte.key && (
                <Detail sorte={sorte} selectedId={selectedId} onPickPosition={onPickPosition} />
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
