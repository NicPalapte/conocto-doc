// Datei → Parser → Klassifizierung → Baum (docs/architecture/pipeline.md#ablauf).
//
// Die Pipeline ist absichtlich zweigeteilt: `parseToDraft` braucht `DOMParser`,
// der laut HTML-Spezifikation nur im Window-Scope existiert und in keinem
// Browser im Worker-Scope verfügbar ist. Der Schritt läuft deshalb im
// Haupt-Thread (nativer XML-Parser, entsprechend schnell), während
// `classifyAndBuild` — der rechenintensive Teil mit einer Regelauswertung je
// Position — in den Worker ausgelagert wird (siehe pipeline.worker.ts).

import { CHECK_RULES, runChecks, type CheckResult } from '../check';
import { classifyDraft, getClassifier } from '../classify';
import { fileIdOf, getGaebParser, mapToLvDraft } from '@core';
import { buildPositionIndex } from '../index/positionIndex';
import { summarize, type LVSummary } from '../index/summary';
import { measure } from '../perf';
import { buildRelations, type RelationResult } from '../relate';
import { buildTreeOfParts, fileNodeId, indexParents } from '../tree/buildTree';
import type { LVDraft } from '@core';
import type { LVNode } from '../../types/lvNode';

/** Ein geladenes LV unter mehreren (Entscheidung 0110). */
export interface LvFile {
  /** Kennung in der Oberfläche: „LV1", „LV2" … — bleibt beim Schließen anderer LVs. */
  key: string;
  fileName: string;
  /** Datei-ID aus den Bytes (Entscheidung 0055); `null` ohne Bytes (Tests). */
  fileId: string | null;
  projectName: string | null;
  positionCount: number;
  /** Knoten im Baum: `file:<key>` bei mehreren LVs, sonst `project`. */
  nodeId: string;
}

/** Eingabe der Pipeline je Datei. */
export interface PipelinePart {
  draft: LVDraft;
  fileName: string;
  fileId: string | null;
  key: string;
}

export interface LoadedLV {
  tree: LVNode;
  projectName: string | null;
  client: string | null;
  fileName: string;
  /**
   * Datei-ID aus den Original-Bytes (Entscheidung 0055). `null`, wenn das LV
   * nicht aus Bytes stammt (Tests mit gebautem Draft).
   */
  fileId: string | null;
  /** Facetten-Zähler und Wertebereiche, fertig berechnet (WP-I, Schritt 2). */
  summary: LVSummary;
  /** Hinweise der Prüfregeln, fertig berechnet (WP-K). */
  check: CheckResult;
  /**
   * Ähnlichkeits-Cluster und Unterschiede (WP-M). Entstehen hier —
   * also im Worker, sobald dessen Schwelle greift — und nie im Render
   * (.claude/CLAUDE.md#kritische-constraints).
   */
  relations: RelationResult;
  /**
   * Alle geladenen LVs in Ladereihenfolge, mindestens eins. `fileName`, `fileId` und
   * `projectName` oben gehören zum ersten (Entscheidung 0110).
   */
  files: LvFile[];
}

/**
 * Bytes statt Text: der Parser liest das Encoding aus der XML-Deklaration
 * (GAEB-Exporte sind oft ISO-8859-1). Vorab als UTF-8 dekodierter Text würde
 * Umlaute in Positionstexten zerstören.
 *
 * @throws {GAEBParseError | GAEBValidationError | GAEBVersionError}
 */
export function parseToDraft(bytes: ArrayBuffer, fileName: string): LVDraft {
  return mapToLvDraft(getGaebParser().parse(bytes, fileName));
}

export function classifyAndBuild(
  draft: LVDraft,
  fileName: string,
  fileId: string | null = null,
): LoadedLV {
  return classifyAndBuildParts([{ draft, fileName, fileId, key: 'LV1' }]);
}

/** Mehrere LVs zu einem Baum (Entscheidung 0110); Prüfung und Beziehungen über alle. */
export function classifyAndBuildParts(parts: readonly PipelinePart[]): LoadedLV {
  const first = parts[0];
  if (first === undefined) throw new Error('Keine Datei für die Pipeline');
  const classifier = getClassifier();
  const classified = parts.map((part) => ({
    ...part,
    draft: classifyDraft(part.draft, classifier),
  }));
  const tree = buildTreeOfParts(classified);
  // Der Index dient hier nur als Rechenbasis der Aggregate und wird danach
  // verworfen: er verweist auf die Baumknoten, und diese Verweise überleben den
  // structuredClone aus dem Worker nicht. Die Ansichten bauen ihn auf dem
  // Haupt-Thread über dem empfangenen Baum neu auf (state/ViewerProvider.tsx).
  const index = buildPositionIndex(tree);
  const summary = summarize(index);
  // Beziehungen für das Vergleichsfenster (CompareWindow: ähnliche Positionen).
  const relations = measure('Beziehungen', () => buildRelations(index));
  const several = parts.length > 1;
  const files = classified.map(
    (part): LvFile => ({
      key: part.key,
      fileName: part.fileName,
      fileId: part.fileId,
      projectName: part.draft.projectName,
      positionCount: several
        ? (tree.children.find((child) => child.code === part.key)?.positionCount ?? 0)
        : tree.positionCount,
      nodeId: several ? fileNodeId(part.key) : tree.id,
    }),
  );
  return {
    tree,
    projectName: classified[0].draft.projectName,
    client: classified[0].draft.client,
    fileName: first.fileName,
    fileId: first.fileId,
    summary,
    // Prüfregeln sehen das ganze LV (Anteil an der Gesamtsumme, Mengen-Rang) und
    // laufen deshalb hier — einmal, nie im Render.
    check: runChecks(index, summary, CHECK_RULES, indexParents(tree)),
    relations,
    files,
  };
}

/** Ganze Pipeline synchron — Fallback ohne Worker und Testpfad. */
export function runPipeline(bytes: ArrayBuffer, fileName: string): LoadedLV {
  return classifyAndBuild(parseToDraft(bytes, fileName), fileName, fileIdOf(bytes));
}
