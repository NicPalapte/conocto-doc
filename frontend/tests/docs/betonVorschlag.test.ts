// Vorschläge „Beton im Dokument“ (Entscheidung 0106): gleiche Sorte im PDF wie im LV,
// eindeutig oder über eigene Wörter aus dem Kurztext. Alle Texte sind erfunden.

import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SUGGEST_RULES,
  suggestIndexOf,
  suggestionsInPage,
  type SuggestPosition,
} from '../../src/lib/docs/docSuggest';

const pos = (id: string, oz: string, shortText: string, sorte: string | null): SuggestPosition => ({
  id,
  oz,
  quantity: null,
  unit: 'm3',
  shortText,
  sorte,
});

const POSITIONEN = [
  pos('wand', '02.03.20', 'Wände Tiefgarage, d = 25 cm', 'C30/37 · XC4, XF1 · WF'),
  pos('platte', '02.03.10', 'Bodenplatte Tiefgarage', 'C30/37 · XC4, XF1 · WF'),
  pos('stuetze', '02.03.30', 'Stützen Erdgeschoss', 'C30/37 · XC4, XF1 · WF'),
  pos('rampe', '02.03.40', 'Rampe', 'C35/45 · XC4, XD3, XF4 · WA'),
  pos('sauber', '02.01.10', 'Sauberkeitsschicht', 'C12/15 · X0'),
];

const finde = (text: string, rules = DEFAULT_SUGGEST_RULES) =>
  suggestionsInPage(text, suggestIndexOf(POSITIONEN, rules), 12).filter(
    (s) => s.source === 'beton',
  );

describe('Beton im Dokument', () => {
  it('schlägt eine Sorte mit nur einer Position direkt vor', () => {
    const [vorschlag] = finde('Für die Rampe gilt C35/45, XF4, XC4, XD3, WA.');
    expect(vorschlag).toMatchObject({
      id: 'rampe',
      source: 'beton',
      sorte: { key: 'C35/45 · XC4, XD3, XF4 · WA', matches: 1 },
    });
  });

  it('grenzt in einer Tabellenzeile über Wörter vor der Klasse ein', () => {
    const text =
      'Bauteil Festigkeit Klassen Wände Tiefgarage C30/37 XC4, XF1, WF Bodenplatte C30/37 ' +
      'XC4, XF1, WF Sauberkeitsschicht C12/15 X0';
    const vorschlaege = finde(text);
    expect(vorschlaege.map((s) => [s.id, s.words])).toEqual([
      ['wand', ['Wände']],
      ['platte', ['Bodenplatte']],
      ['sauber', undefined],
    ]);
    expect(vorschlaege[0].text).toBe('Wände Tiefgarage C30/37 XC4, XF1, WF');
    expect(vorschlaege[0].sorte).toEqual({ key: 'C30/37 · XC4, XF1 · WF', matches: 3 });
  });

  it('nimmt Wörter hinter der Klasse, wenn davor keine stehen', () => {
    expect(finde('Beton C30/37, XC4, XF1, WF für die Stützen.').map((s) => s.id)).toEqual([
      'stuetze',
    ]);
  });

  it('Umlaut im Plural: „Außenwände“ trifft „Außenwand“', () => {
    const wand = pos('aussen', '02.03.50', 'Außenwand Untergeschoss', 'C30/37 · XC4, XF1 · WF');
    const index = suggestIndexOf([...POSITIONEN, wand], DEFAULT_SUGGEST_RULES);
    const text = 'Die Außenwände erhalten C30/37, XC4, XF1, WF.';
    expect(suggestionsInPage(text, index, 1).map((s) => s.id)).toEqual(['aussen']);
  });

  it('ohne eigenes Wort oder bei anderer Sorte kein Vorschlag', () => {
    expect(finde('Beton C30/37, XC4, XF1, WF, soweit nicht anders angegeben.')).toEqual([]);
    expect(finde('Wände Tiefgarage C30/37 XC2')).toEqual([]);
    expect(finde('Rampe C30/37')).toEqual([]);
  });

  it('nur Festigkeit im PDF: reicht mit eigenem Bauteilwort (Nico, 11.11.)', () => {
    const [rampe] = finde('Die Rampe erhält Ortbeton C35/45.');
    expect(rampe).toMatchObject({
      id: 'rampe',
      sorte: { key: 'C35/45 · XC4, XD3, XF4 · WA', matches: 1, pdf: 'C35/45' },
    });
    expect(finde('Wände Tiefgarage C30/37 XC4, XF1').map((s) => s.id)).toEqual(['wand']);
    // Nur eine Position mit dieser Festigkeit, aber kein Bauteilwort: kein Vorschlag.
    expect(finde('Beton C35/45 nach DIN 1045-2.')).toEqual([]);
  });

  it('höchstens so viele Positionen, wie die Regel erlaubt', () => {
    const text = 'Wände, Bodenplatte und Stützen: C30/37, XC4, XF1, WF.';
    expect(finde(text)).toHaveLength(3);
    const eine = { ...DEFAULT_SUGGEST_RULES, beton: { maxPositions: 2 } };
    expect(finde(text, eine)).toEqual([]);
    expect(finde(text, { ...DEFAULT_SUGGEST_RULES, beton: null })).toEqual([]);
  });

  it('„wo“ oder „f1“ in Prosa sind keine Klassen (Review #228)', () => {
    expect(finde('Die Rampe in C35/45, XC4, XD3, XF4, WA und wo möglich glätten.')).toHaveLength(1);
    expect(finde('Die Rampe in C35/45 XC4 XD3 XF4 WA wo nötig.').map((s) => s.id)).toEqual([
      'rampe',
    ]);
  });

  it('bleibt bei tausenden Positionen gleicher Sorte schnell (Review #228)', () => {
    const viele = Array.from({ length: 5000 }, (_, i) =>
      pos(`w${i}`, `09.${i}`, `Wand Abschnitt ${i}`, 'C25/30 · XC1'),
    );
    const eine = pos('kern', '09.9999', 'Treppenhauskern', 'C25/30 · XC1');
    const index = suggestIndexOf([...viele, eine], DEFAULT_SUGGEST_RULES);
    const seite = 'Treppenhauskern und Wände: C25/30, XC1. '.repeat(50);
    const start = performance.now();
    const vorschlaege = suggestionsInPage(seite, index, 1);
    expect(performance.now() - start).toBeLessThan(1000);
    expect(new Set(vorschlaege.map((s) => s.id))).toEqual(new Set(['kern']));
  });
});
