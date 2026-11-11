// Betonsortenliste (Entscheidung 0104): Klassen werden wörtlich erkannt, Sorten
// gebündelt, fehlende Angaben gezählt. Alle Texte sind erfunden.

import { describe, expect, it } from 'vitest';
import {
  betonSorteOf,
  buildBetonSorten,
  fehlendeAngabenOf,
  OHNE_KLASSE,
  sortExpo,
} from '../../src/lib/beton/sorten';
import { angabeStand, angabeText } from '../../src/lib/export/betonSorten';
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

  it('nennt je Position die fehlenden Angaben für die Positionskarte', () => {
    expect(fehlendeAngabenOf(idx.positions[0])).toEqual([]);
    expect(fehlendeAngabenOf(idx.positions[2])).toContain('Feuchtigkeitsklasse');
    expect(fehlendeAngabenOf(idx.positions[4])).toBeNull();
  });

  it('erkennt PP-Fasern als Fasern', () => {
    const faser = index([
      position('01.01.10', 'Estrich', 'Beton C25/30 XC1 mit PP-Fasern', 'm3', 5),
    ]);
    expect(buildBetonSorten(faser, null).sorten[0].stahlFasern).toEqual(['Fasern']);
  });

  it('nennt Angaben aus verknüpften Dokumentstellen „fehlt im LV“', () => {
    const wand = idx.nodes[1].id;
    const texte = (id: string) =>
      id === wand ? ['Wände C30/37 XC4, XF1, WF, Konsistenz F3, Größtkorn 16 mm'] : [];
    const [haupt] = buildBetonSorten(idx, null, texte).sorten;
    const angabe = (key: string) => haupt.angaben.find((entry) => entry.key === key);
    expect(angabe('konsistenz')).toMatchObject({ fehlt: 1, imDokument: ['F3'], nurImDokument: 1 });
    expect(angabe('chloridklasse')).toMatchObject({ fehlt: 1, imDokument: [], nurImDokument: 0 });
    expect(angabeStand(angabe('konsistenz')!)).toBe('dokument');
    expect(angabeStand(angabe('chloridklasse')!)).toBe('fehlt');
    expect(angabeText(haupt, 'konsistenz')).toBe('F3 · im Dokument: F3 (fehlt im LV in 1 von 2)');
    expect(angabeText(haupt, 'chloridklasse')).toBe('Cl 0,40 (fehlt in 1 von 2)');
  });

  it('nimmt aus einer Stelle mit zwei Sorten nur den Teil der eigenen (Review #228)', () => {
    const wand = idx.nodes[1].id;
    const texte = (id: string) =>
      id === wand
        ? ['Sauberkeitsschicht C12/15 X0 Konsistenz F2 · Wände C30/37 XC4, XF1, WF Konsistenz F3']
        : [];
    const [haupt] = buildBetonSorten(idx, null, texte).sorten;
    const konsistenz = haupt.angaben.find((entry) => entry.key === 'konsistenz');
    expect(konsistenz?.imDokument).toEqual(['F3']);
    const fremd = () => ['Beton C25/30, Konsistenz F4'];
    const [ohne] = buildBetonSorten(idx, null, fremd).sorten;
    expect(ohne.angaben.find((entry) => entry.key === 'konsistenz')?.imDokument).toEqual([]);
  });

  it('gibt Schalung und andere Nicht-m³-Positionen ohne Klasse keine Sorte', () => {
    expect(betonSorteOf(idx.positions[4])).toBeNull();
  });
});
