// Geladene LVs als gespeichertes Projekt (Entscheidungen 0046, 0110). Ein Weg für die
// Startseite und für „Dokument hinzufügen…": Angaben aus dem geladenen LV, Bytes aus den
// Quellen in Ladereihenfolge.

import { saveLastLv, saveLastLvFiles, type LastLvMeta } from './lastLv';
import type { LvSource } from '../pipeline/loadLv';
import type { LoadedLV } from '../pipeline/runPipeline';

/** Angaben fürs Speichern: Name und Anzahl des ersten LV oben, alle unter `files`. */
export function projectMeta(lv: LoadedLV, id: string, savedAt: number): LastLvMeta {
  return {
    fileName: lv.fileName,
    positionCount: lv.summary.positionCount,
    savedAt,
    id,
    files: lv.files.map(({ key, fileName, positionCount }) => ({ key, fileName, positionCount })),
  };
}

/**
 * Speichert die LVs. `keepNotes`: dasselbe Projekt, nur ein LV dazu oder weg — die
 * Notizen bleiben, und geschrieben wird nur, wenn `id` noch das gespeicherte Projekt ist.
 * Sonst ein neues Projekt ohne Notizen.
 */
export async function saveProject(
  lv: LoadedLV,
  sources: readonly LvSource[],
  id: string,
  keepNotes: boolean,
): Promise<boolean> {
  const [first, ...more] = sources;
  if (first === undefined) return false;
  const meta = projectMeta(lv, id, Date.now());
  return keepNotes ? saveLastLvFiles(meta, first.bytes, more) : saveLastLv(meta, first.bytes, more);
}
