// Notiz-Text mit @-Verweisen (Entscheidung 0111): jeder Verweis ist ein Chip mit der OZ,
// ein Tipp springt zur Position. Ein Verweis auf eine Position, die gerade nicht geladen
// ist (LV geschlossen), steht grau als „@?“ da und springt nicht.

import { parseMentions } from '../../lib/mentions';
import { useViewer } from '../../state/viewer';
import { useJumpToPosition } from './useJumpToPosition';

const CHIP =
  'mx-[1px] inline cursor-pointer rounded-[var(--r-pill)] border-none bg-accent-soft px-[6px] py-0 align-baseline font-mono text-[12px] font-semibold text-accent-ink hover:bg-accent hover:text-white [@media(pointer:coarse)]:py-[2px]';

export function MentionText({ text, className }: { text: string; className?: string }) {
  const { index } = useViewer();
  const jump = useJumpToPosition();
  return (
    <p className={className ?? 'm-0 whitespace-pre-wrap break-words'}>
      {parseMentions(text).map((part, i) => {
        if (part.kind === 'text') return <span key={i}>{part.text}</span>;
        const slot = index.slotOf.get(part.id);
        const position = slot === undefined ? null : index.positions[slot];
        if (position === null) {
          return (
            <span
              key={i}
              title="Position ist nicht geladen"
              className="mx-[1px] rounded-[var(--r-pill)] bg-sunken px-[6px] font-mono text-[12px] text-mute"
            >
              @?
            </span>
          );
        }
        const lead = position.lv === undefined ? position.oz : `${position.lv} · ${position.oz}`;
        return (
          <button
            key={i}
            type="button"
            title={position.shortText}
            onClick={(event) => {
              event.stopPropagation();
              jump(part.id, { stayInView: true });
            }}
            className={CHIP}
          >
            @{lead}
          </button>
        );
      })}
    </p>
  );
}
