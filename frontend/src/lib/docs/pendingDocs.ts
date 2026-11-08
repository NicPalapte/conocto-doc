// PDFs, die mit einem LV zusammen ankommen (Demo-Projekt, Entscheidung 0100). Der Ladeweg
// auf der Startseite kennt den Bereich „Dokument“ noch nicht; er legt die Dateien hier zum
// LV ab, und `DocumentsProvider` öffnet sie, sobald genau dieses LV geladen ist. Ein anderes
// LV findet nichts — die Dateien hängen am LV-Objekt und verfallen mit ihm.

import type { LoadedLV } from '../pipeline/runPipeline';

const pending = new WeakMap<LoadedLV, readonly File[]>();

/** Legt PDFs für dieses LV bereit; eine leere Liste nimmt nichts in Beschlag. */
export function handOverDocs(lv: LoadedLV, files: readonly File[]): void {
  if (files.length > 0) pending.set(lv, files);
}

/** Holt die PDFs zu diesem LV genau einmal ab. */
export function takeDocs(lv: LoadedLV): readonly File[] {
  const files = pending.get(lv) ?? [];
  pending.delete(lv);
  return files;
}
