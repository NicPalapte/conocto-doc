// @-Verweise auf Positionen in Notizen (Entscheidung 0111).
//
// Im Text steht ein Verweis als `@[<Schlüssel>]`. In der Sitzung ist der Schlüssel die
// Knoten-ID, im Speicher und in der Arbeitsstand-Datei der Positions-Hash — wie bei allen
// Notizen (Entscheidung 0055). Umschlüsseln über `rekeyMentions`, an derselben Grenze wie
// `rekey` in lib/annotations.ts. Unbekannte Schlüssel bleiben stehen.
//
// Eine Erwähnung ist nur ein Hinweis im Text, keine Verknüpfung (0072): sie ändert weder
// die Verknüpfungen einer Dokumentstelle noch die Prüfung.

/** Ein Teil eines Notiz-Textes: Text oder Verweis auf eine Position. */
export type MentionPart =
  | { readonly kind: 'text'; readonly text: string }
  | { readonly kind: 'mention'; readonly id: string };

// `]` und Zeilenumbruch beenden den Schlüssel; Knoten-IDs und Hashes enthalten beides nicht.
const TOKEN = /@\[([^\]\n]+)\]/g;

/** Ein Schlüssel, der sich als Verweis schreiben lässt. */
export function canMention(id: string): boolean {
  return id !== '' && !id.includes(']') && !id.includes('\n');
}

/** Der Verweis im Text; Leerzeichen danach setzt der Aufrufer. */
export function mentionToken(id: string): string {
  return `@[${id}]`;
}

export function parseMentions(text: string): MentionPart[] {
  const out: MentionPart[] = [];
  let last = 0;
  for (const match of text.matchAll(TOKEN)) {
    const at = match.index;
    if (at > last) out.push({ kind: 'text', text: text.slice(last, at) });
    out.push({ kind: 'mention', id: match[1] });
    last = at + match[0].length;
  }
  if (last < text.length) out.push({ kind: 'text', text: text.slice(last) });
  return out;
}

/** Erwähnte Positionen, ohne Doppelte, in Reihenfolge des Textes. */
export function mentionedIds(text: string): string[] {
  if (!text.includes('@[')) return [];
  return [...new Set([...text.matchAll(TOKEN)].map((match) => match[1]))];
}

export function hasMention(text: string, id: string): boolean {
  return text.includes(mentionToken(id));
}

/** Schlüssel der Verweise austauschen; Unbekannte bleiben. */
export function rekeyMentions(text: string, keys: ReadonlyMap<string, string>): string {
  if (!text.includes('@[')) return text;
  return text.replace(TOKEN, (token, id: string) => {
    const next = keys.get(id);
    return next === undefined ? token : mentionToken(next);
  });
}

/** Text für Tabelle, Export und Graph-Hinweise: Verweis als „@OZ“. */
export function plainMentions(text: string, ozOf: (id: string) => string | null): string {
  if (!text.includes('@[')) return text;
  return text.replace(TOKEN, (_token, id: string) => `@${ozOf(id) ?? '?'}`);
}

/** Begonnener Verweis direkt vor dem Cursor: „@“ und bis zu 40 Zeichen ohne Umbruch. */
export interface MentionQuery {
  /** Stelle des „@“. */
  readonly start: number;
  readonly query: string;
}

const MAX_QUERY = 40;

/**
 * Tippt man gerade einen Verweis? Das „@“ zählt nur am Anfang oder nach Leerraum oder
 * Klammer, damit E-Mail-Adressen keine Vorschläge öffnen.
 */
export function mentionQueryAt(text: string, cursor: number): MentionQuery | null {
  const before = text.slice(0, cursor);
  const at = before.lastIndexOf('@');
  if (at < 0) return null;
  const query = before.slice(at + 1);
  if (query.length > MAX_QUERY || /[\n[\]]/.test(query)) return null;
  // Höchstens drei Wörter: „@boden“, „@01.02“, „@bodenplatte c30“.
  if (query.split(' ').length > 3) return null;
  const prev = at === 0 ? ' ' : before[at - 1];
  if (!/[\s(]/.test(prev)) return null;
  return { start: at, query };
}

/** Ersetzt den begonnenen Verweis durch den fertigen; gibt Text und neue Cursorstelle. */
export function insertMention(
  text: string,
  cursor: number,
  query: MentionQuery,
  id: string,
): { readonly text: string; readonly cursor: number } {
  const token = `${mentionToken(id)} `;
  const next = text.slice(0, query.start) + token + text.slice(cursor).replace(/^ /, '');
  return { text: next, cursor: query.start + token.length };
}

/** Kandidat für die Vorschlagsliste. */
export interface MentionCandidate {
  readonly id: string;
  readonly oz: string;
  readonly shortText: string;
}

/** Höchstens so viele Vorschläge; mehr passt am Tablet nicht über die Tastatur. */
export const MAX_MENTION_HITS = 6;

const norm = (value: string): string => value.toLocaleLowerCase('de');

/**
 * Passende Positionen: erst OZ, die mit der Eingabe beginnt, dann OZ, die sie enthält,
 * dann Kurztext mit allen Wörtern der Eingabe. Leere Eingabe: keine Vorschläge.
 */
export function mentionCandidates(
  candidates: Iterable<MentionCandidate>,
  query: string,
  limit: number = MAX_MENTION_HITS,
): MentionCandidate[] {
  const q = norm(query.trim());
  if (q === '') return [];
  const words = q.split(/\s+/);
  const starts: MentionCandidate[] = [];
  const inOz: MentionCandidate[] = [];
  const inText: MentionCandidate[] = [];
  for (const candidate of candidates) {
    const oz = norm(candidate.oz);
    if (oz.startsWith(q)) starts.push(candidate);
    else if (oz.includes(q)) inOz.push(candidate);
    else {
      const text = norm(candidate.shortText);
      if (words.every((word) => text.includes(word))) inText.push(candidate);
    }
    if (starts.length >= limit) break;
  }
  return [...starts, ...inOz, ...inText].slice(0, limit);
}
