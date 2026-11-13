// Kennzahlen des Überblicks (WP-L, Schritt 3 und 4). Die Abnahme verlangt zwei
// Dinge: die Zahlen stimmen gegen die Tabellensummen, und eine Datei ohne
// Preise zeigt keine Null-Euro-Werte.

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildPositionIndex, filterMask } from '../../src/lib/index/positionIndex';
import { summarize } from '../../src/lib/index/summary';
import { prepareFilters } from '../../src/lib/matchPos';
import { buildOverview, DIRECT_KEY } from '../../src/lib/overview/model';
import { runPipeline } from '../../src/lib/pipeline/runPipeline';
import { buildTree } from '../../src/lib/tree/buildTree';
import { indexParents } from '../../src/lib/tree/buildTree';
import { syntheticDraft } from '../support/syntheticLv';
import type { LVDraft } from '@core';

function overviewOf(draft: LVDraft, search = '', focusLabel: string | null = null) {
  const tree = buildTree(draft);
  const index = buildPositionIndex(tree);
  const active = prepareFilters({ facets: {}, menge: null }, search);
  const mask = active.filtering ? filterMask(index, active) : null;
  const parents = indexParents(tree);
  const focus =
    focusLabel === null
      ? null
      : ([...parents.values()].find((node) => node?.label === focusLabel)?.id ?? null);
  return {
    model: buildOverview({ index, mask, parents, focus }),
    index,
    summary: summarize(index),
  };
}

describe('buildOverview · mit Preisen', () => {
  const { model, summary } = overviewOf(syntheticDraft(200));

  it('nennt dieselbe Summe wie die vorberechneten Aggregate', () => {
    expect(model.metrics.hasPrices).toBe(true);
    expect(model.metrics.totalPrice).toBeCloseTo(summary.totalPrice, 6);
    expect(model.metrics.positions).toBe(summary.positionCount);
    expect(model.metrics.filtering).toBe(false);
  });

  it('verteilt die Summe restlos auf Abschnitte und darin auf Einheiten', () => {
    const groups = model.groups.reduce((sum, group) => sum + group.value, 0);
    expect(groups).toBeCloseTo(model.metrics.totalPrice, 6);
    for (const group of model.groups) {
      const cells = group.cells.reduce((sum, cell) => sum + cell.value, 0);
      expect(cells).toBeCloseTo(group.value, 6);
      expect(group.cells.reduce((sum, cell) => sum + cell.count, 0)).toBe(group.count);
    }
  });

  it('misst die Fläche an der Summe, sobald die Datei Preise führt', () => {
    expect(model.measure).toBe('preis');
  });

  it('liest ab, wie viele Positionen 80 % der Summe tragen', () => {
    const pareto = model.pareto;
    expect(pareto).not.toBeNull();
    if (pareto === null) return;
    expect(pareto.positions).toBeGreaterThan(0);
    expect(pareto.positions).toBeLessThanOrEqual(model.metrics.positions);
    expect(pareto.share).toBeCloseTo(pareto.positions / model.metrics.positions, 6);
    // Die Kurve steigt monoton und endet bei der vollen Summe.
    let last = -1;
    for (const point of pareto.curve) {
      expect(point.y).toBeGreaterThanOrEqual(last);
      last = point.y;
    }
    expect(pareto.curve[pareto.curve.length - 1].y).toBeCloseTo(1, 6);
  });

  it('summiert Mengen je Einheit, absteigend und ohne Einheiten zu mischen', () => {
    expect(model.units.length).toBeGreaterThan(1);
    for (let i = 1; i < model.units.length; i++) {
      expect(model.units[i - 1].quantity).toBeGreaterThanOrEqual(model.units[i].quantity);
    }
    expect(model.units.reduce((sum, unit) => sum + unit.count, 0)).toBe(model.metrics.positions);
    // Schreibweisen sind zusammengeführt wie im Filter: "Stck" zählt als Stück.
    expect(model.units.map((unit) => unit.key)).toContain('Stück');
  });

  it('rechnet nur über die gefilterte Menge', () => {
    const { model: gefiltert } = overviewOf(syntheticDraft(200), 'Stütze');
    expect(gefiltert.metrics.filtering).toBe(true);
    expect(gefiltert.metrics.positions).toBeLessThan(model.metrics.positions);
    expect(gefiltert.metrics.totalPositions).toBe(model.metrics.positions);
    expect(gefiltert.metrics.totalPrice).toBeLessThan(model.metrics.totalPrice);
  });

  // Issue #97: Preisführung hängt an der Datei, nicht am Filterergebnis.
  it('behält „mit Preisen", wenn der Filter nichts trifft', () => {
    const { model: leer } = overviewOf(syntheticDraft(200), 'xyzzy');
    expect(leer.metrics.positions).toBe(0);
    expect(leer.metrics.hasPrices).toBe(true);
    expect(leer.measure).toBe('preis');
  });
});

describe('buildOverview · ohne Preise', () => {
  const bytes = readFileSync('../packages/core/tests/fixtures/gaeb-xml-beispiel.x83');
  const lv = runPipeline(
    bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer,
    'beispiel.x83',
  );
  const index = buildPositionIndex(lv.tree);
  const model = buildOverview({ index, mask: null, parents: indexParents(lv.tree) });

  it('sagt, dass die Datei keine Preise führt — statt 0 € zu behaupten', () => {
    expect(model.metrics.hasPrices).toBe(false);
    expect(model.metrics.withoutPrice).toBe(model.metrics.positions);
  });

  it('misst die Treemap dann an der Anzahl der Positionen', () => {
    expect(model.measure).toBe('anzahl');
    const groups = model.groups.reduce((sum, group) => sum + group.value, 0);
    expect(groups).toBe(model.metrics.positions);
  });

  it('lässt die Pareto-Auswertung entfallen, statt eine Nullkurve zu zeichnen', () => {
    expect(model.pareto).toBeNull();
  });

  it('gliedert nach Hauptabschnitt und Einheit — ohne Klassifizierung', () => {
    expect(model.groups.map((group) => group.key).sort()).toEqual([
      'section:001',
      'section:002',
      'section:999',
    ]);
    const stunden = model.groups.find((group) => group.key === 'section:999');
    expect(stunden?.pickable).toBe(true);
    expect(stunden?.cells.map((cell) => cell.label)).toEqual(['Stunde']);
  });

  it('behält die Farbe eines Abschnitts, wenn ein anderer herausgefiltert ist', () => {
    const ohne001 = new Uint8Array(index.size);
    for (let slot = 0; slot < index.size; slot++) {
      ohne001[slot] = index.positions[slot].oz.startsWith('001.') ? 0 : 1;
    }
    const gefiltert = buildOverview({ index, mask: ohne001, parents: indexParents(lv.tree) });
    const rang = (groups: typeof model.groups, key: string) =>
      groups.find((group) => group.key === key)?.order;
    expect(rang(gefiltert.groups, 'section:001')).toBeUndefined();
    expect(rang(gefiltert.groups, 'section:999')).toBe(rang(model.groups, 'section:999'));
    expect(rang(model.groups, 'section:999')).toBeGreaterThan(0);
    expect(model.metrics.sections).toBe(3);
    expect(gefiltert.metrics.sections).toBe(2);
  });

  it('nennt statt Pareto die größten Mengen je Einheit, ohne Pauschalen', () => {
    expect(model.largest.length).toBeGreaterThan(0);
    expect(model.largest.some((unit) => unit.key === 'psch')).toBe(false);
    for (const unit of model.largest) {
      const mengen = unit.items.map((item) => item.quantity);
      expect(mengen).toEqual([...mengen].sort((a, b) => b - a));
    }
  });

  it('trägt die Mengen auch ohne Preise — sie übernehmen die Hauptrolle', () => {
    expect(model.units.length).toBeGreaterThan(0);
    expect(model.units[0].quantity).toBeGreaterThan(0);
  });
});

describe('buildOverview · viele Abschnitte', () => {
  it('fasst keine Abschnitte zusammen (Issue #191) und verliert keine Summe', () => {
    const count = 15;
    const draft: LVDraft = {
      projectName: 'Viele Abschnitte',
      client: null,
      lots: [
        {
          number: '001',
          label: 'Los 1',
          sections: Array.from({ length: count }, (_, i) => ({
            number: `001.${String(i + 1).padStart(3, '0')}`,
            label: `Abschnitt ${i + 1}`,
            sections: [],
            positions: [
              {
                oz: `001.${String(i + 1).padStart(3, '0')}.0010`,
                shortText: `Position ${i}`,
                longText: '',
                unit: 'm2',
                quantity: 10,
                unitPrice: (i + 1) * 100,
                positionType: 'NORMAL' as const,
                attributes: { gewerk: `Gewerk ${String(i).padStart(2, '0')}` },
              },
            ],
          })),
        },
      ],
    };
    const { model } = overviewOf(draft);
    expect(model.groups).toHaveLength(count);
    expect(model.groups.every((group) => group.pickable)).toBe(true);
    expect(model.groups.reduce((sum, group) => sum + group.value, 0)).toBeCloseTo(
      model.metrics.totalPrice,
      6,
    );
    expect(model.groups.reduce((sum, group) => sum + group.count, 0)).toBe(model.metrics.positions);
  });
});

describe('buildOverview · geöffneter Abschnitt (Issue #191)', () => {
  const position = (oz: string, unit: string, unitPrice: number) => ({
    oz,
    shortText: `Position ${oz}`,
    longText: '',
    unit,
    quantity: 10,
    unitPrice,
    positionType: 'NORMAL' as const,
    attributes: {},
  });
  const draft: LVDraft = {
    projectName: 'Abschnitte',
    client: null,
    lots: [
      {
        number: '001',
        label: 'Los 1',
        sections: [
          {
            number: '01',
            label: 'Rohbau',
            positions: [position('01.0010', 'psch', 50)],
            sections: [
              {
                number: '01.01',
                label: 'Erdarbeiten',
                sections: [],
                positions: [position('01.01.0010', 'm3', 10), position('01.01.0020', 'm2', 5)],
              },
              {
                number: '01.02',
                label: 'Beton',
                sections: [],
                positions: [position('01.02.0010', 'm3', 100)],
              },
            ],
          },
          {
            number: '02',
            label: 'Ausbau',
            sections: [],
            positions: [position('02.0010', 'm2', 20)],
          },
        ],
      },
    ],
  };

  it('gliedert nach Unterabschnitten, Kennzahlen bleiben für alles', () => {
    const { model } = overviewOf(draft, '', 'Rohbau');
    const labels = model.groups.map((group) => group.label).join(' | ');
    expect(labels).toMatch(/Erdarbeiten/);
    expect(labels).toMatch(/Beton/);
    expect(labels).toMatch(/Rohbau · direkt/);
    expect(labels).not.toMatch(/Ausbau/);
    expect(model.groups.find((group) => group.key === DIRECT_KEY)?.pickable).toBe(false);
    expect(model.groups.find((group) => group.label.endsWith('Erdarbeiten'))?.cells).toHaveLength(
      2,
    );
    expect(model.metrics.positions).toBe(5);
  });
});
