// Genormte Kurzbezeichnungen, die unabhängig vom Leistungsbereich eindeutig sind:
// Druckfestigkeits- und Expositionsklassen nach DIN EN 206 / DIN 1045-2 sowie
// Feuchtigkeitsklassen nach DIN 1045-2, dazu Chlorid-, Konsistenzklasse und Größtkorn
// nach DIN EN 206. Erkannt wird nur, was wörtlich im Text
// steht — es wird nichts ergänzt und nichts abgeleitet.
//
// Deshalb dürfen sie auch der FallbackRuleset-Pfad extrahieren: die Schreibweise
// "C30/37" bedeutet in jedem Gewerk dasselbe. Alles Interpretierende (etwa
// `tragend`) gehört zum Materialwissen, nicht hierher.

import { allMatches } from '../text';

/** Druckfestigkeitsklasse nach DIN EN 206, Normal- und Leichtbeton ("C30/37", "LC25/28"). */
const DRUCKFESTIGKEIT = /\b(?:lc|c)\s?\d{1,3}\/\d{1,3}\b/g;

/** Expositionsklassen nach DIN EN 206 / DIN 1045-2: X0, XC/XD/XS/XF/XA/XM + Ziffer. */
const EXPOSITION = /\bx0\b|\bx[cdsfam][1-4]\b/g;

/** Feuchtigkeitsklassen nach DIN 1045-2 (Alkali-Kieselsäure-Reaktion). */
const FEUCHTIGKEIT = /\bw[ofa]\b/g;

/** Chloridgehaltsklasse nach DIN EN 206 („Cl 0,40", „CL0.20"). */
const CHLORID = /\bcl\s?([01])[,.](\d{1,2})\b/g;

/**
 * Konsistenzklasse nach DIN EN 206: Ausbreitmaß F1–F6, Setzfließmaß SF1–SF3.
 * Setzmaß (S1–S5) und Verdichtungsmaß (C0–C4) nur nach dem Wort „Konsistenz",
 * weil „S3" oder „C2" sonst zu oft etwas anderes meinen.
 */
const KONSISTENZ = /\b(?:sf[1-3]|f[1-6])\b|\bkonsistenz(?:klasse)?\s*[:=]?\s*(?:s[1-5]|c[0-4])\b/g;

/** Größtkorn der Gesteinskörnung in mm: „Größtkorn 16 mm", „Dmax 22", „GK 32". */
const GROESSTKORN =
  /\b(?:gr(?:ö|oe)(?:ß|ss)tkorn|d\s?max|gk)\s*[:=]?\s*(?:d\s?max\s*[:=]?\s*)?(\d{1,2})(?:[,.]\d)?\s*(?:mm)?(?![\d/])/g;

function upper(values: string[]): string[] {
  return values.map((value) => value.replace(/\s+/g, '').toUpperCase());
}

export interface Betonklassen {
  beton: string | null;
  expo: string[];
  feuchtigkeitsklasse: string[];
  chloridklasse: string[];
  konsistenz: string[];
  /** Größtkorn als „16 mm". */
  groesstkorn: string[];
}

function unique(values: Iterable<string>): string[] {
  return [...new Set(values)];
}

function chloridklassen(text: string): string[] {
  return unique([...text.matchAll(CHLORID)].map((m) => `Cl ${m[1]},${m[2].padEnd(2, '0')}`));
}

function konsistenzklassen(text: string): string[] {
  return unique(
    [...text.matchAll(KONSISTENZ)].map((m) => {
      const klasse = /(?:sf|s|c|f)\d$/.exec(m[0]);
      return (klasse?.[0] ?? m[0]).toUpperCase();
    }),
  );
}

function groesstkoerner(text: string): string[] {
  return unique([...text.matchAll(GROESSTKORN)].map((m) => `${Number(m[1])} mm`));
}

export function extractBetonklassen(text: string): Betonklassen {
  const beton = upper(allMatches(text, DRUCKFESTIGKEIT));
  return {
    beton: beton[0] ?? null,
    expo: upper(allMatches(text, EXPOSITION)),
    feuchtigkeitsklasse: upper(allMatches(text, FEUCHTIGKEIT)),
    chloridklasse: chloridklassen(text),
    konsistenz: konsistenzklassen(text),
    groesstkorn: groesstkoerner(text),
  };
}

/** Nur die tatsächlich gefundenen Klassen als Attribute — keine leeren Keys. */
export function betonklassenAttributes(text: string): Record<string, unknown> {
  const klassen = extractBetonklassen(text);
  const { beton, expo, feuchtigkeitsklasse } = klassen;
  const attributes: Record<string, unknown> = {};
  if (beton !== null) attributes.beton = beton;
  if (expo.length > 0) attributes.expo = expo;
  if (feuchtigkeitsklasse.length > 0) attributes.feuchtigkeitsklasse = feuchtigkeitsklasse;
  // Chlorid, Konsistenz und Größtkorn nur neben einer Betonklasse: „F3" oder
  // „GK 16" allein sagen in einem anderen Gewerk etwas anderes.
  if (beton === null && expo.length === 0) return attributes;
  if (klassen.chloridklasse.length > 0) attributes.chloridklasse = klassen.chloridklasse;
  if (klassen.konsistenz.length > 0) attributes.konsistenz = klassen.konsistenz;
  if (klassen.groesstkorn.length > 0) attributes.groesstkorn = klassen.groesstkorn;
  return attributes;
}
