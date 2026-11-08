// Mitgeliefertes Demo-Projekt, damit sich die App ohne eigene Datei ausprobieren lässt
// (Entscheidung 0098). Ein Projekt mit allem, was die App kann:
//
//  - **LV mit Preisen** — eigene Demodatei (x84) auf Basis der BVBS-Musterdatei, Preise und
//    Zusatzpositionen erfunden (docs/decisions/0014-demo-lv-mit-preisen.md).
//  - **Drei Begleit-PDFs** — Baubeschreibung, Vorbemerkungen, Grundriss (alles erfunden).
//  - **Notizen dazu** als Notiz-Datei (`conocto-notizen`, Entscheidung 0061): Stellen in den
//    PDFs schon mit Positionen verknüpft, im Grundriss Maßstab und Messungen mit Positionen.
//    Weitere OZ und Mengen im Text rechnet die App wie immer als offene Vorschläge.
//
// PDFs und Notiz-Datei erzeugt `npm run demo-projekt` (scripts/makeDemoProjekt.ts).
//
// Die Dateien liegen als Assets im eigenen Bundle und werden erst beim Klick geholt — sie
// wandern nicht in das Start-Bundle. Der `fetch` geht an die eigene Auslieferung (gleiche
// Herkunft wie die App) und schickt nichts nach draußen (docs/decisions/0009-demo-lv.md).
// Gespeichert wird die Demo nie: Notizen dazu gelten nur in der Sitzung.

import lvUrl from '../../assets/demo/conocto-demo-angebot.x84?url';
import notesUrl from '../../assets/demo/projekt/conocto-demo-notizen.json?url';
import baubeschreibungUrl from '../../assets/demo/projekt/baubeschreibung.pdf?no-inline';
import vorbemerkungenUrl from '../../assets/demo/projekt/vorbemerkungen.pdf?no-inline';
import grundrissUrl from '../../assets/demo/projekt/grundriss-eg.pdf?no-inline';
import { EMPTY_ANNOTATIONS, type Annotations } from '../annotations';
import { matchNotes, mergeNotes, parseNotesFile } from '../notesFile';
import { indexNodes } from '../tree/buildTree';
import { loadLvFromBytes, LVLoadError, type LoadOptions } from './loadLv';
import type { LoadedLV } from './runPipeline';

export interface DemoDoc {
  /** Name in der App, wie bei einer gewählten Datei. */
  readonly name: string;
  readonly url: string;
}

export interface DemoProjekt {
  /** Beschriftung der Schaltfläche. */
  readonly label: string;
  /** Anzeigename des LV in der Oberfläche. */
  readonly title: string;
  /** Ein Satz dazu, was das Projekt zeigt. */
  readonly hint: string;
  /** Dateiname, der nach dem Laden in der Kopfleiste steht. */
  readonly fileName: string;
  readonly url: string;
  readonly notesUrl: string;
  readonly docs: readonly DemoDoc[];
}

export const DEMO_PROJEKT: DemoProjekt = {
  label: 'Demo-Projekt öffnen',
  title: 'Conocto Demo-LV 3.3 · Angebot mit Preisen',
  hint:
    'Angebot (x84) mit Preisen, dazu drei PDFs mit Verknüpfungen und Vorschlägen und ein ' +
    'Grundriss mit Messung.',
  fileName: 'conocto-demo-angebot.x84',
  url: lvUrl,
  notesUrl,
  docs: [
    { name: 'Baubeschreibung Verwaltungsgebäude.pdf', url: baubeschreibungUrl },
    { name: 'Vorbemerkungen LV.pdf', url: vorbemerkungenUrl },
    { name: 'Grundriss EG.pdf', url: grundrissUrl },
  ],
};

/** Kennungen in `doc/?demo=…`; ältere Links auf die zwei früheren Demos öffnen das Projekt. */
const DEMO_IDS = new Set(['projekt', 'angebot', 'muster']);

export interface LoadedDemo {
  readonly lv: LoadedLV;
  /** Notizen zur Demo, nach Knoten-ID wie in der Sitzung. */
  readonly annotations: Annotations;
  /** PDFs zum Öffnen im Bereich „Dokument“. */
  readonly docs: readonly File[];
}

async function fetchBytes(url: string): Promise<ArrayBuffer> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.arrayBuffer();
}

/** Notizen und PDFs der Demo; scheitert das, öffnet das LV trotzdem — mit Hinweis. */
async function extrasOf(
  demo: DemoProjekt,
  lv: LoadedLV,
): Promise<{ annotations: Annotations; docs: File[] }> {
  const [notes, ...pdfs] = await Promise.all([
    fetchBytes(demo.notesUrl),
    ...demo.docs.map((doc) => fetchBytes(doc.url)),
  ]);
  const file = parseNotesFile(new TextDecoder().decode(notes));
  const { same } = matchNotes(file, indexNodes(lv.tree).values());
  return {
    annotations: mergeNotes(EMPTY_ANNOTATIONS, same, file.dokumente, file.plaene),
    docs: pdfs.map((bytes, i) => new File([bytes], demo.docs[i].name, { type: 'application/pdf' })),
  };
}

/**
 * Lädt das Demo-Projekt: das LV über denselben Weg wie eine gewählte Datei, dazu Notizen
 * und PDFs.
 *
 * @throws {LVLoadError} mit verständlicher Meldung für die UI, wenn das LV fehlt.
 */
export async function loadDemoLv(
  demo: DemoProjekt = DEMO_PROJEKT,
  options: LoadOptions = {},
): Promise<LoadedDemo> {
  let bytes: ArrayBuffer;
  try {
    bytes = await fetchBytes(demo.url);
  } catch {
    throw new LVLoadError(
      'demo-unavailable',
      'Das Demo-LV konnte nicht geladen werden. ' +
        'Bitte die Seite neu laden oder eine eigene Datei wählen.',
    );
  }
  const lv = await loadLvFromBytes(bytes, demo.fileName, options);
  try {
    return { lv, ...(await extrasOf(demo, lv)) };
  } catch {
    options.onNotice?.('Die Dokumente zum Demo-Projekt fehlen. Das LV ist trotzdem offen.');
    return { lv, annotations: EMPTY_ANNOTATIONS, docs: [] };
  }
}

/**
 * Demo aus der Adresse, z. B. `doc/?demo=projekt` vom Knopf „Demo starten" der
 * Startseite (Entscheidung 0092). Nimmt den Parameter aus der Adresszeile, damit
 * ein Neuladen die Startseite des Viewers zeigt statt die Demo erneut zu öffnen.
 * Unbekannte Werte werden ebenfalls entfernt und öffnen nichts.
 */
export function takeDemoFromUrl(): DemoProjekt | undefined {
  if (typeof window === 'undefined') return undefined;
  const url = new URL(window.location.href);
  const id = url.searchParams.get('demo');
  if (id === null) return undefined;
  url.searchParams.delete('demo');
  window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash);
  return DEMO_IDS.has(id) ? DEMO_PROJEKT : undefined;
}
