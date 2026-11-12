// Rubrik „Markierfarben“ der Einstellungen (Entscheidungen 0063, 0109): die sechs festen
// Farben zum Anstreichen im Langtext, je mit eigenem Namen. Dasselbe wie „Farben benennen“
// im Menü zur Textauswahl (PaintNamesDialog), hier ohne vorher Text zu markieren.

import { useState } from 'react';
import { PAINT_INFO, PAINTS, type Paint } from '../../lib/annotations';
import { MAX_PAINT_NAME_LENGTH } from '../../lib/paintNames';
import { usePaintNames } from '../../state/paintNames';

export function PaintNamesTab() {
  const { names, rename } = usePaintNames();
  // Eigener Entwurf je Feld: `rename` kürzt Leerzeichen, ein Feld direkt auf `names` verlöre
  // beim Tippen das Leerzeichen zwischen zwei Wörtern.
  const [drafts, setDrafts] = useState<Partial<Record<Paint, string>>>(() => ({ ...names }));
  return (
    <div className="flex max-w-[560px] flex-col p-[16px]">
      {PAINTS.map((paint) => (
        <label
          key={paint}
          className="flex min-h-[52px] items-center gap-[12px] border-b border-line"
        >
          <span
            aria-hidden="true"
            className="h-[28px] w-[28px] shrink-0 rounded-full border border-line2"
            style={{ background: PAINT_INFO[paint].fill }}
          />
          <input
            type="text"
            value={drafts[paint] ?? ''}
            maxLength={MAX_PAINT_NAME_LENGTH}
            placeholder={PAINT_INFO[paint].label}
            aria-label={`Name für ${PAINT_INFO[paint].label}`}
            onChange={(event) => {
              setDrafts({ ...drafts, [paint]: event.target.value });
              rename(paint, event.target.value);
            }}
            className="h-[40px] min-w-0 flex-1 rounded-[var(--r-sm)] border border-line bg-surface px-[12px] text-[14px] text-ink focus:border-accent focus:outline-none"
          />
        </label>
      ))}
    </div>
  );
}
