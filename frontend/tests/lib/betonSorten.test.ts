// Betonsortenliste (Entscheidung 0104): Klassen werden wörtlich erkannt, Sorten
// gebündelt, fehlende Angaben gezählt. Alle Texte sind erfunden.

import { describe, expect, it } from 'vitest';
import { betonSorteOf, buildBetonSorten, OHNE_KLASSE, sortExpo } from '../../src/lib/beton/sorten';
import { betonklassenAttributes } from '../../src/lib/classify/rulesets/normklassen';
import { buildPositionIndex } from '../../src/lib/index/positionIndex';
import { classifyAndBuild } from '../../src/lib/pipeline/runPipeline';
import type { LVDraft, PositionDraft } from '@core';

function position(oz: string, shortText: string, longText: string, unit: string, quantity: number) {
  const draft: PositionDraft = {
    oz,
    shortText,
    longText,
    unit,
    quantity,
    unitPrice: null,
    positionType: 'NORMAL',
    attributes: {},
  };
  return draft;
}

function index(positions: PositionDraft[]) {
  const draft: LVDraft = {
    projectName: 'Testfall',
    client: 'Test',
    lots: [
      {
        number: '01',
        label: 'Los',
        sections: [{ number: '01.01', label: 'Rohbau', positions, sections: [] }],
      },
    ],
  };
  return buildPositionIndex(classifyAndBuild(draft, 'test.x83').tree);
}

describe('betonklassenAttributes', () => {
  it('liest Chlorid, Konsistenz und Größtkorn neben einer Betonklasse', () => {
    const text =
      'beton c30/37, xc4, xf1, wf, cl 0,40, konsistenz f3, größtkorn 16 mm'.toLowerCase();
    expect(betonklassenAttributes(text)).toEqual({
      beton: 'C30/37',
      expo: ['XC4', 'XF1'],
      feuchtigkeitsklasse: ['WF'],
      chloridklasse: ['Cl 0,40'],
      konsistenz: ['F3'],
      groesstkorn: ['16 mm'],
    });
  });

  it('kennt Dmax, GK, SF-Klassen und Setzmaß nur nach „Konsistenz"', () => {
    const attributes = betonklassenAttributes('c25/30 xc1 dmax 22 sf2 konsistenz s3 cl0.2');
    expect(attributes.groesstkorn).toEqual(['22 mm']);
    expect(attributes.konsistenz).toEqual(['SF2', 'S3']);
    expect(attributes.chloridklasse).toEqual(['Cl 0,20']);
    expect(betonklassenAttributes('c25/30 gk 32').groesstkorn).toEqual(['32 mm']);
    expect(betonklassenAttributes('c25/30 achse s3').konsistenz).toBeUndefined();
  });

  it('liest „F3" oder „GK 16" ohne Betonklasse nicht', () => {
    expect(betonklassenAttributes('brandschutz f3, gk 16, cl 0,40')).toEqual({});
  });
});

describe('sortExpo', () => {
  it('ordnet nach Norm, nicht nach Alphabet', () => {
    expect(sortExpo(['XF1', 'XC4', 'XD3', 'X0'])).toEqual(['X0', 'XC4', 'XD3', 'XF1']);
  });
});

describe('buildBetonSorten', () => {
  const idx = index([
    position(
      '01.01.10',
      'Bodenplatte',
      'Stahlbeton C30/37, XF1, XC4, WF, Cl 0,40, Größtkorn 16 mm, Konsistenz F3, Betonstahl',
      'm3',
      100,
    ),
    position('01.01.20', 'Wände', 'Ortbeton C30/37 XC4 XF1 WF, Betonstahlmatten', 'm3', 50.5),
    position('01.01.30', 'Sauberkeitsschicht', 'Beton C12/15 X0', 'm3', 10),
    position('01.01.40', 'Füllbeton', 'Beton liefern und einbauen', 'm3', 4),
    position('01.01.50', 'Schalung', 'Schalung für Beton', 'm2', 300),
  ]);

  it('bündelt nach Festigkeit, Exposition und Feuchtigkeitsklasse', () => {
    const liste = buildBetonSorten(idx, null);
    expect(liste.sorten.map((sorte) => sorte.key)).toEqual([
      'C30/37 · XC4, XF1 · WF',
      'C12/15 · X0',
      OHNE_KLASSE,
    ]);
    expect(liste.positions).toBe(4);
    expect(liste.kubik).toBeCloseTo(164.5);
  });

  it('zählt fehlende Angaben und nennt Stahl / Matten', () => {
    const [haupt] = buildBetonSorten(idx, null).sorten;
    expect(haupt.klassen).toBe('XC4, XF1 · WF');
    expect(haupt.mengen[0]).toMatchObject({ unit: 'm3', sum: 150.5 });
    expect(haupt.stahlFasern).toEqual(['Stahl', 'Matten']);
    expect(haupt.bauweise).toEqual(['Ortbeton']);
    const fehlt = Object.fromEntries(haupt.angaben.map((angabe) => [angabe.key, angabe.fehlt]));
    expect(fehlt).toEqual({
      beton: 0,
      expo: 0,
      feuchtigkeitsklasse: 0,
      chloridklasse: 1,
      groesstkorn: 1,
      konsistenz: 1,
    });
    expect(haupt.positions[1].fehlt).toEqual(['Chloridgehaltsklasse', 'Größtkorn', 'Konsistenz']);
  });

  it('rechnet nur über die Positionen im Filter', () => {
    const mask = new Uint8Array(idx.size);
    mask[2] = 1;
    expect(buildBetonSorten(idx, mask).sorten.map((sorte) => sorte.key)).toEqual(['C12/15 · X0']);
  });

  it('gibt Schalung und andere Nicht-m³-Positionen ohne Klasse keine Sorte', () => {
    expect(betonSorteOf(idx.positions[4])).toBeNull();
  });
});
