// Eingabe für Notizen mit @-Verweisen (Entscheidung 0111). „@“ tippen (oder den Knopf, am
// Tablet ohne @-Taste griffbereit) öffnet unter dem Feld passende Positionen nach OZ oder
// Kurztext aus allen geladenen LVs. Tippen oder Enter übernimmt; im Text steht dann
// `@[Knoten-ID]`, angezeigt als Chip (`MentionText`).
//
// Die Liste steht unter dem Feld im Fluss, nicht schwebend: so schneidet kein Bereich mit
// Bildlauf sie ab, und die Bildschirmtastatur am Tablet verdeckt sie nicht.

import { useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import {
  canMention,
  insertMention,
  mentionCandidates,
  mentionQueryAt,
  type MentionCandidate,
  type MentionQuery,
} from '../../lib/mentions';
import { useViewer } from '../../state/viewer';

const ROW =
  'flex w-full min-w-0 cursor-pointer items-baseline gap-[8px] border-none bg-transparent px-[10px] py-[6px] text-left [@media(pointer:coarse)]:py-[10px]';

export function MentionInput({
  value,
  onChange,
  onSubmit,
  label,
  placeholder,
  autoFocus = false,
  rows = 2,
}: {
  value: string;
  onChange: (value: string) => void;
  /** Strg/⌘+Enter. */
  onSubmit: () => void;
  label: string;
  placeholder: string;
  autoFocus?: boolean;
  rows?: number;
}) {
  const { index } = useViewer();
  const area = useRef<HTMLTextAreaElement>(null);
  const [query, setQueryState] = useState<MentionQuery | null>(null);
  // Am Tablet kann das Feld den Fokus verlieren, bevor der Tipp auf einen Vorschlag ankommt.
  // Darum schließt `onBlur` erst verzögert, und `pick` liest den letzten Stand von hier.
  const last = useRef<MentionQuery | null>(null);
  const setQuery = (next: MentionQuery | null): void => {
    if (next !== null) last.current = next;
    setQueryState(next);
  };
  const [active, setActive] = useState(0);
  // Cursor nach dem Einsetzen: gleich nach dem Neuzeichnen setzen, vor dem nächsten Tastendruck.
  const cursorAfter = useRef<number | null>(null);
  useLayoutEffect(() => {
    const el = area.current;
    const at = cursorAfter.current;
    if (el === null || at === null) return;
    cursorAfter.current = null;
    el.focus();
    el.setSelectionRange(at, at);
  }, [value]);

  const candidates = useMemo<MentionCandidate[]>(() => {
    const out: MentionCandidate[] = [];
    for (let slot = 0; slot < index.size; slot++) {
      const id = index.nodes[slot].id;
      if (!canMention(id)) continue;
      const position = index.positions[slot];
      out.push({ id, oz: position.oz, shortText: position.shortText });
    }
    return out;
  }, [index]);
  const hits = useMemo(
    () => (query === null ? [] : mentionCandidates(candidates, query.query)),
    [candidates, query],
  );
  const lvOf = (id: string): string | undefined => {
    const slot = index.slotOf.get(id);
    return slot === undefined ? undefined : index.positions[slot].lv;
  };

  const look = (text: string, cursor: number): void => {
    const next = mentionQueryAt(text, cursor);
    setQuery(next);
    setActive(0);
  };

  const pick = (candidate: MentionCandidate): void => {
    const el = area.current;
    const open = query ?? last.current;
    if (open === null || el === null) return;
    const cursor = open.start + 1 + open.query.length;
    const next = insertMention(value, cursor, open, candidate.id);
    cursorAfter.current = next.cursor;
    onChange(next.text);
    setQuery(null);
  };

  const startMention = (): void => {
    const el = area.current;
    if (el === null) return;
    const at = el.selectionStart;
    const before = value.slice(0, at);
    const lead = before === '' || /\s$/.test(before) ? '@' : ' @';
    const text = before + lead + value.slice(el.selectionEnd);
    const cursor = at + lead.length;
    cursorAfter.current = cursor;
    onChange(text);
    setQuery({ start: cursor - 1, query: '' });
    setActive(0);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>): void => {
    if (query !== null && hits.length > 0) {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        const step = event.key === 'ArrowDown' ? 1 : -1;
        setActive((active + step + hits.length) % hits.length);
        return;
      }
      if ((event.key === 'Enter' && !event.ctrlKey && !event.metaKey) || event.key === 'Tab') {
        event.preventDefault();
        pick(hits[Math.min(active, hits.length - 1)]);
        return;
      }
    }
    if (query !== null && event.key === 'Escape') {
      // Nur die Liste schließen, nicht das Fenster drumherum.
      event.preventDefault();
      event.stopPropagation();
      event.nativeEvent.stopImmediatePropagation();
      setQuery(null);
      return;
    }
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      onSubmit();
    }
  };

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-[4px]">
      <div className="flex items-end gap-[6px]">
        <textarea
          ref={area}
          value={value}
          autoFocus={autoFocus}
          onChange={(event) => {
            onChange(event.target.value);
            look(event.target.value, event.target.selectionStart);
          }}
          onSelect={(event) => look(event.currentTarget.value, event.currentTarget.selectionStart)}
          onBlur={() => {
            window.setTimeout(() => setQueryState(null), 200);
          }}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          aria-label={label}
          aria-autocomplete="list"
          aria-expanded={query !== null}
          rows={rows}
          className="min-w-0 flex-1 resize-y rounded-[var(--r-md)] border border-line bg-panel px-[10px] py-[8px] font-mono text-[13px] leading-[1.5] text-ink outline-none placeholder:text-mute focus:border-accent"
        />
        <button
          type="button"
          aria-label="Position erwähnen"
          title="Position erwähnen (@)"
          onMouseDown={(event) => event.preventDefault()}
          onClick={startMention}
          className="inline-flex h-[32px] w-[32px] shrink-0 cursor-pointer items-center justify-center rounded-[var(--r-pill)] border border-line bg-surface font-mono text-[14px] font-semibold text-dim hover:border-line2 hover:text-ink [@media(pointer:coarse)]:h-[40px] [@media(pointer:coarse)]:w-[40px]"
        >
          @
        </button>
      </div>
      {query !== null && (
        <div
          role="listbox"
          aria-label="Position erwähnen"
          className="overflow-hidden rounded-[var(--r-md)] border border-line bg-surface shadow-[var(--shadow-sm)]"
        >
          {hits.length === 0 ? (
            <div className="px-[10px] py-[7px] font-mono text-[12px] text-mute">
              {query.query.trim() === '' ? 'OZ oder Kurztext tippen' : 'Keine Position'}
            </div>
          ) : (
            hits.map((hit, i) => {
              const lv = lvOf(hit.id);
              return (
                <button
                  key={hit.id}
                  type="button"
                  role="option"
                  aria-selected={i === active}
                  // Fokus bleibt im Feld, sonst schließt `onBlur` die Liste vor dem Klick.
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => pick(hit)}
                  className={`${ROW} ${i > 0 ? 'border-t border-line' : ''} ${
                    i === active ? 'bg-accent-soft' : 'hover:bg-sunken'
                  }`}
                >
                  <span
                    className={`shrink-0 font-mono text-[12px] font-semibold ${
                      i === active ? 'text-accent-ink' : 'text-dim'
                    }`}
                  >
                    {hit.oz}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-sans text-[13px] text-ink">
                    {hit.shortText}
                  </span>
                  {lv !== undefined && (
                    <span className="shrink-0 font-mono text-[11px] text-mute">{lv}</span>
                  )}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
