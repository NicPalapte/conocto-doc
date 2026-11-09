// Suche in Begleitdokumenten (Entscheidungen 0077, 0084, 0103): der Begriff aus dem
// Suchfeld im Bereich „Dokument“, über den Suchschlüssel des Kerns gesucht. Keine Deutung,
// nur Fundstellen.

import { findInKey, searchKeyOf, searchNeedleOf, type SearchKey } from '@core';

/** Mindestlänge — ein Zeichen fände jede Seite. */
export const DOC_SEARCH_MIN = 2;

/** Fundstelle auf einer Seite (ab 1); `start` zählt im Seitentext wie die Textebene. */
export interface DocHit {
  readonly page: number;
  readonly start: number;
  readonly text: string;
}

/** Suchbegriff fürs Dokument: Suchschlüssel (Entscheidung 0103); leer, wenn zu kurz. */
export function docNeedleOf(search: string): string {
  return searchNeedleOf(search, DOC_SEARCH_MIN);
}

/**
 * Alle Vorkommen von `needle` (aus `docNeedleOf`) im Seitentext, auch überlappende.
 * Leerraum zählt nicht, ein Trennstrich am Zeilenende auch nicht: PDF.js liefert den
 * Seitentext in Stücken, zwischen denen ein Leerzeichen oder Zeilenumbruch fehlen oder
 * doppelt stehen kann; `lineEnds` sind die Stellen, an denen ein Stück eine Zeile beendet.
 * Lage und Text der Treffer beziehen sich aufs Original, wie die Textebene es braucht.
 */
export function hitsInPage(
  text: string,
  needle: string,
  page: number,
  lineEnds?: ReadonlySet<number>,
): DocHit[] {
  return hitsInKey(searchKeyOf(text, lineEnds), text, needle, page);
}

/** Wie `hitsInPage`, mit schon gebautem Schlüssel der Seite. */
export function hitsInKey(key: SearchKey, text: string, needle: string, page: number): DocHit[] {
  return findInKey(key, needle).map(({ start, end }) => ({
    page,
    start,
    text: text.slice(start, end),
  }));
}
