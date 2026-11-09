// Lange Trefferliste (Entscheidung 0103): Reihenfolge der Quellen und Weiterspringen.

import { describe, expect, it } from 'vitest';
import { inListOrder, nextHit, type SearchSource } from '../../src/components/search/SearchNav';

const quelle = (id: string, count: number | null, index = -1): SearchSource => ({
  id,
  label: id,
  count,
  index,
});
const alle = () => true;

describe('inListOrder', () => {
  it('beginnt bei der aktiven Quelle und läuft reihum', () => {
    const quellen = [quelle('lv', 3), quelle('a', 1), quelle('b', 2)];
    expect(inListOrder(quellen, 'a').map((q) => q.id)).toEqual(['a', 'b', 'lv']);
  });
});

describe('nextHit', () => {
  it('springt innerhalb der Quelle weiter', () => {
    expect(nextHit([quelle('lv', 3, 0), quelle('a', 2)], 1, alle)).toEqual({ id: 'lv', at: 1 });
  });

  it('springt am Ende direkt in die nächste Quelle mit Treffern', () => {
    const liste = [quelle('lv', 3, 2), quelle('a', 0), quelle('b', 2)];
    expect(nextHit(liste, 1, alle)).toEqual({ id: 'b', at: 0 });
  });

  it('springt rückwärts zum letzten Treffer der vorigen Quelle', () => {
    const liste = [quelle('a', 2, 0), quelle('b', 4), quelle('lv', 3)];
    expect(nextHit(liste, -1, alle)).toEqual({ id: 'lv', at: 2 });
  });

  it('bleibt bei nicht erlaubten Quellen in der eigenen und beginnt vorn', () => {
    const liste = [quelle('a', 2, 1), quelle('lv', 3)];
    expect(nextHit(liste, 1, (q) => q.id !== 'lv')).toEqual({ id: 'a', at: 0 });
  });

  it('fängt ohne gezeigten Treffer beim ersten an und meldet null ohne Treffer', () => {
    expect(nextHit([quelle('lv', 3)], 1, alle)).toEqual({ id: 'lv', at: 0 });
    expect(nextHit([quelle('lv', 0), quelle('a', null)], 1, alle)).toBeNull();
  });
});
