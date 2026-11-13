// Mehrere LVs in einer Sitzung (Entscheidung 0110): Baum, Pipeline, Graph, Filter und
// Notizen. Nur erfundene Positionen.

import { describe, expect, it } from 'vitest';
import {
  addComment,
  carryOver,
  commentsOf,
  EMPTY_ANNOTATIONS,
  positionMoves,
} from '../../src/lib/annotations';
import { toggledLvs } from '../../src/components/docs/LvList';
import { nextKeys } from '../../src/components/docs/LvFilesProvider';
import { FACETS_BY_ID } from '../../src/lib/facets';
import { layoutMap, type MapOptions } from '../../src/lib/graph/layoutMap';
import { positionRadii } from '../../src/lib/graph/sizes';
import { buildPositionIndex } from '../../src/lib/index/positionIndex';
import { classifyAndBuildParts } from '../../src/lib/pipeline/runPipeline';
import {
  buildTree,
  buildTreeOfParts,
  collectPositions,
  indexNodes,
  indexParents,
} from '../../src/lib/tree/buildTree';
import type { LVDraft, PositionDraft } from '@core';
import type { LVNode } from '../../src/types/lvNode';

function position(oz: string, shortText: string): PositionDraft {
  return {
    oz,
    shortText,
    longText: '',
    unit: 'm2',
    quantity: 3,
    unitPrice: null,
    positionType: 'NORMAL',
    attributes: {},
  };
}

function draft(name: string, positions: PositionDraft[]): LVDraft {
  return {
    projectName: name,
    client: null,
    lots: [
      {
        number: '',
        label: null,
        sections: [{ number: '01', label: 'Erdarbeiten', sections: [], positions }],
      },
    ],
  };
}

const rohbau = draft('Rohbau', [
  position('01.0010', 'Boden lösen'),
  position('01.0020', 'Verfüllen'),
]);
const ausbau = draft('Ausbau', [position('01.0010', 'Estrich'), position('01.0020', 'Verfüllen')]);

const parts = [
  { draft: rohbau, key: 'LV1', fileName: 'rohbau.x83' },
  { draft: ausbau, key: 'LV2', fileName: 'ausbau.x83' },
];

const positionsOf = (tree: LVNode): LVNode[] => collectPositions(tree);

describe('Baum über mehrere LVs', () => {
  it('ist mit einer Datei genau der bisherige Baum', () => {
    expect(buildTreeOfParts([parts[0]])).toEqual(buildTree(rohbau));
  });

  it('legt je LV einen Knoten über die Lose, die Positionen tragen ihre Kennung', () => {
    const tree = buildTreeOfParts(parts);
    expect(tree.children.map((child) => [child.id, child.kind, child.label])).toEqual([
      ['file:LV1', 'file', 'Rohbau'],
      ['file:LV2', 'file', 'Ausbau'],
    ]);
    expect(positionsOf(tree).map((node) => node.position?.lv)).toEqual([
      'LV1',
      'LV1',
      'LV2',
      'LV2',
    ]);
    expect(tree.positionCount).toBe(4);
    expect(tree.label).toBeNull();
  });

  it('lässt dem ersten LV seine Knoten-IDs und Hashes', () => {
    const alone = positionsOf(buildTree(rohbau));
    const together = positionsOf(buildTreeOfParts(parts)).slice(0, 2);
    expect(together.map((node) => node.id)).toEqual(alone.map((node) => node.id));
    expect(together.map((node) => node.position?.hashes.id)).toEqual(
      alone.map((node) => node.position?.hashes.id),
    );
  });

  it('gibt einer gleichen Position im zweiten LV einen eigenen Hash', () => {
    const [, verfuellen1, , verfuellen2] = positionsOf(buildTreeOfParts(parts));
    expect(verfuellen2.position?.hashes.id).toBe(`${verfuellen1.position?.hashes.id}-2`);
    expect(verfuellen2.id).not.toBe(verfuellen1.id);
  });
});

describe('Pipeline über mehrere LVs', () => {
  it('nennt alle LVs und prüft über alle Positionen', () => {
    const lv = classifyAndBuildParts([
      { draft: rohbau, fileName: 'rohbau.x83', fileId: 'aaa', key: 'LV1' },
      { draft: ausbau, fileName: 'ausbau.x83', fileId: 'bbb', key: 'LV3' },
    ]);
    expect(
      lv.files.map((file) => [file.key, file.fileName, file.positionCount, file.nodeId]),
    ).toEqual([
      ['LV1', 'rohbau.x83', 2, 'file:LV1'],
      ['LV3', 'ausbau.x83', 2, 'file:LV3'],
    ]);
    expect(lv.fileName).toBe('rohbau.x83');
    expect(lv.summary.positionCount).toBe(4);
    expect(lv.summary.facets.get('lv')).toEqual(
      new Map([
        ['LV1', 2],
        ['LV3', 2],
      ]),
    );
  });

  it('kennt bei einer Datei keine Facette „LV"', () => {
    const lv = classifyAndBuildParts([
      { draft: rohbau, fileName: 'rohbau.x83', fileId: 'aaa', key: 'LV1' },
    ]);
    expect(lv.files[0].nodeId).toBe('project');
    expect(lv.summary.facets.get('lv')?.size ?? 0).toBe(0);
  });
});

describe('Graph „nach LV" mit mehreren LVs', () => {
  const tree = buildTreeOfParts(parts);
  const index = buildPositionIndex(tree);
  const parents = indexParents(tree);
  const options: MapOptions = {
    layout: 'lv',
    rows: 'einheit',
    cols: null,
    radii: positionRadii(index, 'uniform'),
    mask: null,
    hide: false,
    selected: {},
  };

  it('legt um jedes LV eine eigene Insel, die Hauptabschnitte darin', () => {
    const map = layoutMap(index, parents, options);
    const files = map.hulls.filter((hull) => hull.kind === 'file');
    expect(files.map((hull) => hull.title)).toEqual(['LV1 · Rohbau', 'LV2 · Ausbau']);
    expect(files.map((hull) => hull.slots.length)).toEqual([2, 2]);
    expect(map.hulls.filter((hull) => hull.kind === 'section')).toHaveLength(2);
    // Die Inseln liegen nebeneinander, nicht übereinander.
    const [a, b] = files;
    expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThanOrEqual(a.r + b.r - 1e-6);
  });

  it('zeigt bei einer Datei keine Insel je LV', () => {
    const single = buildTree(rohbau);
    const singleIndex = buildPositionIndex(single);
    const map = layoutMap(singleIndex, indexParents(single), {
      ...options,
      radii: positionRadii(singleIndex, 'uniform'),
    });
    expect(map.hulls.some((hull) => hull.kind === 'file')).toBe(false);
  });
});

describe('Facette und Umschalter „LV"', () => {
  it('ordnet LV10 hinter LV2', () => {
    const facet = FACETS_BY_ID.get('lv');
    expect(facet?.sortValues?.(['LV10', 'LV2', 'LV1'])).toEqual(['LV1', 'LV2', 'LV10']);
  });

  it('blendet aus und wieder ein; alle sichtbar heißt kein Filter', () => {
    const keys = ['LV1', 'LV2', 'LV3'];
    const ohne2 = toggledLvs(keys, undefined, 'LV2');
    expect([...ohne2]).toEqual(['LV1', 'LV3']);
    expect(toggledLvs(keys, ohne2, 'LV2').size).toBe(0);
  });

  it('lässt das letzte sichtbare LV stehen', () => {
    const nur1 = new Set(['LV1']);
    expect([...toggledLvs(['LV1', 'LV2'], nur1, 'LV1')]).toEqual(['LV1']);
  });

  it('vergibt die kleinsten freien Kennungen', () => {
    expect(nextKeys(['LV1', 'LV3'], 2)).toEqual(['LV2', 'LV4']);
  });
});

describe('Notizen, wenn ein LV dazukommt oder geht', () => {
  it('folgen ihrer Position über den Hash, auch wenn sich die Knoten-ID verschiebt', () => {
    const before = buildTreeOfParts(parts);
    const estrich = positionsOf(before)[2];
    const notes = addComment(EMPTY_ANNOTATIONS, estrich.id, 'Dicke prüfen', 1);
    // LV1 geht: Ausbau steht allein, seine Knoten-IDs verlieren das „#2".
    const after = buildTreeOfParts([parts[1]]);
    const oldNodes = [...indexNodes(before).values()];
    const newNodes = [...indexNodes(after).values()];
    const moved = carryOver(notes, oldNodes, newNodes);
    const target = positionsOf(after)[0];
    expect(target.position?.shortText).toBe('Estrich');
    expect(commentsOf(moved, target.id)).toEqual(['Dicke prüfen']);
    expect(positionMoves(oldNodes, newNodes).get(estrich.id)).toBe(target.id);
  });

  it('bleiben beim Schließen unter dem Hash stehen und kommen mit dem LV zurück', () => {
    const both = buildTreeOfParts(parts);
    const boden = positionsOf(both)[0];
    const notes = addComment(EMPTY_ANNOTATIONS, boden.id, 'Bodenklasse', 1);
    const onlyAusbau = buildTreeOfParts([parts[1]]);
    const closed = carryOver(notes, indexNodes(both).values(), indexNodes(onlyAusbau).values());
    expect(commentsOf(closed, boden.position?.hashes.id ?? '')).toEqual(['Bodenklasse']);
    const back = buildTreeOfParts([parts[1], { ...parts[0], key: 'LV1' }]);
    const reopened = carryOver(closed, indexNodes(onlyAusbau).values(), indexNodes(back).values());
    const bodenBack = positionsOf(back).find((node) => node.position?.shortText === 'Boden lösen');
    expect(commentsOf(reopened, bodenBack?.id ?? '')).toEqual(['Bodenklasse']);
  });
});
