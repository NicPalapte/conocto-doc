// Teile des Treffer-Navigators in der Suchleiste (Entscheidung 0103): Zählung „4 / 9 ▾“,
// ▲ ▼ und die Trefferliste, die unter der Suchleiste ausklappt — je Quelle ein Abschnitt,
// die Quelle dieses Fensters oben.

import { useEffect, useRef } from 'react';
import type { SearchNav, SearchSource } from './SearchNav';
import { formatCount } from '../../lib/format';

/** Knöpfe in der Leiste; mit dem Finger größer. */
const NAV_BUTTON =
  'inline-flex h-[26px] min-w-[26px] shrink-0 cursor-pointer items-center justify-center rounded-[var(--r-sm)] border-none bg-transparent px-[4px] font-mono text-[11px] text-ink hover:bg-sunken disabled:cursor-default disabled:text-mute disabled:hover:bg-transparent [@media(pointer:coarse)]:h-[36px] [@media(pointer:coarse)]:min-w-[36px]';

/** „4 / 9“, „– / 27“ (keine Trefferposition gewählt), „…“ (zählt noch). */
export function countLabel(source: SearchSource): string {
  if (source.count === null) return '…';
  if (source.count === 0) return '0';
  const at = source.index < 0 ? '–' : formatCount(source.index + 1);
  return `${at} / ${formatCount(source.count)}`;
}

export function NavCount({
  nav,
  open,
  onToggle,
}: {
  nav: SearchNav;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      aria-expanded={open}
      aria-label={`Treffer in ${nav.current.label}: ${countLabel(nav.current)}. Trefferliste zeigen`}
      title={nav.current.label}
      onClick={onToggle}
      className={`${NAV_BUTTON} gap-[4px] whitespace-nowrap rounded-[var(--r-pill)] px-[8px] font-medium`}
    >
      {countLabel(nav.current)}
      <span aria-hidden="true" className="text-mute">
        {open ? '▴' : '▾'}
      </span>
    </button>
  );
}

export function NavSteps({ nav }: { nav: SearchNav }) {
  const none = (nav.current.count ?? 0) === 0;
  return (
    <>
      <button
        type="button"
        aria-label="Voriger Treffer"
        title="Voriger Treffer (↑ oder Umschalt + Enter)"
        disabled={none}
        onClick={() => nav.step(-1)}
        className={NAV_BUTTON}
      >
        ▲
      </button>
      <button
        type="button"
        aria-label="Nächster Treffer"
        title="Nächster Treffer (↓ oder Enter)"
        disabled={none}
        onClick={() => nav.step(1)}
        className={NAV_BUTTON}
      >
        ▼
      </button>
    </>
  );
}

/** So viele Treffer je Abschnitt stehen in der Liste; der gezeigte liegt darin. */
const PER_SECTION = 100;

const ITEM =
  'grid w-full cursor-pointer grid-cols-[minmax(64px,auto)_minmax(0,1fr)] items-baseline gap-[12px] rounded-[var(--r-sm)] border-none px-[10px] py-[5px] text-left font-mono text-[12px] [@media(pointer:coarse)]:py-[10px]';

/** Ausschnitt der Treffer um den gezeigten: von `from` bis vor `to`. */
function windowOf(count: number, index: number): { from: number; to: number } {
  const from = Math.max(0, Math.min(index - PER_SECTION / 2, count - PER_SECTION));
  return { from, to: Math.min(count, from + PER_SECTION) };
}

function Section({
  nav,
  source,
  open,
  onPick,
}: {
  nav: SearchNav;
  source: SearchSource;
  open: boolean;
  onPick: () => void;
}) {
  /** Quelle, in der ▲ ▼ gerade stehen — steht nicht immer oben. */
  const first = source.id === nav.current.id;
  const count = source.count;
  const { from, to } = windowOf(count ?? 0, source.index);
  const items = count === null || count === 0 ? [] : nav.itemsOf(source.id, from, to);
  const shown = useRef<HTMLButtonElement>(null);
  // Der gezeigte Treffer der aktuellen Quelle steht beim Öffnen und Blättern im Blick.
  useEffect(() => {
    if (open && first) shown.current?.scrollIntoView?.({ block: 'nearest' });
  }, [open, first, source.index]);
  return (
    <section aria-label={source.label} className="flex flex-col">
      <h3
        className={`sticky top-0 z-[1] m-0 flex items-center gap-[8px] border-b border-line bg-surface px-[10px] py-[6px] font-mono text-[11px] font-semibold ${
          first ? 'text-accent-ink' : 'text-dim'
        }`}
      >
        <span className="min-w-0 truncate" title={source.label}>
          {source.label}
        </span>
        <span className="shrink-0 font-normal text-mute">
          {count === null ? '…' : formatCount(count)}
        </span>
      </h3>
      {count === null && (
        <p className="m-0 px-[10px] py-[5px] font-mono text-[11.5px] text-mute">wird durchsucht</p>
      )}
      {count === 0 && (
        <p className="m-0 px-[10px] py-[5px] font-mono text-[11.5px] text-mute">keine Treffer</p>
      )}
      {from > 0 && (
        <p className="m-0 px-[10px] py-[3px] font-mono text-[11px] text-mute">
          … {formatCount(from)} davor
        </p>
      )}
      {items.map((item) => {
        const on = item.at === source.index;
        return (
          <button
            key={item.at}
            ref={on ? shown : undefined}
            type="button"
            aria-current={on && first ? 'true' : undefined}
            // Kein Blur vor dem Klick: sonst klappt die Liste unter dem Zeiger zu.
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => {
              nav.goTo(source.id, item.at);
              onPick();
            }}
            className={`${ITEM} ${
              on && first
                ? 'bg-accent-soft text-accent-ink shadow-[inset_2px_0_0_var(--accent)]'
                : on
                  ? 'bg-sunken text-ink'
                  : 'bg-transparent text-ink hover:bg-sunken'
            }`}
          >
            <span className={`truncate ${on ? 'font-medium' : 'text-dim'}`}>{item.lead}</span>
            <span className="truncate" title={item.text}>
              {item.text}
            </span>
          </button>
        );
      })}
      {count !== null && to < count && (
        <p className="m-0 px-[10px] py-[3px] font-mono text-[11px] text-mute">
          … {formatCount(count - to)} weitere
        </p>
      )}
    </section>
  );
}

/**
 * Alle Treffer unter der Suchleiste, je Quelle ein Abschnitt; oben der Bereich, in den
 * zuletzt geklickt wurde. Blättern sortiert nicht um.
 */
export function SearchSources({
  nav,
  open,
  onPick,
}: {
  nav: SearchNav;
  open: boolean;
  /** Ein Treffer wurde angeklickt: die Suche klappt ein. */
  onPick: () => void;
}) {
  if (!open) return null;
  return (
    <div
      role="group"
      aria-label="Treffer je Quelle"
      className="ov-window absolute inset-x-0 top-[42px] z-[30] flex max-h-[min(60vh,520px)] flex-col gap-[4px] overflow-y-auto p-[6px]"
    >
      {nav.sources.map((source) => (
        <Section key={source.id} nav={nav} source={source} open={open} onPick={onPick} />
      ))}
    </div>
  );
}
