// Maße: Zahl + Einheit **mit Kontext**. Ohne Kontext wäre "30 cm" nur eine Zahl —
// erst das Wort davor ("Dicke", "d =") sagt, was gemessen wurde. Deshalb erkennt
// dieser Extraktor nur benannte Maße und nie eine freistehende Zahl.
//
// Dieselben Muster galten bis WP-J im Fallback-Ruleset (`extractMasse`). Sie
// liegen jetzt hier, weil ein Maß in jedem Gewerk dasselbe bedeutet; die
// Rulesets erben sie, statt sie zu wiederholen.

import { collect, tidy, type Hit } from './spans';
import type { Span } from '../types';
import type { Extractor, ExtractorContext, ExtractorResult } from './types';

/** Längeneinheiten, wie sie in LV-Texten vorkommen. */
const LAENGE_EINHEIT = '(?:mm|cm|dm|m)';
const GEWICHT_EINHEIT = '(?:kg|t|to)';

/** Zahl mit optionaler Nachkommastelle; deutsches Komma ist der Normalfall. */
const ZAHL = '\\d+(?:[.,]\\d+)?';

/**
 * Benanntes Maß: Stichwort, optionales Gleichheits-/Doppelpunktzeichen, Zahl,
 * Einheit. `\s*` statt `\s+` erlaubt "d=30cm" ohne Leerzeichen.
 *
 * Bewusst **ohne** Wortgrenze vor dem Stichwort: deutsche LV-Texte schreiben
 * "Wandstärke 30 cm" und "Plattendicke 24 cm" als Kompositum, eine Wortgrenze
 * würde beides verwerfen.
 */
function named(words: string, einheit: string): RegExp {
  return new RegExp(`(?:${words})\\s*[:=]?\\s*${FUELLWORT}${ZAHL}\\s*${einheit}\\b`, 'gi');
}

/** „Breite von 15 cm“, „Höhe mind. 10 cm“: ein kurzes Wort zwischen Stichwort und Zahl. */
const FUELLWORT = '(?:(?:von|mit|ca\\.|mind\\.|min\\.|max\\.)\\s*)?';

/** Gebeugte Formen: „dick“, „dicke“, „dickem“, „dicken“, „dicker“, „dickes“. */
const GEBEUGT = '(?:e[mnrs]?)?';

/**
 * Kurzform mit Formelzeichen: "d = 30 cm", "h=4m". Das Gleichheits- bzw.
 * Doppelpunktzeichen ist Pflicht — ein einzelnes "d" steckt sonst in jedem
 * zweiten Wort ("wird 30 cm") und erzeugte reihenweise falsche Maße.
 */
function formula(letters: string, einheit: string): RegExp {
  return new RegExp(`\\b(?:${letters})\\s*[:=]\\s*${ZAHL}\\s*${einheit}\\b`, 'gi');
}

/**
 * Nachgestellte Schreibweise: "30 cm dick", "4 m hoch".
 *
 * Der Anker vor der Zahl ist nötig: ohne ihn startet die Suche an jeder Ziffer einer
 * langen Ziffernfolge neu (quadratische Laufzeit, 40.000 Ziffern ≈ 11 s). Die Zahl darf
 * weder mitten in einer Zahl ("1" von "12") noch hinter "Ziffer + Komma/Punkt"
 * ("3" von "1,3") beginnen.
 */
function suffixed(einheit: string, words: string): RegExp {
  return new RegExp(`(?<!\\d)(?<!\\d[.,])${ZAHL}\\s*${einheit}\\s*(?:${words})\\b`, 'gi');
}

interface MassRegel {
  key: string;
  einheit: string;
  patterns: RegExp[];
}

const REGELN: readonly MassRegel[] = [
  {
    key: 'dicke',
    einheit: LAENGE_EINHEIT,
    patterns: [
      named('dicke|dick|stärke|staerke', LAENGE_EINHEIT),
      formula('d', LAENGE_EINHEIT),
      suffixed(LAENGE_EINHEIT, `dick${GEBEUGT}`),
    ],
  },
  {
    key: 'hoehe',
    einheit: LAENGE_EINHEIT,
    patterns: [
      named('höhe|hoehe|hoch', LAENGE_EINHEIT),
      formula('h', LAENGE_EINHEIT),
      suffixed(LAENGE_EINHEIT, `hoch|hohe[mnrs]?`),
    ],
  },
  {
    key: 'laenge',
    einheit: LAENGE_EINHEIT,
    patterns: [
      named('länge|laenge|lang', LAENGE_EINHEIT),
      formula('l', LAENGE_EINHEIT),
      suffixed(LAENGE_EINHEIT, `lang${GEBEUGT}`),
    ],
  },
  {
    key: 'breite',
    einheit: LAENGE_EINHEIT,
    patterns: [
      named('breite|breit', LAENGE_EINHEIT),
      formula('b', LAENGE_EINHEIT),
      suffixed(LAENGE_EINHEIT, `breit${GEBEUGT}`),
    ],
  },
  {
    key: 'gewicht',
    einheit: GEWICHT_EINHEIT,
    patterns: [
      named('gewicht|schwer', GEWICHT_EINHEIT),
      formula('g|m', GEWICHT_EINHEIT),
      suffixed(GEWICHT_EINHEIT, `schwer${GEBEUGT}`),
    ],
  },
];

/** Den reinen Messwert aus der Fundstelle lösen: "d = 30 cm" → "30 cm". */
function valueOf(raw: string, einheit: string): string | null {
  const match = new RegExp(`${ZAHL}\\s*${einheit}\\b`, 'i').exec(raw);
  return match === null ? null : tidy(match[0]).toLowerCase();
}

/**
 * Alle Treffer einer Regel in Lesereihenfolge (Issue #191: „Stufenbreite 80 cm“ und
 * „Auftrittsbreite 27 cm“ in einer Position). Überlappen sich zwei Muster, zählt der erste.
 */
function findMasse(text: string, regel: MassRegel): Hit[] {
  const hits: Hit[] = [];
  for (const pattern of regel.patterns) {
    for (const match of text.matchAll(pattern)) {
      const value = valueOf(match[0], regel.einheit);
      if (value === null) continue;
      const start = match.index ?? 0;
      hits.push({ value, start, end: start + match[0].length, label: tidy(match[0]) });
    }
  }
  hits.sort((a, b) => a.start - b.start || b.end - a.end);
  const out: Hit[] = [];
  for (const hit of hits) {
    const last = out.at(-1);
    if (last === undefined || hit.start >= last.end) out.push(hit);
  }
  return out;
}

/**
 * Alle benannten Maße als Key→Wert, plus Fundstellen im Langtext.
 *
 * Der Kurztext wird nachrangig durchsucht: "Wand 24 cm dick" steht oft nur dort.
 * Ein Treffer von dort liefert den Wert, aber **keinen** Span — Spans sind per
 * Definition Stellen im Langtext (docs/architecture/data-model.md#spans).
 */
export function extractMasse(
  longText: string,
  shortText = '',
): { attributes: Record<string, string>; spans: Span[] } {
  const attributes: Record<string, string> = {};
  const spans: Span[] = [];
  for (const regel of REGELN) {
    const hits = findMasse(longText, regel);
    if (hits.length > 0) {
      // Markiert werden alle Stellen; als Wert der Position gilt die erste.
      const collected = collect(regel.key, hits);
      attributes[regel.key] = collected.values[0];
      spans.push(...collected.spans);
      continue;
    }
    const fromShort = findMasse(shortText, regel)[0];
    if (fromShort !== undefined) attributes[regel.key] = fromShort.value;
  }
  return { attributes, spans };
}

export const masseExtractor: Extractor = {
  id: 'masse',
  extract(context: ExtractorContext): ExtractorResult {
    return extractMasse(context.longText, context.shortText);
  },
};
