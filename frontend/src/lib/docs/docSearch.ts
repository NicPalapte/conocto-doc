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
  /** Kurzer Ausschnitt um die Fundstelle, für die Liste unter der Suchleiste. */
  readonly around?: string;
}

/** Zeichen links und rechts der Fundstelle im Ausschnitt. */
const AROUND = 32;

/**
 * Ausschnitt um `hit` aus dem Seitentext, Leerraum einfach, Ränder mit „…“. An Zeilenenden
 * (`lineEnds`) steht ein Leerzeichen — PDF.js hängt die Zeilen sonst aneinander.
 */
export function aroundOf(text: string, hit: DocHit, lineEnds?: ReadonlySet<number>): string {
  let from = Math.max(0, hit.start - AROUND);
  const to = Math.min(text.length, hit.start + hit.text.length + AROUND);
  // Am Wortanfang beginnen, nicht mitten im Wort.
  while (from > 0 && from < hit.start && /\S/.test(text[from - 1]) && !lineEnds?.has(from)) {
    from += 1;
  }
  let middle = '';
  for (let i = from; i < to; i++) {
    if (i > from && lineEnds?.has(i) === true) middle += ' ';
    middle += text[i];
  }
  middle = middle.replace(/\s+/g, ' ').trim();
  return `${from > 0 ? '… ' : ''}${middle}${to < text.length ? ' …' : ''}`;
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
