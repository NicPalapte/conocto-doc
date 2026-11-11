// Blättern durch Vorschläge im Dokument (Issue #191): Lesereihenfolge, ringsum.
import { describe, expect, it } from 'vitest';
import {
  orderSuggestions,
  stepSuggestion,
  type DocSuggestion,
} from '../../src/lib/docs/docSuggest';

const s = (page: number, start: number, id = 'p'): DocSuggestion => ({
  page,
  start,
  text: 'x',
  id,
  source: 'oz',
});

describe('stepSuggestion', () => {
  const ordered = orderSuggestions([s(2, 5), s(1, 40), s(1, 3)]);

  it('ordnet nach Seite und Stelle', () => {
    expect(ordered.map((item) => `${item.page}:${item.start}`)).toEqual(['1:3', '1:40', '2:5']);
  });

  it('beginnt vorn oder hinten und läuft ringsum', () => {
    expect(stepSuggestion(ordered, null, 1)).toBe(0);
    expect(stepSuggestion(ordered, null, -1)).toBe(2);
    expect(stepSuggestion(ordered, s(2, 5), 1)).toBe(0);
    expect(stepSuggestion(ordered, s(1, 3), -1)).toBe(2);
    expect(stepSuggestion(ordered, s(1, 40), 1)).toBe(2);
  });

  it('liefert ohne Vorschläge nichts und fängt bei Unbekanntem vorn an', () => {
    expect(stepSuggestion([], null, 1)).toBeNull();
    expect(stepSuggestion(ordered, s(9, 9, 'q'), 1)).toBe(0);
  });
});
