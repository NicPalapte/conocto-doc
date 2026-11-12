// OZ-Vorschläge ohne Kapitelnummern (Entscheidung 0108, Praxistest 12.11.2026): ohne „Pos.“
// oder „OZ“ zählt eine Nummer nur in LV-Schreibweise und nicht vor einer Überschrift.
// Alle Texte sind erfunden.

import { describe, expect, it } from 'vitest';
import {
  suggestIndexOf,
  suggestionsInPage,
  type SuggestPosition,
} from '../../src/lib/docs/docSuggest';

const pos = (id: string, oz: string, shortText: string): SuggestPosition => ({
  id,
  oz,
  quantity: null,
  unit: null,
  shortText,
});

const NULLEN = suggestIndexOf([
  pos('a', '01.02.0010', 'Baugrube ausheben'),
  pos('b', '03.04', 'Betonsorten Übersicht'),
]);
const OHNE = suggestIndexOf([
  pos('k', '3.4.1', 'Wände Kellergeschoss'),
  pos('l', '3.4.2', 'Stützen Erdgeschoss'),
]);

const ids = (text: string, index = NULLEN, lineEnds: number[] = []) =>
  suggestionsInPage(text, index, 1, lineEnds).map((s) => s.id);

describe('Kapitelnummern sind keine OZ', () => {
  it('ohne Kontextwort nur in der Schreibweise des LV', () => {
    expect(ids('Siehe 01.02.0010 im LV.')).toEqual(['a']);
    expect(ids('Siehe 1.2.10 der Baubeschreibung.')).toEqual([]);
    expect(ids('Siehe Pos. 1.2.10 im LV.')).toEqual(['a']);
  });

  it('Nummer am Zeilenanfang vor fremder Überschrift: Kapitel', () => {
    const text = 'Einleitung\n3.4.1 Allgemeine Anforderungen an den Beton';
    expect(ids(text, OHNE, [10])).toEqual([]);
    // Ohne Zeilenanfang (mitten im Satz) bleibt es eine OZ.
    expect(ids('Wie unter 3.4.1 Allgemeines beschrieben.', OHNE)).toEqual(['k']);
  });

  it('Positionszeile mit Wort aus dem Kurztext oder Menge bleibt OZ', () => {
    expect(ids('Liste\n3.4.1 Wände Kellergeschoss', OHNE, [5])).toEqual(['k']);
    expect(ids('Liste\n3.4.2 120 m³', OHNE, [5])).toEqual(['l']);
    expect(ids('Liste\nPos. 3.4.1 Allgemeines', OHNE, [5])).toEqual(['k']);
  });
});
