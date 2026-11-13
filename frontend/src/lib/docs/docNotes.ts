// Eigene Notizen in Begleitdokumenten (PDF) zur letzten Datei (Entscheidung 0072):
// angestrichene Textstellen und ihre Verknüpfung mit Positionen.
//
// Eine Stelle ist Dokument + Seite + Lage im Seitentext + angestrichener Text — wie
// die Anstreichung im Langtext (Entscheidung 0063). Sie trägt eine Farbe, eine
// Verknüpfung mit Positionen oder beides. Verknüpft wird von Hand oder per Klick auf
// einen Vorschlag (OZ oder Menge, Entscheidung 0080); woher eine Verknüpfung kam, steht
// in `sources`. Abgelehnte Vorschläge stehen in `rejected`, damit sie nicht wiederkommen.
// Ausgeblendete Arten von Vorschlag stehen in `hidden` (Entscheidung 0087): Sie gelten für
// dieses LV, ein neues LV beginnt mit allen.
//
// Das Dokument selbst wird nicht gespeichert, nur seine Kennung (SHA-256 der Bytes)
// und sein Name. Positionen stehen in der Sitzung unter der Knoten-ID, im Speicher
// unter dem Positions-Hash (Entscheidung 0055) — wie alle Notizen (`rekeyDocNotes`).
//
// Reine Funktionen über einem unveränderlichen Wert; Zeitpunkte kommen von außen.

import { isDocKind, type DocKind } from '@core';
import { isPaint, MAX_PAINT_LENGTH, type Paint } from '../paints';
import { isLinkSource, type DocSuggestion, type LinkSource } from './docSuggest';
import { hasMention, rekeyMentions } from '../mentions';

/** Ein Begleitdokument, das in diesem LV schon einmal offen war. */
export interface DocInfo {
  readonly name: string;
  readonly pages: number;
  /** Von Hand gewählte Dokumentart (Entscheidung 0096); fehlt: die erkannte gilt. */
  readonly kind?: DocKind;
}

/** Wo eine Stelle steht. `page` zählt ab 1; `start` im Textinhalt der Seite. */
export interface DocSpot {
  readonly doc: string;
  readonly page: number;
  readonly start: number;
  readonly text: string;
}

export interface DocMark extends DocSpot {
  /** `null`: nur verknüpft, nicht angestrichen. */
  readonly paint: Paint | null;
  /** Verknüpfte Positionen, ohne Doppelte. */
  readonly links: readonly string[];
  /** Herkunft je Verknüpfung aus einem Vorschlag; von Hand verknüpfte fehlen hier. */
  readonly sources?: Readonly<Record<string, LinkSource>>;
  readonly at: number;
  /** Eigene Notizen an der Stelle, älteste zuerst (Entscheidung 0111); fehlt = keine. */
  readonly comments?: readonly DocComment[];
}

/** Eine Notiz an einer Dokumentstelle; darin `@[id]`-Verweise (lib/mentions.ts). */
export interface DocComment {
  readonly at: number;
  readonly text: string;
}

/** Längste Notiz in Zeichen — eine Notiz, kein Dokument. */
export const MAX_DOC_COMMENT_LENGTH = 4000;

/** Abgelehnter Vorschlag: diese Stelle nicht mit dieser Position (`id`). */
export interface DocRejection extends DocSpot {
  readonly id: string;
  readonly at: number;
}

export interface DocNotes {
  readonly docs: ReadonlyMap<string, DocInfo>;
  /** Nach Dokument, Seite und Lage sortiert. */
  readonly marks: readonly DocMark[];
  /** Abgelehnte Vorschläge (Entscheidung 0080); fehlt, solange es keine gibt. */
  readonly rejected?: readonly DocRejection[];
  /** Ausgeblendete Arten von Vorschlag (0087); leer oder fehlt: alle gezeigt. */
  readonly hidden?: readonly LinkSource[];
}

export const EMPTY_DOC_NOTES: DocNotes = { docs: new Map(), marks: [] };

/** Länge der Dokument-Kennung in Hex-Zeichen — wie die Datei-ID des LV. */
export const DOC_ID_LENGTH = 12;

const sameSpot = (a: DocSpot, b: DocSpot): boolean =>
  a.doc === b.doc && a.page === b.page && a.start === b.start && a.text === b.text;

function order(a: DocMark, b: DocMark): number {
  if (a.doc !== b.doc) return a.doc < b.doc ? -1 : 1;
  return a.page - b.page || a.start - b.start;
}

/**
 * Seite 0 steht für das ganze Dokument (Issue #191, Entscheidung 0099): eine Verknüpfung ohne
 * Textstelle, etwa die AIA mit einer BIM-Position. Anstreichen geht dort nicht.
 */
export const WHOLE_DOC_PAGE = 0;

/** Stelle „ganzes Dokument“ von `doc`. */
export function wholeDocSpot(doc: string): DocSpot {
  return { doc, page: WHOLE_DOC_PAGE, start: 0, text: '' };
}

export function isWholeDoc(spot: DocSpot): boolean {
  return spot.page === WHOLE_DOC_PAGE && spot.start === 0 && spot.text === '';
}

function validSpot(spot: DocSpot): boolean {
  if (isWholeDoc(spot)) return spot.doc !== '';
  return (
    spot.doc !== '' &&
    Number.isInteger(spot.page) &&
    spot.page >= 1 &&
    Number.isInteger(spot.start) &&
    spot.start >= 0 &&
    spot.text.trim() !== '' &&
    spot.text.length <= MAX_PAINT_LENGTH
  );
}

/** Ersetzt die Stelle `spot` durch `next`; `null` entfernt sie. */
function put(notes: DocNotes, spot: DocSpot, next: DocMark | null): DocNotes {
  const rest = notes.marks.filter((mark) => !sameSpot(mark, spot));
  if (next === null) {
    return rest.length === notes.marks.length ? notes : { ...notes, marks: rest };
  }
  return { ...notes, marks: [...rest, next].sort(order) };
}

export function markAt(notes: DocNotes, spot: DocSpot): DocMark | null {
  return notes.marks.find((mark) => sameSpot(mark, spot)) ?? null;
}

/** Merkt sich ein geöffnetes Dokument; ein neuer Name ersetzt den alten, die Art bleibt. */
export function registerDoc(notes: DocNotes, id: string, info: DocInfo): DocNotes {
  const known = notes.docs.get(id);
  const kind = info.kind ?? known?.kind;
  if (known?.name === info.name && known.pages === info.pages && known.kind === kind) {
    return notes;
  }
  const docs = new Map(notes.docs);
  docs.set(id, { name: info.name, pages: info.pages, ...(kind === undefined ? {} : { kind }) });
  return { ...notes, docs };
}

/** Dokumentart von Hand setzen; `null` nimmt die Wahl weg (dann gilt die erkannte). */
export function setDocKind(notes: DocNotes, id: string, kind: DocKind | null): DocNotes {
  const known = notes.docs.get(id);
  if (known === undefined || (known.kind ?? null) === kind) return notes;
  const docs = new Map(notes.docs);
  docs.set(id, {
    name: known.name,
    pages: known.pages,
    ...(kind === null ? {} : { kind }),
  });
  return { ...notes, docs };
}

/** Streicht eine Stelle an; ist sie schon verknüpft, behält sie ihre Verknüpfungen. */
export function paintDocMark(notes: DocNotes, spot: DocSpot, paint: Paint, at: number): DocNotes {
  if (!validSpot(spot) || isWholeDoc(spot)) return notes;
  const known = markAt(notes, spot);
  if (known?.paint === paint) return notes;
  return put(
    notes,
    spot,
    withSources(
      { ...spotOf(spot), paint, links: known?.links ?? [], at, ...commentsOf(known) },
      known?.sources,
    ),
  );
}

/** Nimmt die Farbe weg; eine verknüpfte Stelle bleibt als Verknüpfung stehen. */
export function unpaintDocMark(notes: DocNotes, spot: DocSpot): DocNotes {
  const known = markAt(notes, spot);
  if (known === null || known.paint === null) return notes;
  return put(
    notes,
    spot,
    isEmptyMark({ ...known, paint: null }) ? null : { ...known, paint: null },
  );
}

/** Ohne Farbe, Verknüpfung und Notiz bleibt von einer Stelle nichts. */
function isEmptyMark(mark: DocMark): boolean {
  return mark.paint === null && mark.links.length === 0 && (mark.comments ?? []).length === 0;
}

/** Herkunft nur für verknüpfte Positionen; leer fällt das Feld weg. Notizen bleiben. */
function withSources(
  mark: DocMark,
  sources: Readonly<Record<string, LinkSource>> | undefined,
): DocMark {
  const own: Record<string, LinkSource> = {};
  for (const id of mark.links) {
    const source = sources?.[id];
    if (source !== undefined) own[id] = source;
  }
  const base: DocMark = {
    doc: mark.doc,
    page: mark.page,
    start: mark.start,
    text: mark.text,
    paint: mark.paint,
    links: mark.links,
    at: mark.at,
    ...((mark.comments ?? []).length === 0 ? {} : { comments: mark.comments }),
  };
  return Object.keys(own).length === 0 ? base : { ...base, sources: own };
}

/**
 * Verknüpft eine Stelle mit Positionen; legt sie an, wenn es sie noch nicht gibt.
 * `source`: aus einem Vorschlag übernommen (Entscheidung 0080), sonst von Hand.
 */
export function linkDocMark(
  notes: DocNotes,
  spot: DocSpot,
  ids: readonly string[],
  at: number,
  source?: LinkSource,
): DocNotes {
  if (!validSpot(spot) || ids.length === 0) return notes;
  const known = markAt(notes, spot);
  const links = [...new Set([...(known?.links ?? []), ...ids])];
  if (known !== null && links.length === known.links.length) return notes;
  const sources: Record<string, LinkSource> = { ...known?.sources };
  if (source !== undefined)
    for (const id of ids) if (!known?.links.includes(id)) sources[id] = source;
  return put(
    notes,
    spot,
    withSources(
      {
        ...spotOf(spot),
        paint: known?.paint ?? null,
        links,
        at: known?.at ?? at,
        ...commentsOf(known),
      },
      sources,
    ),
  );
}

function commentsOf(mark: DocMark | null): { comments?: readonly DocComment[] } {
  const comments = mark?.comments ?? [];
  return comments.length === 0 ? {} : { comments };
}

/** Hängt eine Notiz an die Stelle; legt sie ohne Farbe an, wenn es sie noch nicht gibt. */
export function addDocComment(notes: DocNotes, spot: DocSpot, text: string, at: number): DocNotes {
  const trimmed = text.trim();
  if (!validSpot(spot) || trimmed === '' || trimmed.length > MAX_DOC_COMMENT_LENGTH) return notes;
  const known = markAt(notes, spot);
  const comments = [...(known?.comments ?? []), { at, text: trimmed }];
  const base: DocMark = known ?? { ...spotOf(spot), paint: null, links: [], at };
  return put(notes, spot, withSources({ ...base, comments }, base.sources));
}

/** Entfernt die Notiz an Stelle `position`; bleibt nichts, fällt die Stelle weg. */
export function removeDocComment(notes: DocNotes, spot: DocSpot, position: number): DocNotes {
  const known = markAt(notes, spot);
  const comments = known?.comments ?? [];
  if (known === null || position < 0 || position >= comments.length) return notes;
  const next: DocMark = { ...known, comments: comments.filter((_, i) => i !== position) };
  return put(notes, spot, isEmptyMark(next) ? null : withSources(next, known.sources));
}

/** Stellen mit eigener Notiz. */
export function commentedMarks(notes: DocNotes): DocMark[] {
  return notes.marks.filter((mark) => (mark.comments ?? []).length > 0);
}

/** Notizen in Dokumenten, die die Position `id` erwähnen, mit ihrer Stelle. */
export function docMentionsOf(
  notes: DocNotes,
  id: string,
): Array<{ readonly mark: DocMark; readonly comment: DocComment }> {
  const out: Array<{ mark: DocMark; comment: DocComment }> = [];
  for (const mark of notes.marks) {
    for (const comment of mark.comments ?? []) {
      if (hasMention(comment.text, id)) out.push({ mark, comment });
    }
  }
  return out;
}

/** Löst die Verknüpfung mit einer Position; ohne Farbe und Verknüpfung fällt die Stelle weg. */
export function unlinkDocMark(notes: DocNotes, spot: DocSpot, id: string): DocNotes {
  const known = markAt(notes, spot);
  if (known === null || !known.links.includes(id)) return notes;
  const links = known.links.filter((link) => link !== id);
  return put(
    notes,
    spot,
    isEmptyMark({ ...known, links }) ? null : withSources({ ...known, links }, known.sources),
  );
}

const sameRejection = (a: DocRejection, b: DocSpot & { id: string }): boolean =>
  sameSpot(a, b) && a.id === b.id;

/** Merkt sich einen abgelehnten Vorschlag: Stelle `spot` gehört nicht zu `id`. */
export function rejectSuggestion(notes: DocNotes, spot: DocSpot, id: string, at: number): DocNotes {
  if (!validSpot(spot) || id === '') return notes;
  const rejected = notes.rejected ?? [];
  if (rejected.some((entry) => sameRejection(entry, { ...spot, id }))) return notes;
  return { ...notes, rejected: [...rejected, { ...spotOf(spot), id, at }] };
}

/** Wurde dieser Vorschlag schon abgelehnt? */
export function isRejected(notes: DocNotes, spot: DocSpot, id: string): boolean {
  return (notes.rejected ?? []).some((entry) => sameRejection(entry, { ...spot, id }));
}

/** Welche Arten von Vorschlag gezeigt werden. */
export function shownSuggestions(notes: DocNotes): Record<LinkSource, boolean> {
  const hidden = notes.hidden ?? [];
  return {
    oz: !hidden.includes('oz'),
    menge: !hidden.includes('menge'),
    beton: !hidden.includes('beton'),
    text: !hidden.includes('text'),
  };
}

/** Eine Art von Vorschlag zeigen oder ausblenden. */
export function showSuggestions(notes: DocNotes, source: LinkSource, on: boolean): DocNotes {
  const hidden = notes.hidden ?? [];
  if (hidden.includes(source) !== on) return notes;
  return { ...notes, hidden: on ? hidden.filter((item) => item !== source) : [...hidden, source] };
}

/** Abgelehnte Vorschläge zu einer Position, für die Notiz-Datei. */
export function rejectionsOfPosition(notes: DocNotes, id: string): DocRejection[] {
  return (notes.rejected ?? []).filter((entry) => entry.id === id);
}

/** Stellen einer Seite. */
export function marksOnPage(notes: DocNotes, doc: string, page: number): DocMark[] {
  return notes.marks.filter((mark) => mark.doc === doc && mark.page === page);
}

/** Stellen, die mit einer Position verknüpft sind. */
export function marksOfPosition(notes: DocNotes, id: string): DocMark[] {
  return notes.marks.filter((mark) => mark.links.includes(id));
}

/** Texte der verknüpften Stellen je Position (ohne „ganzes Dokument“), für die Betonsorten. */
export function linkedTextsOf(notes: DocNotes): (id: string) => readonly string[] {
  const byId = new Map<string, string[]>();
  for (const mark of notes.marks) {
    if (isWholeDoc(mark)) continue;
    for (const id of mark.links) {
      const list = byId.get(id);
      if (list === undefined) byId.set(id, [mark.text]);
      else list.push(mark.text);
    }
  }
  return (id) => byId.get(id) ?? [];
}

/** Positionen mit mindestens einer verknüpften Stelle. */
export function linkedIds(notes: DocNotes): Set<string> {
  const out = new Set<string>();
  for (const mark of notes.marks) for (const id of mark.links) out.add(id);
  return out;
}

/** Stellen eines Dokuments, nach Seite und Lage. */
export function marksOfDoc(notes: DocNotes, doc: string): DocMark[] {
  return notes.marks.filter((mark) => mark.doc === doc);
}

/**
 * Nächste (`step` 1) oder vorige (-1) Stelle in `marks` (Lesereihenfolge). Ohne letzte Wahl
 * (`from` `null`) zählt die Seite `page`: vor zur ersten Stelle ab dieser Seite, zurück zur
 * letzten davor. Am Ende geht es von vorn weiter. `null`, wenn es keine Stelle gibt.
 */
/** Die Stellen zum Durchblättern: ohne das ganze Dokument, das keine Stelle im Text hat. */
export function steppableMarks<T extends DocSpot>(marks: readonly T[]): T[] {
  return marks.filter((mark) => !isWholeDoc(mark));
}

export function nextMarkIndex(
  marks: readonly DocSpot[],
  page: number,
  from: number | null,
  step: 1 | -1,
): number | null {
  const count = marks.length;
  if (count === 0) return null;
  if (from !== null) return (from + step + count) % count;
  const ahead = marks.findIndex((mark) => mark.page >= page);
  const start = ahead === -1 ? count : ahead;
  return step === 1 ? start % count : (start - 1 + count) % count;
}

function spotOf(spot: DocSpot): DocSpot {
  return { doc: spot.doc, page: spot.page, start: spot.start, text: spot.text };
}

function rekeyComments(mark: DocMark, keys: ReadonlyMap<string, string>): DocMark {
  const comments = mark.comments ?? [];
  if (comments.length === 0) return mark;
  return {
    ...mark,
    comments: comments.map((comment) => ({ ...comment, text: rekeyMentions(comment.text, keys) })),
  };
}

/** Schlüssel der Verknüpfungen und @-Verweise austauschen; Unbekannte bleiben (wie `rekey`). */
export function rekeyDocNotes(notes: DocNotes, keys: ReadonlyMap<string, string>): DocNotes {
  const rejected = notes.rejected ?? [];
  if (notes.marks.length === 0 && rejected.length === 0) return notes;
  const key = (id: string): string => keys.get(id) ?? id;
  const out: DocNotes = {
    ...notes,
    marks: notes.marks.map((raw) => {
      const mark = rekeyComments(raw, keys);
      if (mark.links.length === 0) return mark;
      const links = [...new Set(mark.links.map(key))];
      if (mark.sources === undefined) return { ...mark, links };
      const sources: Record<string, LinkSource> = {};
      for (const [id, source] of Object.entries(mark.sources)) sources[key(id)] = source;
      return withSources({ ...mark, links }, sources);
    }),
  };
  return rejected.length === 0
    ? out
    : { ...out, rejected: rejected.map((entry) => ({ ...entry, id: key(entry.id) })) };
}

/** Notizen vereinigen, gleiche (Zeit + Text) einmal, nach Zeit; `null`: nichts Neues. */
function mergeComments(
  own: readonly DocComment[],
  more: readonly DocComment[],
): DocComment[] | null {
  const seen = new Set(own.map((comment) => `${comment.at}\u0000${comment.text}`));
  const added = more.filter((comment) => !seen.has(`${comment.at}\u0000${comment.text}`));
  if (added.length === 0) return null;
  return [...own, ...added].sort((a, b) => a.at - b.at);
}

/** Stellen aus einer Notiz-Datei dazunehmen: Farbe aus `more`, Verknüpfungen und Notizen vereinigt. */
export function mergeDocNotes(notes: DocNotes, more: DocNotes): DocNotes {
  let out = notes;
  for (const [id, info] of more.docs) {
    const known = out.docs.get(id);
    if (known === undefined) out = registerDoc(out, id, info);
    // Eigene Wahl der Art bleibt; die Datei bringt nur eine, wo noch keine steht.
    else if (known.kind === undefined && info.kind !== undefined) {
      out = setDocKind(out, id, info.kind);
    }
  }
  for (const entry of more.rejected ?? []) out = rejectSuggestion(out, entry, entry.id, entry.at);
  if (more.marks.length === 0) return out;
  // Einmal über eine Tabelle statt Stelle für Stelle über `put`: Notiz-Dateien und der
  // Speicher können viele Stellen bringen, und `put` sortiert jedes Mal alles neu.
  const keyOf = (spot: DocSpot): string =>
    `${spot.doc}\u0000${spot.page}\u0000${spot.start}\u0000${spot.text}`;
  const byKey = new Map(out.marks.map((mark) => [keyOf(mark), mark]));
  let changed = false;
  for (const mark of more.marks) {
    if (!validSpot(mark)) continue;
    const key = keyOf(mark);
    let known = byKey.get(key) ?? null;
    if (mark.paint !== null && known?.paint !== mark.paint) {
      known = withSources(
        {
          ...spotOf(mark),
          paint: mark.paint,
          links: known?.links ?? [],
          at: mark.at,
          ...commentsOf(known),
        },
        known?.sources,
      );
      byKey.set(key, known);
      changed = true;
    }
    const comments = mergeComments(known?.comments ?? [], mark.comments ?? []);
    if (comments !== null) {
      const base: DocMark = known ?? { ...spotOf(mark), paint: null, links: [], at: mark.at };
      known = withSources({ ...base, comments }, base.sources);
      byKey.set(key, known);
      changed = true;
    }
    if (mark.links.length === 0) continue;
    const links = [...new Set([...(known?.links ?? []), ...mark.links])];
    if (known !== null && links.length === known.links.length) continue;
    // Bekannte Herkunft bleibt; neue Verknüpfungen bringen ihre mit.
    byKey.set(
      key,
      withSources(
        {
          ...spotOf(mark),
          paint: known?.paint ?? null,
          links,
          at: known?.at ?? mark.at,
          ...commentsOf(known),
        },
        { ...mark.sources, ...known?.sources },
      ),
    );
    changed = true;
  }
  return changed ? { ...out, marks: [...byKey.values()].sort(order) } : out;
}

/** Form für IndexedDB und Notiz-Datei: Arrays statt Map. */
export interface StoredDocNotes {
  readonly docs: ReadonlyArray<readonly [string, DocInfo]>;
  readonly marks: readonly DocMark[];
  /** Seit 0080; ältere Fassungen lesen das Feld nicht und behalten den Rest. */
  readonly rejected?: readonly DocRejection[];
  /** Seit 0087, ebenso. */
  readonly hidden?: readonly LinkSource[];
}

export function toStoredDocNotes(notes: DocNotes): StoredDocNotes {
  const rejected = notes.rejected ?? [];
  const hidden = notes.hidden ?? [];
  return {
    docs: [...notes.docs],
    marks: notes.marks,
    ...(rejected.length === 0 ? {} : { rejected }),
    ...(hidden.length === 0 ? {} : { hidden }),
  };
}

/** Eine Stelle aus Speicher oder Notiz-Datei; Unbrauchbares wird `null`. */
export function toDocMark(value: unknown): DocMark | null {
  if (typeof value !== 'object' || value === null) return null;
  const raw = value as Record<string, unknown>;
  const { doc, page, start, text, paint } = raw;
  if (typeof doc !== 'string' || typeof text !== 'string') return null;
  if (typeof page !== 'number' || typeof start !== 'number') return null;
  const spot = { doc, page, start, text };
  if (!validSpot(spot)) return null;
  const links = Array.isArray(raw.links)
    ? [...new Set(raw.links.filter((id): id is string => typeof id === 'string' && id !== ''))]
    : [];
  const ownPaint = isPaint(paint) && !isWholeDoc(spot) ? paint : null;
  const comments = toDocComments(raw.comments);
  if (ownPaint === null && links.length === 0 && comments.length === 0) return null;
  const at = typeof raw.at === 'number' && Number.isFinite(raw.at) ? raw.at : 0;
  const sources: Record<string, LinkSource> = {};
  if (typeof raw.sources === 'object' && raw.sources !== null) {
    for (const [id, source] of Object.entries(raw.sources)) {
      if (isLinkSource(source)) sources[id] = source;
    }
  }
  return withSources(
    { ...spot, paint: ownPaint, links, at, ...(comments.length === 0 ? {} : { comments }) },
    sources,
  );
}

/** Notizen einer Stelle aus Speicher oder Datei; Unbrauchbares fällt weg. */
export function toDocComments(value: unknown): DocComment[] {
  if (!Array.isArray(value)) return [];
  const out: DocComment[] = [];
  for (const item of value as unknown[]) {
    if (typeof item !== 'object' || item === null) continue;
    const raw = item as Record<string, unknown>;
    if (typeof raw.text !== 'string') continue;
    const text = raw.text.trim();
    if (text === '' || text.length > MAX_DOC_COMMENT_LENGTH) continue;
    const at = typeof raw.at === 'number' && Number.isFinite(raw.at) ? raw.at : 0;
    out.push({ at, text });
  }
  return out.sort((a, b) => a.at - b.at);
}

/** Ein abgelehnter Vorschlag aus Speicher oder Notiz-Datei; Unbrauchbares wird `null`. */
export function toDocRejection(value: unknown): DocRejection | null {
  if (typeof value !== 'object' || value === null) return null;
  const raw = value as Record<string, unknown>;
  const { doc, page, start, text, id } = raw;
  if (typeof doc !== 'string' || typeof text !== 'string' || typeof id !== 'string') return null;
  if (typeof page !== 'number' || typeof start !== 'number' || id === '') return null;
  const spot = { doc, page, start, text };
  if (!validSpot(spot)) return null;
  const at = typeof raw.at === 'number' && Number.isFinite(raw.at) ? raw.at : 0;
  return { ...spot, id, at };
}

function toDocInfo(value: unknown): DocInfo | null {
  if (typeof value !== 'object' || value === null) return null;
  const raw = value as Record<string, unknown>;
  if (typeof raw.name !== 'string') return null;
  const pages = typeof raw.pages === 'number' && Number.isInteger(raw.pages) ? raw.pages : 0;
  const info = { name: raw.name, pages: Math.max(0, pages) };
  return isDocKind(raw.kind) ? { ...info, kind: raw.kind } : info;
}

/** Liest die gespeicherte Form; fehlt sie oder ist kaputt, gibt es keine Stellen. */
export function fromStoredDocNotes(value: unknown): DocNotes {
  if (typeof value !== 'object' || value === null) return EMPTY_DOC_NOTES;
  const raw = value as Record<string, unknown>;
  const docs = new Map<string, DocInfo>();
  if (Array.isArray(raw.docs)) {
    for (const entry of raw.docs) {
      if (!Array.isArray(entry) || typeof entry[0] !== 'string') continue;
      const info = toDocInfo(entry[1]);
      if (info !== null) docs.set(entry[0], info);
    }
  }
  let notes: DocNotes = { docs, marks: [] };
  if (Array.isArray(raw.marks)) {
    const marks = raw.marks.map(toDocMark).filter((mark): mark is DocMark => mark !== null);
    // Über `mergeDocNotes`, damit doppelte Stellen zu einer werden.
    notes = mergeDocNotes(notes, { docs: new Map(), marks });
  }
  if (Array.isArray(raw.rejected)) {
    const rejected = raw.rejected
      .map(toDocRejection)
      .filter((entry): entry is DocRejection => entry !== null);
    notes = mergeDocNotes(notes, { docs: new Map(), marks: [], rejected });
  }
  if (Array.isArray(raw.hidden)) {
    for (const source of raw.hidden) {
      if (isLinkSource(source)) notes = showSuggestions(notes, source, false);
    }
  }
  const empty = notes.docs.size === 0 && notes.marks.length === 0;
  const plain = (notes.rejected ?? []).length === 0 && (notes.hidden ?? []).length === 0;
  return empty && plain ? EMPTY_DOC_NOTES : notes;
}

/** Stelle im Seitentext wiederfinden: erst an ihrer Lage, sonst irgendwo auf der Seite. */
export function locateOnPage(text: string, spot: Pick<DocSpot, 'start' | 'text'>): number {
  if (text.slice(spot.start, spot.start + spot.text.length) === spot.text) return spot.start;
  return text.indexOf(spot.text);
}

/**
 * Vorschläge, die noch offen sind: Art eingeschaltet, nicht abgelehnt und die Position
 * nicht schon an einer Stelle verknüpft, die den Vorschlag berührt (Entscheidung 0080).
 */
export function pendingSuggestions(
  notes: DocNotes,
  doc: string,
  list: readonly DocSuggestion[],
  enabled: Readonly<Record<LinkSource, boolean>>,
): DocSuggestion[] {
  if (list.length === 0) return [];
  const marks = marksOfDoc(notes, doc);
  return list.filter((item) => {
    if (!enabled[item.source]) return false;
    const spot = { doc, page: item.page, start: item.start, text: item.text };
    if (isRejected(notes, spot, item.id)) return false;
    const end = item.start + item.text.length;
    return !marks.some(
      (mark) =>
        mark.page === item.page &&
        mark.links.includes(item.id) &&
        mark.start < end &&
        mark.start + mark.text.length > item.start,
    );
  });
}
