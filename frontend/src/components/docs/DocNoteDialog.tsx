// Notizen an einer Stelle im Begleitdokument (Entscheidung 0111). Öffnet über Rechtsklick
// (am Tablet langes Drücken) auf die markierte Stelle → „Notiz…“ oder über die Marke am
// Rand. Oben die Stelle, darunter die Notizen, unten das Feld mit @-Verweisen.

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MentionInput } from '../common/MentionInput';
import { MentionText } from '../common/MentionText';
import { useHostWindow } from '../common/hostWindow';
import { formatAt } from '../../lib/annotations';
import { isWholeDoc, markAt, type DocSpot } from '../../lib/docs/docNotes';
import { useViewer, useViewerDispatch } from '../../state/viewer';

const WIDTH = 340;
const HEIGHT = 440;

export function DocNoteDialog({
  spot,
  left,
  top,
  onClose,
}: {
  spot: DocSpot;
  left: number;
  top: number;
  onClose: () => void;
}) {
  const host = useHostWindow();
  const { annotations, persistId } = useViewer();
  const dispatch = useViewerDispatch();
  const ref = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState('');
  const comments = markAt(annotations.documents, spot)?.comments ?? [];

  useEffect(() => {
    const onDown = (event: PointerEvent): void => {
      if (!(ref.current?.contains(event.target as Node) ?? false)) onClose();
    };
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') onClose();
    };
    host.document.addEventListener('pointerdown', onDown);
    host.document.addEventListener('keydown', onKey);
    return () => {
      host.document.removeEventListener('pointerdown', onDown);
      host.document.removeEventListener('keydown', onKey);
    };
  }, [host, onClose]);

  const save = (): void => {
    if (draft.trim() === '') return;
    dispatch({ type: 'docComment', spot, text: draft, at: Date.now() });
    setDraft('');
  };

  const x = Math.max(8, Math.min(left, host.innerWidth - WIDTH - 8));
  const y = Math.max(8, Math.min(top, host.innerHeight - HEIGHT - 8));

  return createPortal(
    <div
      ref={ref}
      role="dialog"
      aria-label="Notiz zur Stelle"
      data-keeps-popover=""
      className="ov-window fixed z-[70] flex flex-col overflow-hidden"
      style={{ left: x, top: y, width: WIDTH, maxHeight: HEIGHT }}
    >
      <div className="flex flex-col gap-[4px] border-b border-line px-[12px] py-[8px]">
        <div className="flex items-center gap-[8px]">
          <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.06em] text-mute">
            Notiz · {isWholeDoc(spot) ? 'ganzes Dokument' : `Seite ${spot.page}`}
          </span>
          <button
            type="button"
            aria-label="Schließen"
            onClick={onClose}
            className="ml-auto inline-flex h-[28px] w-[28px] cursor-pointer items-center justify-center rounded-[var(--r-pill)] border-none bg-transparent font-mono text-[14px] text-dim hover:bg-sunken [@media(pointer:coarse)]:h-[36px] [@media(pointer:coarse)]:w-[36px]"
          >
            ✕
          </button>
        </div>
        {!isWholeDoc(spot) && (
          <q className="line-clamp-2 font-sans text-[12px] italic text-dim">{spot.text}</q>
        )}
      </div>
      {comments.length > 0 && (
        <ol
          aria-label="Notizen"
          className="m-0 flex min-h-0 flex-1 list-none flex-col gap-[6px] overflow-auto px-[12px] py-[8px]"
        >
          {comments.map((comment, i) => (
            <li
              key={`${comment.at}-${i}`}
              className="group flex flex-col gap-[2px] rounded-[var(--r-md)] border border-line bg-panel px-[10px] py-[7px]"
            >
              <div className="flex items-center gap-[8px] font-mono text-[11px] text-mute">
                <span>{formatAt(comment.at)}</span>
                <button
                  type="button"
                  aria-label="Notiz löschen"
                  title="Notiz löschen"
                  onClick={() => dispatch({ type: 'docUncomment', spot, position: i })}
                  className="ml-auto cursor-pointer border-none bg-transparent p-0 text-mute opacity-0 hover:text-ink focus-visible:opacity-100 group-hover:opacity-100 [@media(pointer:coarse)]:opacity-100"
                >
                  ✕
                </button>
              </div>
              <MentionText
                text={comment.text}
                className="m-0 whitespace-pre-wrap break-words font-mono text-[13px] leading-[1.5] text-ink"
              />
            </li>
          ))}
        </ol>
      )}
      <div className="flex flex-col gap-[6px] border-t border-line px-[12px] py-[9px]">
        <MentionInput
          value={draft}
          onChange={setDraft}
          onSubmit={save}
          label="Notiz zur Stelle"
          placeholder="Notiz … (@ für Position)"
          autoFocus
        />
        <div className="flex items-center gap-[8px]">
          {persistId === null && (
            <span className="font-mono text-[11px] text-mute">Nur für diese Sitzung</span>
          )}
          <button
            type="button"
            onClick={save}
            disabled={draft.trim() === ''}
            title="Speichern (Strg+Enter)"
            className="ml-auto inline-flex h-[32px] cursor-pointer items-center rounded-[var(--r-pill)] border-none bg-accent-fill px-[14px] font-mono text-[12px] text-white hover:bg-accent-fill-hover disabled:cursor-default disabled:opacity-40 [@media(pointer:coarse)]:h-[40px]"
          >
            Speichern
          </button>
        </div>
      </div>
    </div>,
    host.document.body,
  );
}
