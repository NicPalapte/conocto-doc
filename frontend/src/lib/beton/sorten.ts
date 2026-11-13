// Betonsortenliste (Entscheidung 0104): Betonpositionen nach Sorte bündeln und je
// Sorte zeigen, welche Angaben zur Festlegung des Betons im LV stehen.
//
// Sorte = Druckfestigkeitsklasse + Expositionsklassen + Feuchtigkeitsklasse, so wie
// sie wörtlich im Text stehen (rulesets/normklassen.ts). Nichts wird abgeleitet:
// fehlt eine Angabe, ist das ein Hinweis, kein Urteil. Bewehrung (in Position,
// gesondert) wertet die Liste bewusst nicht aus, nur Stahl / Matten / Fasern.
//
// Fehlt eine Angabe im LV, steht aber in einer verknüpften Stelle eines Begleitdokuments,
// zählt sie als „fehlt im LV“ (Entscheidung 0106): weiter fehlend, aber mit Fundstelle.
//
// Reine Funktionen über dem flachen Positions-Index, einmal je Filterwechsel.

import { attrString, attrStrings } from '../attributes';
import { materialKatalog } from '../classify/material/katalog';
import { extractBetonklassen } from '../classify/rulesets/normklassen';
import { canonicalUnit, unitLabel } from '../units';
import { sortExpo, sorteKeyOf } from './sorteKey';
import type { PositionIndex } from '../index/positionIndex';
import { istFestigkeitsklasse } from './festigkeitsklassen';
import type { PositionSummary } from '../../types/lvNode';

/** Sammelsorte für Betonpositionen in m³ ohne Druckfestigkeitsklasse. */
export const OHNE_KLASSE = 'Ohne Festigkeitsklasse';

/**
 * Angaben zur Festlegung des Betons nach DIN EN 206 / DIN 1045-2, die die Liste
 * prüft. Feuchtigkeitsklasse ist eine deutsche Ergänzung aus DIN 1045-2.
 */
export const PFLICHTANGABEN = [
  { key: 'beton', label: 'Druckfestigkeitsklasse' },
  { key: 'expo', label: 'Expositionsklassen' },
  { key: 'feuchtigkeitsklasse', label: 'Feuchtigkeitsklasse' },
  { key: 'chloridklasse', label: 'Chloridgehaltsklasse' },
  { key: 'groesstkorn', label: 'Größtkorn' },
  { key: 'konsistenz', label: 'Konsistenz' },
] as const;

export type PflichtKey = (typeof PFLICHTANGABEN)[number]['key'];

export { sortExpo } from './sorteKey';

interface BetonKeys {
  readonly name: string;
  readonly bauweise: string | null;
  readonly stahlFasern: string | null;
}

let keys: BetonKeys | null | undefined;

/** Attribut-Keys aus der Materialtabelle; `null`, wenn es keine Betontabelle gibt. */
function betonKeys(): BetonKeys | null {
  if (keys !== undefined) return keys;
  const beton = materialKatalog().find((material) => material.id === 'beton');
  keys =
    beton === undefined
      ? null
      : {
          name: beton.name,
          bauweise: beton.merkmale.find((m) => m.name === 'Bauweise')?.key ?? null,
          stahlFasern: beton.merkmale.find((m) => m.name === 'Stahl/Fasern')?.key ?? null,
        };
  return keys;
}

function isBeton(position: PositionSummary): boolean {
  const beton = betonKeys();
  return beton !== null && attrStrings(position.attributes, 'material').includes(beton.name);
}

/**
 * Sorte einer Position als Anzeigetext („C30/37 · XC4, XF1 · WF"), zugleich Filterwert.
 * Betonpositionen in m³ ohne Klasse landen in `OHNE_KLASSE`; andere ohne Klasse
 * (Schalung, Fugen …) gehören in keine Sorte.
 */
export function betonSorteOf(position: PositionSummary): string | null {
  const festigkeit = attrString(position.attributes, 'beton');
  if (festigkeit === null) {
    return isBeton(position) && canonicalUnit(position.unit) === 'm3' ? OHNE_KLASSE : null;
  }
  return sorteKeyOf(
    festigkeit,
    attrStrings(position.attributes, 'expo'),
    attrStrings(position.attributes, 'feuchtigkeitsklasse'),
  );
}

export interface Angabe {
  readonly key: PflichtKey;
  readonly label: string;
  /** Gefundene Werte über alle Positionen der Sorte. */
  readonly werte: readonly string[];
  /** Positionen der Sorte ohne diese Angabe im LV. */
  readonly fehlt: number;
  /** Werte aus verknüpften Dokumentstellen der Positionen, denen die Angabe im LV fehlt. */
  readonly imDokument: readonly string[];
  /** Davon: Positionen, bei denen die Angabe nur im Dokument steht. */
  readonly nurImDokument: number;
}

/** Texte der verknüpften Dokumentstellen einer Position (Knoten-ID). */
export type DocTexts = (nodeId: string) => readonly string[];

const NO_DOC_TEXTS: DocTexts = () => [];

/** Angaben, die in Texten aus Begleitdokumenten stehen. */
// Druckfestigkeitsklasse wie in `normklassen.ts`, auf kleingeschriebenem Text.
const FESTIGKEIT = /\b(?:lc|c)\s?\d{1,3}\/\d{1,3}\b/g;

/**
 * Teile einer Stelle, die zur Festigkeit der Position gehören: ab ihrer Klasse bis zur
 * nächsten. Ohne Festigkeitsklasse in der Stelle gilt die ganze Stelle; nennt sie nur
 * andere, gilt nichts (Review #228: eine Tabellenzeile mit zwei Sorten mischt sonst Werte).
 */
function teileZur(text: string, festigkeit: string | null): string[] {
  const lower = text.toLowerCase();
  const matches = [...lower.matchAll(FESTIGKEIT)].filter((match) => istFestigkeitsklasse(match[0]));
  if (matches.length === 0) return [lower];
  const eigene = festigkeit?.toLowerCase().replace(/\s+/g, '') ?? null;
  return matches
    .filter((match) => match[0].replace(/\s+/g, '') === eigene)
    .map((match) => {
      const next = matches.find((other) => other.index > match.index);
      return lower.slice(match.index, next?.index ?? lower.length);
    });
}

function dokumentWerte(
  texts: readonly string[],
  festigkeit: string | null,
): Map<PflichtKey, string[]> {
  const out = new Map<PflichtKey, string[]>();
  for (const text of texts.flatMap((entry) => teileZur(entry, festigkeit))) {
    const klassen = extractBetonklassen(text);
    const found: Record<PflichtKey, readonly string[]> = {
      beton: klassen.beton === null ? [] : [klassen.beton],
      expo: klassen.expo,
      feuchtigkeitsklasse: klassen.feuchtigkeitsklasse,
      chloridklasse: klassen.chloridklasse,
      groesstkorn: klassen.groesstkorn,
      konsistenz: klassen.konsistenz,
    };
    for (const { key } of PFLICHTANGABEN) {
      if (found[key].length === 0) continue;
      const list = out.get(key) ?? [];
      addAll(list, found[key]);
      out.set(key, list);
    }
  }
  return out;
}

export interface SortePosition {
  /** Eintrag im Positions-Index. */
  readonly entry: number;
  readonly nodeId: string;
  readonly oz: string;
  readonly shortText: string;
  readonly quantity: number | null;
  readonly unit: string | null;
  /** Labels der fehlenden Angaben. */
  readonly fehlt: readonly string[];
}

export interface Menge {
  /** Vergleichsschlüssel der Einheit; `null` = ohne Einheit. */
  readonly unit: string | null;
  readonly label: string;
  readonly sum: number;
}

export interface BetonSorte {
  readonly key: string;
  readonly festigkeit: string | null;
  /** Expositions- und Feuchtigkeitsklassen als Text, leer ohne. */
  readonly klassen: string;
  readonly positions: readonly SortePosition[];
  /** m³ zuerst, dann die übrigen Einheiten nach Summe. */
  readonly mengen: readonly Menge[];
  readonly bauweise: readonly string[];
  readonly stahlFasern: readonly string[];
  readonly angaben: readonly Angabe[];
  /** Summe der fehlenden Angaben über alle Positionen. */
  readonly fehlend: number;
}

export interface BetonSortenListe {
  readonly sorten: readonly BetonSorte[];
  readonly positions: number;
  /** Summe in m³ über alle Sorten. */
  readonly kubik: number;
}

function addAll(target: string[], values: readonly string[]): void {
  for (const value of values) if (!target.includes(value)) target.push(value);
}

function angabeWerte(position: PositionSummary, key: PflichtKey): string[] {
  if (key !== 'beton') return attrStrings(position.attributes, key);
  const festigkeit = attrString(position.attributes, key);
  return festigkeit === null ? [] : [festigkeit];
}

/**
 * Angaben zur Festlegung, die im Text einer Betonposition fehlen (Labels); `null`, wenn die
 * Position zu keiner Sorte gehört. Für die Positionskarte.
 */
export function fehlendeAngabenOf(position: PositionSummary): string[] | null {
  if (betonSorteOf(position) === null) return null;
  return PFLICHTANGABEN.filter(({ key }) => angabeWerte(position, key).length === 0).map(
    ({ label }) => label,
  );
}

interface Acc {
  key: string;
  position: PositionSummary;
  entries: SortePosition[];
  mengen: Map<string | null, number>;
  bauweise: string[];
  stahlFasern: string[];
  werte: Map<PflichtKey, string[]>;
  fehlt: Map<PflichtKey, number>;
  imDokument: Map<PflichtKey, string[]>;
  nurImDokument: Map<PflichtKey, number>;
}

/**
 * Sorten über die Positionen, die `mask` durchlässt (`null` = alle). `docTexts` liefert die
 * verknüpften Dokumentstellen je Position für „fehlt im LV“.
 */
export function buildBetonSorten(
  index: PositionIndex,
  mask: Uint8Array | null,
  docTexts: DocTexts = NO_DOC_TEXTS,
): BetonSortenListe {
  const beton = betonKeys();
  const groups = new Map<string, Acc>();

  for (let i = 0; i < index.size; i++) {
    if (mask !== null && mask[i] !== 1) continue;
    const position = index.positions[i];
    const key = betonSorteOf(position);
    if (key === null) continue;
    let acc = groups.get(key);
    if (acc === undefined) {
      acc = {
        key,
        position,
        entries: [],
        mengen: new Map(),
        bauweise: [],
        stahlFasern: [],
        werte: new Map(),
        fehlt: new Map(),
        imDokument: new Map(),
        nurImDokument: new Map(),
      };
      groups.set(key, acc);
    }
    const fehlt: string[] = [];
    const nodeId = index.nodes[i].id;
    let dokument: Map<PflichtKey, string[]> | null = null;
    for (const { key: angabe, label } of PFLICHTANGABEN) {
      const werte = angabeWerte(position, angabe);
      if (werte.length === 0) {
        fehlt.push(label);
        acc.fehlt.set(angabe, (acc.fehlt.get(angabe) ?? 0) + 1);
        dokument ??= dokumentWerte(docTexts(nodeId), attrString(position.attributes, 'beton'));
        const imDokument = dokument.get(angabe);
        if (imDokument !== undefined) {
          const list = acc.imDokument.get(angabe) ?? [];
          addAll(list, imDokument);
          acc.imDokument.set(angabe, list);
          acc.nurImDokument.set(angabe, (acc.nurImDokument.get(angabe) ?? 0) + 1);
        }
      } else {
        const list = acc.werte.get(angabe) ?? [];
        addAll(list, werte);
        acc.werte.set(angabe, list);
      }
    }
    if (beton?.bauweise != null)
      addAll(acc.bauweise, attrStrings(position.attributes, beton.bauweise));
    if (beton?.stahlFasern != null) {
      addAll(acc.stahlFasern, attrStrings(position.attributes, beton.stahlFasern));
    }
    if (position.quantity !== null) {
      const unit = canonicalUnit(position.unit);
      acc.mengen.set(unit, (acc.mengen.get(unit) ?? 0) + position.quantity);
    }
    acc.entries.push({
      entry: i,
      nodeId,
      oz: position.oz,
      shortText: position.shortText,
      quantity: position.quantity,
      unit: position.unit,
      fehlt,
    });
  }

  const sorten = [...groups.values()].map((acc): BetonSorte => {
    const festigkeit =
      acc.key === OHNE_KLASSE ? null : attrString(acc.position.attributes, 'beton');
    const mengen = [...acc.mengen]
      .map(([unit, sum]) => ({ unit, label: unit === null ? '' : unitLabel(unit), sum }))
      .sort((a, b) => Number(b.unit === 'm3') - Number(a.unit === 'm3') || b.sum - a.sum);
    const angaben = PFLICHTANGABEN.map(({ key, label }) => ({
      key,
      label,
      werte: key === 'expo' ? sortExpo(acc.werte.get(key) ?? []) : (acc.werte.get(key) ?? []),
      fehlt: acc.fehlt.get(key) ?? 0,
      imDokument:
        key === 'expo' ? sortExpo(acc.imDokument.get(key) ?? []) : (acc.imDokument.get(key) ?? []),
      nurImDokument: acc.nurImDokument.get(key) ?? 0,
    }));
    return {
      key: acc.key,
      festigkeit,
      klassen: festigkeit === null ? '' : acc.key.slice(festigkeit.length).replace(/^ · /, ''),
      positions: acc.entries,
      mengen,
      bauweise: acc.bauweise,
      stahlFasern: acc.stahlFasern,
      angaben,
      fehlend: angaben.reduce((sum, angabe) => sum + angabe.fehlt, 0),
    };
  });

  const kubikOf = (sorte: BetonSorte): number =>
    sorte.mengen.find((menge) => menge.unit === 'm3')?.sum ?? 0;
  sorten.sort(
    (a, b) =>
      Number(a.festigkeit === null) - Number(b.festigkeit === null) ||
      kubikOf(b) - kubikOf(a) ||
      b.positions.length - a.positions.length ||
      a.key.localeCompare(b.key, 'de'),
  );

  return {
    sorten,
    positions: sorten.reduce((sum, sorte) => sum + sorte.positions.length, 0),
    kubik: sorten.reduce((sum, sorte) => sum + kubikOf(sorte), 0),
  };
}
