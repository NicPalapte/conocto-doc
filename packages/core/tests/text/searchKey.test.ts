import { describe, expect, it } from 'vitest';
import { findInKey, searchKeyOf, searchNeedleOf } from '../../src/text/searchKey';

function found(text: string, search: string, lineEnds?: ReadonlySet<number>): string[] {
  return findInKey(searchKeyOf(text, lineEnds), searchNeedleOf(search)).map((range) =>
    text.slice(range.start, range.end),
  );
}

describe('searchKeyOf', () => {
  it('ist klein und ohne Leerraum', () => {
    expect(searchKeyOf('C 25/30\n XC4').key).toBe('c25/30xc4');
  });

  it('kennt für jedes Zeichen die Stelle im Original', () => {
    const { key, at } = searchKeyOf('a b');
    expect(key).toBe('ab');
    expect(at).toEqual([0, 2]);
  });

  it('lässt den Trennstrich vor einem Zeilenumbruch weg', () => {
    expect(searchKeyOf('Stahl-\nbeton').key).toBe('stahlbeton');
    expect(searchKeyOf('Stahl- \r\n  beton').key).toBe('stahlbeton');
  });

  it('lässt den Trennstrich vor einem gemeldeten Zeilenende weg', () => {
    // PDF.js: „Stahl-“ ist ein Stück mit Zeilenende, „beton“ folgt ohne Leerzeichen.
    expect(searchKeyOf('Stahl-beton', new Set([6])).key).toBe('stahlbeton');
  });

  it('behält den Bindestrich mitten in der Zeile', () => {
    expect(searchKeyOf('Stahl-beton').key).toBe('stahl-beton');
    expect(searchKeyOf('Beton- und Stahlbau').key).toBe('beton-undstahlbau');
  });

  it('lässt das weiche Trennzeichen weg', () => {
    expect(searchKeyOf('Stahl\u00adbeton').key).toBe('stahlbeton');
  });

  it('zählt verlängerte Kleinbuchstaben je Hälfte', () => {
    const { key, at } = searchKeyOf('İx');
    expect(key.length).toBe(3);
    expect(at).toEqual([0, 0, 1]);
  });
});

describe('searchNeedleOf', () => {
  it('normiert den Begriff wie den Text', () => {
    expect(searchNeedleOf('  C 25/30 ')).toBe('c25/30');
  });

  it('ist leer, wenn zu kurz', () => {
    expect(searchNeedleOf('a', 2)).toBe('');
    expect(searchNeedleOf('ab', 2)).toBe('ab');
    expect(searchNeedleOf('   ')).toBe('');
  });
});

describe('findInKey', () => {
  it('findet über Leerraum und Zeilenumbruch hinweg, Lage im Original', () => {
    expect(found('Bauzeit 14\nMonate', '14 Monate')).toEqual(['14\nMonate']);
    expect(found('Bauzeit 14Monate', '14 Monate')).toEqual(['14Monate']);
  });

  it('findet ein über die Zeile getrenntes Wort', () => {
    expect(found('Die Stahl-\nbeton-Decke', 'Stahlbeton')).toEqual(['Stahl-\nbeton']);
    expect(found('Die Stahl-beton-Decke', 'stahlbeton', new Set([10]))).toEqual(['Stahl-beton']);
  });

  it('findet überlappende Vorkommen', () => {
    expect(found('aaa', 'aa')).toEqual(['aa', 'aa']);
  });

  it('findet nichts für einen leeren Begriff', () => {
    expect(findInKey(searchKeyOf('Beton'), '')).toEqual([]);
  });

  it('findet gleich viel im LV-Text und im geklebten PDF-Text', () => {
    const lv = 'Bewehrung nach Statik.\nZulage-\nbewehrung an Aussparungen.';
    const pdf = 'Bewehrung nach Statik.Zulage-bewehrung an Aussparungen.';
    const pdfEnds = new Set([22, 29]);
    expect(found(lv, 'bewehrung')).toHaveLength(2);
    expect(found(pdf, 'bewehrung', pdfEnds)).toHaveLength(2);
    expect(found(lv, 'Zulagebewehrung')).toHaveLength(1);
    expect(found(pdf, 'Zulagebewehrung', pdfEnds)).toHaveLength(1);
  });
});
