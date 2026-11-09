// Suchschlüssel für die eine Suche über LV und Begleit-PDFs (Entscheidung 0103): klein,
// ohne Leerraum, ohne weiches Trennzeichen und ohne Trennstrich am Zeilenende. So findet
// dieselbe Eingabe im LV und im PDF dasselbe — auch wo PDF.js die Zeilen ohne Leerzeichen
// aneinanderhängt („14Monate“) oder ein Wort über den Zeilenumbruch getrennt ist
// („Stahl-“ / „beton“). Jedes Zeichen des Schlüssels kennt seine Stelle im Original, damit
// Treffer dort hervorgehoben werden können. Der Originaltext bleibt unverändert: an seinen
// Zeichenstellen hängen gespeicherte PDF-Stellen.

/** Schlüssel eines Textes und für jedes Schlüsselzeichen seine Stelle im Original. */
export interface SearchKey {
  readonly key: string;
  readonly at: readonly number[];
}

/** Ein Treffer im Original: `start` bis ausschließlich `end`. */
export interface SearchRange {
  readonly start: number;
  readonly end: number;
}

const SOFT_HYPHEN = '\u00ad';
/** Bindestrich, Trennstrich (U+2010) und geschützter Bindestrich (U+2011). */
const HYPHENS = new Set(['-', '\u2010', '\u2011']);
const LINE_BREAK = /[\n\r\u2028\u2029]/;
const SPACE = /\s/;

/**
 * Steht nach dem Trennstrich an `i` ein Zeilenende? Entweder ein Zeilenumbruch im Text
 * (nach höchstens Leerraum) oder eine Stelle aus `lineEnds` — PDF.js meldet Zeilenenden
 * als Eigenschaft eines Textstücks, nicht als Zeichen.
 */
function endsLine(text: string, i: number, lineEnds: ReadonlySet<number> | undefined): boolean {
  for (let k = i + 1; k <= text.length; k++) {
    if (lineEnds?.has(k) === true) return true;
    if (k === text.length) return false;
    const char = text[k];
    if (LINE_BREAK.test(char)) return true;
    if (!SPACE.test(char)) return false;
  }
  return false;
}

/**
 * Schlüssel von `text`. `lineEnds`: Stellen im Text, an denen eine Zeile endet, ohne dass
 * dort ein Umbruchzeichen steht (Ende eines PDF.js-Stücks mit `hasEOL`).
 */
export function searchKeyOf(text: string, lineEnds?: ReadonlySet<number>): SearchKey {
  let key = '';
  const at: number[] = [];
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (SPACE.test(char) || char === SOFT_HYPHEN) continue;
    if (HYPHENS.has(char) && endsLine(text, i, lineEnds)) continue;
    // `toLowerCase` kann ein Zeichen verlängern („İ“); jede Hälfte zeigt aufs Original.
    // Je UTF-16-Einheit, wie `indexOf` zählt — auch bei Emoji (Surrogatpaaren).
    const lower = char.toLowerCase();
    for (let k = 0; k < lower.length; k++) {
      key += lower[k];
      at.push(i);
    }
  }
  return { key, at };
}

/** Der Suchbegriff als Schlüssel; leer, wenn kürzer als `min` Zeichen. */
export function searchNeedleOf(search: string, min = 1): string {
  const needle = searchKeyOf(search).key;
  return needle.length >= min ? needle : '';
}

/** Alle Vorkommen von `needle` (aus `searchNeedleOf`), auch überlappende, im Original. */
export function findInKey(source: SearchKey, needle: string): SearchRange[] {
  if (needle === '') return [];
  const out: SearchRange[] = [];
  for (let i = source.key.indexOf(needle); i >= 0; i = source.key.indexOf(needle, i + 1)) {
    out.push({ start: source.at[i], end: source.at[i + needle.length - 1] + 1 });
  }
  return out;
}
