// LVDraft (klassifiziert) → LVNode-Baum. Reine Funktion, kein GAEB-Wissen
// (docs/architecture/pipeline.md#in-memory-baum). Ein Contract für Tree-Spalte,
// Bubble-Graph und Tabelle.

import {
  hashPosition,
  hashPositions,
  type LotDraft,
  type LVDraft,
  type PositionDraft,
  type PositionHashes,
  type SectionDraft,
} from '@core';
import type { LVNode } from '../../types/lvNode';

/**
 * IDs werden nach `kind` präfixiert, weil ein namenloser Wrapper-Abschnitt
 * dieselbe Nummer trägt wie sein Los ("001"). Bei einer trotzdem doppelten ID
 * hängt ein Zähler an — der Baum muss eindeutige React-Keys liefern.
 */
class IdFactory {
  private readonly used = new Set<string>();

  /** Inhalts-Hashes je Position aus dem Kern (Entscheidung 0055). */
  readonly hashes: Map<PositionDraft, PositionHashes>;

  /** Kennung des LV, das gerade gebaut wird; nur bei mehreren LVs (Entscheidung 0110). */
  lv: string | undefined;

  constructor(hashes: Map<PositionDraft, PositionHashes>) {
    this.hashes = hashes;
  }

  next(kind: string, code: string, fallback: string): string {
    const base = `${kind}:${code === '' ? fallback : code}`;
    if (!this.used.has(base)) {
      this.used.add(base);
      return base;
    }
    let counter = 2;
    while (this.used.has(`${base}#${counter}`)) counter++;
    const unique = `${base}#${counter}`;
    this.used.add(unique);
    return unique;
  }
}

/**
 * Nummer der eigenen Ebene: der Präfix des Elternknotens fällt weg
 * („01.07.0010" unter „01.07" → „0010"). Trägt ein namenloser Wrapper-Abschnitt
 * dieselbe Nummer wie sein Los, bleibt nichts Eigenes übrig.
 */
export function ownCodeOf(code: string, parentCode: string): string {
  if (code === '' || parentCode === '') return code;
  if (code === parentCode) return '';
  return code.startsWith(`${parentCode}.`) ? code.slice(parentCode.length + 1) : code;
}

/** `null` als 0 werten: x83-Dateien führen meist keine Einheitspreise. */
function lineTotal(position: PositionDraft): number {
  return (position.quantity ?? 0) * (position.unitPrice ?? 0);
}

function buildPosition(
  position: PositionDraft,
  ids: IdFactory,
  index: number,
  parentCode: string,
): LVNode {
  return {
    id: ids.next('position', position.oz, `${index}`),
    kind: 'position',
    code: position.oz,
    ownCode: ownCodeOf(position.oz, parentCode),
    label: position.shortText === '' ? null : position.shortText,
    positionCount: 1,
    totalPrice: lineTotal(position),
    children: [],
    position: {
      oz: position.oz,
      shortText: position.shortText,
      longText: position.longText,
      unit: position.unit,
      quantity: position.quantity,
      unitPrice: position.unitPrice,
      positionType: position.positionType,
      attributes: position.attributes,
      // Jede Position steht in der Map; der Fallback ist nur Typ-Sicherheit.
      hashes: ids.hashes.get(position) ?? hashPosition(position),
      ...(ids.lv === undefined ? {} : { lv: ids.lv }),
    },
  };
}

function aggregate(children: LVNode[]): { positionCount: number; totalPrice: number } {
  let positionCount = 0;
  let totalPrice = 0;
  for (const child of children) {
    positionCount += child.positionCount;
    totalPrice += child.totalPrice;
  }
  return { positionCount, totalPrice };
}

function buildSection(
  section: SectionDraft,
  ids: IdFactory,
  index: number,
  parentCode: string,
): LVNode {
  const id = ids.next('section', section.number, `${index}`);
  const children = [
    ...section.sections.map((child, i) => buildSection(child, ids, i, section.number)),
    ...section.positions.map((position, i) => buildPosition(position, ids, i, section.number)),
  ];
  return {
    id,
    kind: 'section',
    code: section.number,
    ownCode: ownCodeOf(section.number, parentCode),
    label: section.label,
    ...(section.text === undefined ? {} : { text: section.text }),
    ...aggregate(children),
    children,
    position: null,
  };
}

function buildLot(lot: LotDraft, ids: IdFactory, index: number): LVNode {
  const id = ids.next('lot', lot.number, `${index}`);
  const children = lot.sections.map((section, i) => buildSection(section, ids, i, lot.number));
  return {
    id,
    kind: 'lot',
    code: lot.number,
    ownCode: lot.number,
    label: lot.label,
    ...(lot.text === undefined ? {} : { text: lot.text }),
    ...aggregate(children),
    children,
    position: null,
  };
}

export function buildTree(draft: LVDraft): LVNode {
  const ids = new IdFactory(hashPositions(draft));
  const children = draft.lots.map((lot, index) => buildLot(lot, ids, index));
  return {
    id: 'project',
    kind: 'project',
    code: '',
    ownCode: '',
    label: draft.projectName,
    ...aggregate(children),
    children,
    position: null,
  };
}

/** Ein LV unter mehreren: Draft, Kennung („LV1") und Dateiname. */
export interface TreePart {
  readonly draft: LVDraft;
  readonly key: string;
  readonly fileName: string;
}

/** Knoten-ID des LV `key` im Baum mehrerer LVs. */
export function fileNodeId(key: string): string {
  return `file:${key}`;
}

/**
 * Baum über mehrere LVs (Entscheidung 0110): Projekt → je Datei ein Knoten `file` → Lose.
 * Mit einer Datei genau `buildTree`, damit IDs und Hashes wie bisher bleiben.
 *
 * Hashes über alle Dateien in einem Lauf: eine gleiche Position in zwei LVs bekommt so
 * „-2" und damit eigene Notizen. Ebenso eine IdFactory für alle — die erste Datei behält
 * ihre bisherigen Knoten-IDs.
 */
export function buildTreeOfParts(parts: readonly TreePart[]): LVNode {
  if (parts.length === 1) return buildTree(parts[0].draft);
  const all: LVDraft = {
    projectName: null,
    client: null,
    lots: parts.flatMap((part) => part.draft.lots),
  };
  const ids = new IdFactory(hashPositions(all));
  const children = parts.map((part): LVNode => {
    ids.lv = part.key;
    const lots = part.draft.lots.map((lot, index) => buildLot(lot, ids, index));
    return {
      id: fileNodeId(part.key),
      kind: 'file',
      code: part.key,
      ownCode: part.key,
      label: part.draft.projectName ?? part.fileName,
      ...aggregate(lots),
      children: lots,
      position: null,
    };
  });
  const names = new Set(parts.map((part) => part.draft.projectName));
  return {
    id: 'project',
    kind: 'project',
    code: '',
    ownCode: '',
    // Gleicher Projektname in allen Dateien: der steht oben, sonst keiner.
    label: names.size === 1 ? parts[0].draft.projectName : null,
    ...aggregate(children),
    children,
    position: null,
  };
}

/** Alle Positionsknoten in Dokumentreihenfolge — Basis für Tabelle und Facetten. */
export function collectPositions(node: LVNode, into: LVNode[] = []): LVNode[] {
  if (node.kind === 'position') into.push(node);
  for (const child of node.children) collectPositions(child, into);
  return into;
}

/** Knoten-Index für Selektion und Drill-in. */
export function indexNodes(root: LVNode): Map<string, LVNode> {
  const map = new Map<string, LVNode>();
  const visit = (node: LVNode): void => {
    map.set(node.id, node);
    for (const child of node.children) visit(child);
  };
  visit(root);
  return map;
}

/** Elternzuordnung — für Breadcrumb, Spotlight und Drill-in aus dem Graphen. */
export function indexParents(root: LVNode): Map<string, LVNode | null> {
  const map = new Map<string, LVNode | null>();
  const visit = (node: LVNode, parent: LVNode | null): void => {
    map.set(node.id, parent);
    for (const child of node.children) visit(child, node);
  };
  visit(root, null);
  return map;
}
