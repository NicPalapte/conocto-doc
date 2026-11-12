// Issue #191 (12.11.2026): mehr Maße im Langtext und nur echte Betonklassen.
// Texte erfunden, nach dem Muster einer Treppenposition.
import { describe, expect, it } from 'vitest';
import { istFestigkeitsklasse } from '../../src/lib/beton/festigkeitsklassen';
import { extractMasse } from '../../src/lib/classify/extractors/masse';
import { extractBetonklassen } from '../../src/lib/classify/rulesets/normklassen';

const TREPPE =
  'Stufe auf mind. 12 cm dickem Unterbeton herstellen. Stufenbreite 90 cm. ' +
  'Steigungshöhe 17 cm, Auftrittsbreite 29 cm. Rückenstütze mit einer Breite von 20 cm ' +
  'bis 5 cm unter Oberkante.';

describe('Maße im Langtext', () => {
  it('erkennt Breite, gebeugte Formen und alle Stellen je Art', () => {
    const { attributes, spans } = extractMasse(TREPPE);
    expect(attributes).toMatchObject({ dicke: '12 cm', hoehe: '17 cm', breite: '90 cm' });
    expect(spans.map((span) => [span.key, span.label])).toEqual([
      ['dicke', '12 cm dickem'],
      ['hoehe', 'höhe 17 cm'],
      ['breite', 'breite 90 cm'],
      ['breite', 'breite 29 cm'],
      ['breite', 'Breite von 20 cm'],
    ]);
  });

  it('eine Zahl ohne Stichwort bleibt kein Maß', () => {
    const { spans } = extractMasse('bis 5 cm unter Oberkante');
    expect(spans).toEqual([]);
  });

  it('„verbreitert“ und „ausgebreitet“ sind keine Breite', () => {
    const { spans } = extractMasse('Weg verbreitert um 5 cm, Folie ausgebreitet 2 m, Gewicht 5 kg');
    expect(spans.map((span) => span.key)).toEqual(['gewicht']);
  });
});

describe('Betonklassen', () => {
  it('nur Festigkeitsklassen nach DIN EN 206 / DIN 1045-2', () => {
    expect(istFestigkeitsklasse('C30/37')).toBe(true);
    expect(istFestigkeitsklasse('c 100/115')).toBe(true);
    expect(istFestigkeitsklasse('LC25/28')).toBe(true);
    expect(istFestigkeitsklasse('C100/0')).toBe(false);
    expect(istFestigkeitsklasse('C30/35')).toBe(false);
  });

  it('Asphaltbinder „C100/0“ ist keine Betonsorte', () => {
    expect(extractBetonklassen('asphaltbinderschicht ac 16 b s, c100/0').beton).toBeNull();
    expect(extractBetonklassen('beton c100/0 und c25/30, xc2').beton).toBe('C25/30');
  });
});
