// Textausschnitt rund um einen Suchtreffer. Die Tabelle zeigt nur den
// Kurztext; trifft die Suche nur den Langtext, sähe man sonst nicht, warum
// die Zeile überhaupt in der Trefferliste steht (Issue #100).

import { findInKey, searchKeyOf, searchNeedleOf } from '@core';

/** Zeichen links und rechts vom Treffer, bevor gekürzt wird. */
const RADIUS = 40;

/**
 * Text ohne `**`-Markierungen, ohne Trennstrich am Zeilenende und mit einfachem
 * Leerraum — so steht der Ausschnitt da. Wer darin markiert, glättet den Suchbegriff
 * genauso.
 */
export function flat(text: string): string {
  return (
    text
      .replace(/\*\*/g, '')
      // Getrenntes Wort am Zeilenende wieder zusammen, wie der Suchschlüssel es liest.
      .replace(/[-\u2010\u2011][^\S\r\n]*[\r\n]\s*/g, '')
      .replace(/\s+/g, ' ')
  );
}

/**
 * Ausschnitt aus `text` um das erste Vorkommen von `query`, nach derselben Regel wie die
 * Suche (`searchKeyOf`, Entscheidung 0103); gekürzte Ränder enden in „…". Gesucht wird im
 * Rohtext, erst der Ausschnitt wird von Zeilenumbrüchen und `**`-Markierungen befreit —
 * sonst fehlte er, wo die Suche über eine solche Stelle hinweg trifft. `null`, wenn die
 * Suche leer ist oder nicht vorkommt.
 */
export function searchSnippet(text: string, query: string, radius = RADIUS): string | null {
  const [hit] = findInKey(searchKeyOf(text), searchNeedleOf(query));
  if (hit === undefined) return null;
  const start = Math.max(0, hit.start - radius);
  const end = Math.min(text.length, hit.end + radius);
  const middle = flat(text.slice(start, end)).trim();
  const head = flat(text.slice(0, start)).trim() !== '' ? '…' : '';
  const tail = flat(text.slice(end)).trim() !== '' ? '…' : '';
  return `${head}${middle}${tail}`;
}
