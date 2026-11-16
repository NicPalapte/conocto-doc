// Vorschläge über den Kurztext und was die Positionskarte dazu markiert (Entscheidung 0108).
// Alle Texte sind erfunden.

import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SUGGEST_RULES,
  suggestIndexOf,
  suggestionsInPage,
  suggestMatchOf,
  type DocSuggestion,
  type SuggestPosition,
} from '../../src/lib/docs/docSuggest';
import { EMPTY_DOC_NOTES, pendingSuggestions, rejectSuggestion } from '../../src/lib/docs/docNotes';

const pos = (id: string, oz: string, shortText: string): SuggestPosition => ({
  id,
  oz,
  quantity: null,
  unit: null,
  shortText,
});

const INDEX = suggestIndexOf([
  pos('a', '01.01.0010', 'Stahlbeton Außenwand Kellergeschoss'),
  pos('b', '01.01.0020', 'Stahlbeton Außenwand'),
  pos('c', '01.01.0030', 'Zulage Schalung'),
  pos('d', '01.01.0040', 'Zulage Schalung'),
  pos('e', '01.01.0050', 'Beton'),
  pos('f', '01.01.0060', 'Einbauen und liefern'),
]);

const finde = (text: string, index = INDEX) =>
  suggestionsInPage(text, index, 1).map(({ text: t, id, source }) => ({ t, id, source }));

describe('Kurztext im Dokument', () => {
  it('findet den Kurztext wörtlich, ohne Groß/klein, Zeilenumbruch und Umlaute', () => {
    expect(finde('Die STAHLBETON aussenwand\nKellergeschoss wird abgedichtet.')).toEqual([
      { t: 'STAHLBETON aussenwand\nKellergeschoss', id: 'a', source: 'text' },
    ]);
  });

  it('der längste Kurztext an einer Stelle gilt', () => {
    expect(finde('Stahlbeton Außenwand Kellergeschoss')).toEqual([
      { t: 'Stahlbeton Außenwand Kellergeschoss', id: 'a', source: 'text' },
    ]);
    expect(finde('Stahlbeton Außenwand im Erdgeschoss')).toEqual([
      { t: 'Stahlbeton Außenwand', id: 'b', source: 'text' },
    ]);
  });

  it('kein Vorschlag bei mehrdeutigem, kurzem oder allgemeinem Kurztext', () => {
    expect(finde('Zulage Schalung für Aussparungen')).toEqual([]);
    expect(finde('Beton wird geliefert')).toEqual([]);
    expect(finde('Einbauen und liefern')).toEqual([]);
  });

  it('hinter der eigenen OZ kein zweiter Vorschlag', () => {
    expect(finde('01.01.0020 Stahlbeton Außenwand')).toEqual([
      { t: '01.01.0020', id: 'b', source: 'oz' },
    ]);
  });

  it('Regel aus: keine Kurztext-Vorschläge', () => {
    const aus = suggestIndexOf([pos('a', '1', 'Stahlbeton Außenwand Kellergeschoss')], {
      ...DEFAULT_SUGGEST_RULES,
      text: null,
    });
    expect(finde('Stahlbeton Außenwand Kellergeschoss', aus)).toEqual([]);
  });
});

describe('Was die Positionskarte markiert', () => {
  const base: DocSuggestion = { page: 1, start: 0, text: 'x', id: 'a', source: 'menge' };

  it('Kurztext, gleiche Wörter auch gebeugt, Betonklassen, OZ und Menge', () => {
    expect(
      suggestMatchOf({ ...base, source: 'text' }, 'Stahlbeton Außenwand', 'Lang').terms,
    ).toEqual(['Stahlbeton Außenwand']);
    const menge = suggestMatchOf(
      { ...base, words: ['Außenwände'] },
      'Stahlbeton Außenwand',
      'Für alle Außenwände im Keller.',
    );
    expect(menge).toEqual({ oz: false, amount: true, terms: ['Außenwand', 'Außenwände'] });
    const beton = suggestMatchOf(
      { ...base, source: 'beton', sorte: { key: 'C30/37 · XC4, XF1', matches: 2 } },
      'Wand',
      '',
    );
    expect(beton.terms).toEqual(['C30/37', 'XC4', 'XF1']);
    const nurFestigkeit = suggestMatchOf(
      { ...base, source: 'beton', sorte: { key: 'C30/37 · XC4', matches: 2, pdf: 'C30/37' } },
      'Wand',
      '',
    );
    expect(nurFestigkeit.terms).toEqual(['C30/37']);
    const oz = suggestMatchOf(
      { ...base, source: 'oz', amount: { pdf: '5 m', lv: '6 m', same: false } },
      'Wand',
      '',
    );
    expect(oz).toEqual({ oz: true, amount: false, terms: [] });
  });
});

describe('Ein Vorschlag je Position und Satz (Issue #191)', () => {
  const index = suggestIndexOf([
    { id: 'm', oz: '02.01.0010', quantity: 120, unit: 'm2', shortText: 'Bodenplatte Tiefgarage' },
    { id: 'n', oz: '02.01.0020', quantity: 35, unit: 'm3', shortText: 'Sauberkeitsschicht' },
  ]);
  const ALLE = { oz: true, menge: true, beton: true, text: true };
  const offen = (text: string, notes = EMPTY_DOC_NOTES) =>
    pendingSuggestions(notes, 'd', suggestionsInPage(text, index, 1), ALLE).map(
      ({ text: t, id, source }) => ({ t, id, source }),
    );
  // Kurztext weiter als 80 Zeichen hinter der OZ, aber im selben Satz.
  const SATZ =
    'Pos. 02.01.0010 umfasst nach Abschluss aller Erdarbeiten und der Abnahme durch die ' +
    'Bauleitung auch die Bodenplatte Tiefgarage.';

  it('OZ und Kurztext derselben Position im Satz ergeben nur den OZ-Vorschlag', () => {
    expect(finde(SATZ, index).filter((item) => item.id === 'm').length).toBeGreaterThan(1);
    expect(offen(SATZ).filter((item) => item.id === 'm')).toEqual([
      { t: '02.01.0010', id: 'm', source: 'oz' },
    ]);
  });

  it('nach „Nein“ zur OZ bleibt der nächste Vorschlag derselben Position', () => {
    const oz = finde(SATZ, index).find((item) => item.source === 'oz');
    const spot = { doc: 'd', page: 1, start: SATZ.indexOf('02.01'), text: oz?.t ?? '' };
    const notes = rejectSuggestion(EMPTY_DOC_NOTES, spot, 'm', 1);
    const rest = offen(SATZ, notes).filter((item) => item.id === 'm');
    expect(rest).toHaveLength(1);
    expect(rest[0].source).not.toBe('oz');
  });

  it('in einem anderen Satz darf dieselbe Position wieder vorkommen', () => {
    const text =
      'Pos. 02.01.0010 wird zuerst und vor allen anderen Arbeiten im Baufeld hergestellt. ' +
      'Danach folgt nach dem Aushärten die Bodenplatte Tiefgarage.';
    expect(offen(text).map((item) => item.source)).toEqual(['oz', 'text']);
  });
});
