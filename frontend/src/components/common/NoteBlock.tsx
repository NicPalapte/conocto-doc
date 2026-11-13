// Eigene Marker und Kommentar-Verlauf zu einer Position (Entscheidungen 0047, 0053, 0062).
// Fortschritt und „Wichtig" stehen in der Titelzeile der Karte (Issue #153), der Verlauf
// als letzter Block im Inhalt. „Senden" hängt einen Kommentar mit Zeitpunkt an;
// Marker-Wechsel stehen grau dazwischen. useSaveAnnotations schreibt kurz danach
// in den Speicher der letzten Datei.

import { useMemo, useRef, useState } from 'react';
import { Section } from './CardParts';
import { MentionInput } from './MentionInput';
import { MentionText } from './MentionText';
import { PROGRESS_CHOICES, setImportantNow, setProgressNow } from './markers';
import { useDismiss } from './useDismiss';
import { useJumpToPosition } from './useJumpToPosition';
import { useOptionalDocuments } from '../docs/DocumentsProvider';
import {
  formatAt,
  IMPORTANT_INFO,
  mentionsOf,
  PROGRESS_INFO,
  type LogEntry,
  type Mention,
} from '../../lib/annotations';
import { isWholeDoc } from '../../lib/docs/docNotes';
import { useViewer, useViewerDispatch } from '../../state/viewer';

const TEXT = 'm-0 whitespace-pre-wrap break-words font-mono text-[13px] leading-[1.5] text-ink';

/**
 * Eine Notiz, die diese Position erwähnt (Entscheidung 0111): oben die Quelle, ein Tipp
 * öffnet sie — die Dokumentstelle (wenn das PDF offen ist) oder die andere Position.
 */
function MentionEntry({ mention }: { mention: Mention }) {
  const { annotations, index } = useViewer();
  const documents = useOptionalDocuments();
  const jump = useJumpToPosition();
  const { source } = mention;
  let where: string;
  let open: (() => void) | null;
  if (source.kind === 'doc') {
    const { mark } = source;
    const name = annotations.documents.docs.get(mark.doc)?.name ?? 'Dokument';
    where = `${name} · ${isWholeDoc(mark) ? 'ganzes Dokument' : `S. ${mark.page}`}`;
    const isOpen = documents?.docs.some((entry) => entry.id === mark.doc) ?? false;
    open = isOpen && documents !== null ? () => documents.jumpTo(mark) : null;
  } else {
    const slot = index.slotOf.get(source.id);
    const position = slot === undefined ? null : index.positions[slot];
    where =
      position === null
        ? 'Position'
        : `Position ${position.lv === undefined ? '' : `${position.lv} · `}${position.oz}`;
    open = position === null ? null : () => jump(source.id, { stayInView: true });
  }
  return (
    <li className="flex flex-col gap-[2px] rounded-[var(--r-md)] border border-line bg-surface px-[10px] py-[7px]">
      <div className="flex items-center gap-[8px] font-mono text-[11px] text-mute">
        {open === null ? (
          <span className="min-w-0 truncate font-semibold">
            {where}
            {source.kind === 'doc' && <span className="text-amber"> · nicht geöffnet</span>}
          </span>
        ) : (
          <button
            type="button"
            onClick={open}
            title={source.kind === 'doc' ? 'Stelle im Dokument zeigen' : 'Position zeigen'}
            className={`min-w-0 cursor-pointer truncate border-none bg-transparent p-0 text-left font-mono text-[11px] font-semibold hover:underline [@media(pointer:coarse)]:py-[4px] ${
              source.kind === 'doc' ? 'text-cyan' : 'text-dim'
            }`}
          >
            {where}
          </button>
        )}
        <span className="ml-auto shrink-0">{formatAt(mention.at)}</span>
      </div>
      <MentionText text={mention.text} className={TEXT} />
    </li>
  );
}

function entryLine(entry: Exclude<LogEntry, { kind: 'comment' }>): string {
  if (entry.kind === 'important') return entry.on ? 'Wichtig' : 'Nicht mehr wichtig';
  return entry.progress === null ? 'Wieder offen' : PROGRESS_INFO[entry.progress].label;
}

export function NoteBlock({ positionId }: { positionId: string }) {
  const { annotations, persistId } = useViewer();
  const dispatch = useViewerDispatch();
  const [draft, setDraft] = useState('');
  const entries = annotations.log.get(positionId) ?? [];
  const mentions = useMemo(() => mentionsOf(annotations, positionId), [annotations, positionId]);
  // Eigene Einträge und Erwähnungen in einer Liste nach Zeit (Nico, 14.11.2026).
  const rows = useMemo(() => {
    const own = entries.map((entry, i) => ({ at: entry.at, own: { entry, i } as const }));
    const other = mentions.map((mention) => ({ at: mention.at, mention }));
    return [...own, ...other].sort((a, b) => a.at - b.at);
  }, [entries, mentions]);

  const send = (): void => {
    if (draft.trim() === '') return;
    dispatch({ type: 'addComment', id: positionId, text: draft, at: Date.now() });
    setDraft('');
  };

  return (
    <Section title="Verlauf">
      {rows.length > 0 && (
        <ol aria-label="Verlauf" className="m-0 flex list-none flex-col gap-[6px] p-0">
          {rows.map((row) =>
            'mention' in row ? (
              <MentionEntry key={`m-${row.at}-${row.mention.text}`} mention={row.mention} />
            ) : row.own.entry.kind !== 'comment' ? (
              <li
                key={`${row.at}-${row.own.i}`}
                className="flex gap-[8px] px-[2px] font-mono text-[11px] text-mute"
              >
                <span>{formatAt(row.at)}</span>
                <span>{entryLine(row.own.entry)}</span>
              </li>
            ) : (
              <li
                key={`${row.at}-${row.own.i}`}
                className="group flex flex-col gap-[2px] rounded-[var(--r-md)] border border-line bg-panel px-[10px] py-[7px]"
              >
                <div className="flex items-center gap-[8px] font-mono text-[11px] text-mute">
                  <span>{formatAt(row.at)}</span>
                  <button
                    type="button"
                    aria-label="Kommentar löschen"
                    title="Kommentar löschen"
                    onClick={() =>
                      dispatch({ type: 'removeComment', id: positionId, position: row.own.i })
                    }
                    className="ml-auto cursor-pointer border-none bg-transparent p-0 text-mute opacity-0 hover:text-ink focus-visible:opacity-100 group-hover:opacity-100 [@media(pointer:coarse)]:opacity-100"
                  >
                    ✕
                  </button>
                </div>
                <MentionText text={row.own.entry.text} className={TEXT} />
              </li>
            ),
          )}
        </ol>
      )}
      <div className="flex items-end gap-[8px]">
        <MentionInput
          value={draft}
          onChange={setDraft}
          onSubmit={send}
          label="Kommentar zur Position"
          placeholder="Kommentar … (@ für Position)"
        />
        <button
          type="button"
          onClick={send}
          disabled={draft.trim() === ''}
          title="Senden (Strg+Enter)"
          className="inline-flex h-[32px] cursor-pointer items-center rounded-[var(--r-pill)] border-none bg-accent-fill px-[14px] font-mono text-[12px] text-white disabled:cursor-default disabled:opacity-40"
        >
          Senden
        </button>
      </div>
      {persistId === null && (
        <span className="font-mono text-[11px] text-mute">
          Nur für diese Sitzung, wird nicht gespeichert.
        </span>
      )}
    </Section>
  );
}

const HEAD_BUTTON =
  'inline-flex h-[28px] shrink-0 cursor-pointer items-center rounded-[var(--r-sm)] border font-mono text-[11.5px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent';

/** Fortschritt als Knopf mit Auswahlliste (Issue #153): ein Klick auf, ein Klick setzt. */
function ProgressMenu({ positionId }: { positionId: string }) {
  const { annotations } = useViewer();
  const dispatch = useViewerDispatch();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useDismiss(ref, open, () => setOpen(false));
  const current = annotations.progress.get(positionId) ?? null;
  const info = current === null ? null : PROGRESS_INFO[current];

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label="Fortschritt"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className={`${HEAD_BUTTON} gap-[6px] border-line bg-surface px-[10px] text-ink hover:border-line2`}
        style={
          info === null
            ? undefined
            : { background: info.fill, borderColor: info.fill, color: info.text }
        }
      >
        {info === null ? 'Offen' : info.label}
        <svg width="9" height="6" viewBox="0 0 9 6" aria-hidden="true">
          <path d="M1 1l3.5 3.5L8 1" fill="none" stroke="currentColor" strokeWidth="1.4" />
        </svg>
      </button>
      {open && (
        <div
          role="menu"
          aria-label="Fortschritt"
          className="ov-window absolute right-0 top-[34px] z-[20] flex min-w-[170px] flex-col gap-[2px] p-[5px]"
        >
          {PROGRESS_CHOICES.map(({ value, label }) => (
            <button
              key={label}
              type="button"
              role="menuitemradio"
              aria-checked={value === current}
              onClick={() => {
                if (value !== current) setProgressNow(dispatch, positionId, value);
                setOpen(false);
              }}
              className="flex h-[30px] cursor-pointer items-center justify-between gap-[12px] rounded-[var(--r-sm)] border-none bg-transparent px-[8px] text-left font-mono text-[12px] text-ink hover:bg-sunken"
            >
              {label}
              {value === current && (
                <span aria-hidden="true" className="h-[6px] w-[6px] rounded-full bg-accent" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Fortschritt und „Wichtig" in der Titelzeile der Positionskarte (Entscheidung 0062,
 * Issue #153). Beides unabhängig: „Erledigt" kann wichtig bleiben.
 */
export function MarkerHead({ positionId }: { positionId: string }) {
  const { annotations } = useViewer();
  const dispatch = useViewerDispatch();
  const important = annotations.important.has(positionId);
  return (
    <div className="flex shrink-0 items-center gap-[6px]">
      <ProgressMenu positionId={positionId} />
      <button
        type="button"
        aria-label={IMPORTANT_INFO.label}
        aria-pressed={important}
        onClick={() => setImportantNow(dispatch, positionId, !important)}
        title={important ? '„Wichtig" aufheben' : 'Als wichtig markieren'}
        className={`${HEAD_BUTTON} w-[28px] justify-center font-display text-[14px] font-bold`}
        style={
          important
            ? {
                background: IMPORTANT_INFO.fill,
                borderColor: IMPORTANT_INFO.fill,
                color: IMPORTANT_INFO.text,
              }
            : {
                background: 'var(--surface)',
                borderColor: 'var(--line)',
                color: IMPORTANT_INFO.fill,
              }
        }
      >
        {IMPORTANT_INFO.glyph}
      </button>
    </div>
  );
}
