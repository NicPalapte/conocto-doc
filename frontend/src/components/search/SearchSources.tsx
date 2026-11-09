// Teile des Treffer-Navigators in der Suchleiste (Entscheidung 0103, Mockup E): Zählung
// „4 / 9 ▾“, ▲ ▼ und die Quellen-Liste, die unter der Suchleiste ausklappt. Am Ende einer
// Quelle steht dort der Hinweis auf die nächste.

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
      aria-label={`Treffer in ${nav.current.label}: ${countLabel(nav.current)}. Quellen zeigen`}
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
        title="Voriger Treffer (Umschalt + Enter)"
        disabled={none}
        onClick={() => nav.step(-1)}
        className={NAV_BUTTON}
      >
        ▲
      </button>
      <button
        type="button"
        aria-label="Nächster Treffer"
        title="Nächster Treffer (Enter)"
        disabled={none}
        onClick={() => nav.step(1)}
        className={NAV_BUTTON}
      >
        ▼
      </button>
    </>
  );
}

const ROW =
  'grid w-full cursor-pointer grid-cols-[minmax(0,4fr)_52px_minmax(0,5fr)] items-center gap-[12px] rounded-[var(--r-sm)] border-none px-[10px] py-[7px] text-left font-mono text-[12px] [@media(pointer:coarse)]:py-[11px]';

/** Quellen-Liste und Ende-Hinweis unter der Suchleiste. */
export function SearchSources({ nav, open }: { nav: SearchNav; open: boolean }) {
  const hint = nav.hint;
  if (!open && hint === null) return null;
  return (
    <div className="ov-window absolute inset-x-0 top-[42px] z-[30] flex flex-col gap-[2px] p-[6px]">
      {hint !== null && (
        <div
          role="status"
          className="flex flex-wrap items-center gap-[8px] px-[8px] py-[4px] font-mono text-[11.5px] text-mute"
        >
          <span>Ende von {nav.sources.find((source) => source.id === hint.from)?.label}</span>
          <button
            type="button"
            // Kein Blur vor dem Klick: sonst klappt die Liste unter dem Zeiger zu.
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => nav.choose(hint.next.id)}
            className="inline-flex h-[26px] max-w-full cursor-pointer items-center gap-[6px] truncate rounded-[var(--r-pill)] border-none bg-accent-fill px-[10px] font-mono text-[11.5px] font-medium text-white hover:bg-accent-fill-hover [@media(pointer:coarse)]:h-[36px]"
          >
            Weiter in: {hint.next.label} ({formatCount(hint.next.count ?? 0)}) →
          </button>
        </div>
      )}
      {open && (
        <div role="group" aria-label="Treffer je Quelle" className="flex flex-col gap-[2px]">
          {nav.sources.map((source) => {
            const on = source.id === nav.current.id;
            const empty = source.count === 0;
            return (
              <button
                key={source.id}
                type="button"
                aria-current={on ? 'true' : undefined}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => nav.choose(source.id)}
                className={`${ROW} ${
                  on
                    ? 'bg-accent-soft text-accent-ink shadow-[inset_2px_0_0_var(--accent)]'
                    : 'bg-transparent text-ink hover:bg-sunken'
                } ${empty ? 'opacity-55' : ''}`}
              >
                <span className={`truncate ${on ? 'font-medium' : ''}`} title={source.label}>
                  {source.label}
                </span>
                <span className={on ? 'font-medium' : 'text-mute'}>
                  {on ? countLabel(source) : source.count === null ? '…' : source.count}
                </span>
                <span className="truncate text-dim" title={source.preview ?? undefined}>
                  {source.count === null
                    ? 'wird durchsucht'
                    : empty
                      ? 'keine Treffer'
                      : source.preview}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
