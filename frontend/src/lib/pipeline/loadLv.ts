// Einstiegspunkt der Upload-Komponente: Datei → LoadedLV.
// Nutzt den Worker, wenn die Umgebung ihn hergibt (Browser), und fällt sonst
// synchron zurück (Tests, ältere Umgebungen). Kein Netzwerk-Request.

import {
  describeFailure,
  toPipelineError,
  type PipelineFailure,
  type PipelineRequest,
  type PipelineResponse,
} from './messages';
import {
  classifyAndBuildParts,
  parseToDraft,
  type LoadedLV,
  type PipelinePart,
} from './runPipeline';
import { fileExtension, fileIdOf, isGaebExtension } from '@core';
import { measureAsync } from '../perf';
import type { LVDraft } from '@core';

export class LVLoadError extends Error {
  readonly code: string;

  constructor(code: string, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'LVLoadError';
    this.code = code;
  }
}

/**
 * Fehler für die UI aus einem Pipeline-Fehler. Die technische Ursache hängt als
 * `cause` daran: die UI zeigt sie nicht, die Fehlersuche braucht sie.
 */
function toLoadError(failure: PipelineFailure, cause?: unknown): LVLoadError {
  const ursache = cause ?? (failure.detail === undefined ? undefined : new Error(failure.detail));
  return new LVLoadError(
    failure.code,
    describeFailure(failure),
    ursache === undefined ? undefined : { cause: ursache },
  );
}

/**
 * Größte Datei, die Conocto liest (Issue #93). 10.000 Positionen sind rund 5 MB
 * XML; 50 MB sind damit gut das Neunfache des Richtwerts in docs/scope.md. Der
 * XML-Parser läuft im Haupt-Thread, eine größere Datei würde die Oberfläche
 * dort lange blockieren.
 */
export const MAX_FILE_BYTES = 50 * 1024 * 1024;

export interface LoadOptions {
  /** Wird für Hinweise gerufen, die das Laden nicht scheitern lassen (Issue #95). */
  onNotice?: (message: string) => void;
}

const WORKER_AUSFALL_HINWEIS =
  'Der Hintergrundprozess ist ausgefallen. Die Datei wurde stattdessen direkt berechnet. ' +
  'Das Ergebnis ist vollständig, nur das Laden dauert länger.';

function formatMegabytes(bytes: number): string {
  return (bytes / (1024 * 1024)).toFixed(1).replace('.', ',');
}

/** Größe prüfen, bevor die Datei gelesen oder geparst wird. */
function pruefeGroesse(bytes: number, fileName: string): void {
  if (bytes <= MAX_FILE_BYTES) return;
  throw new LVLoadError(
    'size',
    `${fileName} ist zu groß (${formatMegabytes(bytes)} MB). ` +
      `Conocto liest Dateien bis ${MAX_FILE_BYTES / (1024 * 1024)} MB.`,
  );
}

/** Dateityp prüfen: der Dialog filtert nach Endung, Drag & Drop nicht. */
function pruefeDateityp(fileName: string): void {
  const endung = fileExtension(fileName);
  if (isGaebExtension(endung)) return;
  throw new LVLoadError(
    'dateityp',
    `${fileName}: Dateityp ${endung === null ? 'ohne Endung' : `„.${endung}"`} wird nicht ` +
      'gelesen. Erwartet wird GAEB DA XML (.x81 bis .x86 oder .xml, z. B. .x83).',
  );
}

/** Ab dieser Größe lohnt der Worker-Umweg inkl. structuredClone des Drafts. */
const WORKER_THRESHOLD_POSITIONS = 500;

function countPositions(draft: LVDraft): number {
  let total = 0;
  const visitSections = (sections: LVDraft['lots'][number]['sections']): void => {
    for (const section of sections) {
      total += section.positions.length;
      visitSections(section.sections);
    }
  };
  for (const lot of draft.lots) visitSections(lot.sections);
  return total;
}

function createWorker(): Worker | null {
  if (typeof Worker === 'undefined') return null;
  try {
    return new Worker(new URL('./pipeline.worker.ts', import.meta.url), { type: 'module' });
  } catch {
    // Umgebung ohne Modul-Worker (z. B. jsdom) — der synchrone Pfad übernimmt.
    return null;
  }
}

function classifyInWorker(
  parts: PipelinePart[],
  onNotice: ((message: string) => void) | undefined,
): Promise<LoadedLV> | null {
  const worker = createWorker();
  if (worker === null) return null;

  return new Promise<LoadedLV>((resolve, reject) => {
    // Der Worker kann nach einem Ausfall noch ein zweites Ereignis melden
    // (z. B. erst `messageerror`, dann `error`); gerechnet wird nur einmal.
    let ausgefallen = false;
    const rechneWeiter = (): void => {
      if (ausgefallen) return;
      ausgefallen = true;
      worker.terminate();
      // Der Worker konnte nicht starten/laufen oder seine Antwort nicht
      // zustellen — synchron zu Ende rechnen, statt den Import scheitern zu
      // lassen, und es sagen: die Wartezeit ist sonst unerklärlich.
      onNotice?.(WORKER_AUSFALL_HINWEIS);
      try {
        resolve(classifyAndBuildParts(parts));
      } catch (error) {
        reject(error);
      }
    };
    worker.onmessage = (event: MessageEvent<PipelineResponse>) => {
      if (ausgefallen) return;
      worker.terminate();
      const response = event.data;
      if (response.ok) resolve(response.result);
      else reject(toLoadError(response));
    };
    worker.onerror = rechneWeiter;
    // Die Antwort ließ sich nicht deserialisieren: ohne diesen Handler bliebe
    // der Import für immer im Ladezustand hängen.
    worker.onmessageerror = rechneWeiter;
    const request: PipelineRequest = { parts };
    worker.postMessage(request);
  });
}

/**
 * Rohbytes einer GAEB-Datei vollständig im Browser verarbeiten. Gemeinsamer
 * Weg für die gewählte Datei und das mitgelieferte Demo-LV — beide sollen
 * dieselbe Worker-Schwelle und dieselben Fehlermeldungen bekommen.
 *
 * @throws {LVLoadError} mit verständlicher Meldung für die UI.
 */
export async function loadLvFromBytes(
  bytes: ArrayBuffer,
  fileName: string,
  options: LoadOptions = {},
): Promise<LoadedLV> {
  pruefeGroesse(bytes.byteLength, fileName);
  // Messpunkt „erste Ansicht": alles von den Rohbytes bis zum fertigen Baum
  // (docs/scope.md, Ziel < 5 s bei ~10k Positionen).
  return measureAsync('LV laden', () => parseClassifyBuild(bytes, fileName, options));
}

async function parseClassifyBuild(
  bytes: ArrayBuffer,
  fileName: string,
  options: LoadOptions,
): Promise<LoadedLV> {
  return classifyParts([parsePart(bytes, fileName, 'LV1')], options);
}

/**
 * Datei-ID und Draft einer Datei. Datei-ID für teilbare Links (Entscheidung 0055) — aus
 * denselben Bytes wie der Parser. Läuft wie der Parser im Haupt-Thread: der Worker bekommt
 * nur den Draft, nicht die Bytes. Gemessen ~60 ms für 5 MB (≈ 10k Positionen), ~0,5 s für
 * die Obergrenze 50 MB.
 *
 * @throws {LVLoadError}
 */
function parsePart(bytes: ArrayBuffer, fileName: string, key: string): PipelinePart {
  const fileId = fileIdOf(bytes);
  try {
    // Bytes, nicht Text — das Encoding steht in der XML-Deklaration.
    return { draft: parseToDraft(bytes, fileName), fileName, fileId, key };
  } catch (error) {
    throw toLoadError(toPipelineError(error), error);
  }
}

async function classifyParts(parts: PipelinePart[], options: LoadOptions): Promise<LoadedLV> {
  try {
    const total = parts.reduce((sum, part) => sum + countPositions(part.draft), 0);
    if (total >= WORKER_THRESHOLD_POSITIONS) {
      const viaWorker = classifyInWorker(parts, options.onNotice);
      if (viaWorker !== null) return await viaWorker;
    }
    return classifyAndBuildParts(parts);
  } catch (error) {
    if (error instanceof LVLoadError) throw error;
    throw toLoadError(toPipelineError(error), error);
  }
}

/** Eine GAEB-Datei unter mehreren, mit ihrer Kennung („LV2", Entscheidung 0110). */
export interface LvSource {
  readonly key: string;
  readonly fileName: string;
  readonly bytes: ArrayBuffer;
}

export interface LoadedLvs {
  readonly lv: LoadedLV;
  /** Die Quellen, die im LV stecken — ohne die unlesbaren und doppelten. */
  readonly sources: readonly LvSource[];
  /** Unlesbare Dateien mit Meldung; die übrigen sind trotzdem geladen. */
  readonly failed: ReadonlyArray<{ fileName: string; message: string }>;
  /** Dateien, deren Inhalt schon geladen ist (gleiche Datei-ID). */
  readonly duplicates: readonly string[];
}

/**
 * Mehrere GAEB-Dateien zu einem LV (Entscheidung 0110). Eine kaputte Datei bricht die
 * anderen nicht ab; nur wenn keine lesbar ist, scheitert das Laden mit der ersten Meldung.
 *
 * @throws {LVLoadError}
 */
export async function loadLvsFromBytes(
  sources: readonly LvSource[],
  options: LoadOptions = {},
): Promise<LoadedLvs> {
  return measureAsync('LVs laden', async () => {
    const parts: PipelinePart[] = [];
    const kept: LvSource[] = [];
    const failed: Array<{ fileName: string; message: string }> = [];
    const duplicates: string[] = [];
    let firstError: LVLoadError | null = null;
    for (const source of sources) {
      try {
        pruefeGroesse(source.bytes.byteLength, source.fileName);
        const part = parsePart(source.bytes, source.fileName, source.key);
        if (parts.some((known) => known.fileId === part.fileId)) {
          duplicates.push(source.fileName);
          continue;
        }
        parts.push(part);
        kept.push(source);
      } catch (error) {
        const loadError =
          error instanceof LVLoadError ? error : toLoadError(toPipelineError(error), error);
        firstError ??= loadError;
        failed.push({ fileName: source.fileName, message: loadError.message });
      }
    }
    if (parts.length === 0) {
      throw firstError ?? new LVLoadError('leer', 'Keine GAEB-Datei zum Lesen.');
    }
    return { lv: await classifyParts(parts, options), sources: kept, failed, duplicates };
  });
}

/**
 * Lädt eine GAEB-Datei vollständig im Browser.
 *
 * @throws {LVLoadError} mit verständlicher Meldung für die UI.
 */
export async function loadLv(file: File, options: LoadOptions = {}): Promise<LoadedLV> {
  return loadLvFromBytes(await readLvFile(file), file.name, options);
}

/**
 * Prüft Dateityp und Größe und liest dann die Bytes. Getrennt von `loadLv`, damit
 * die Startseite dieselben Bytes auch speichern kann, ohne die Datei zweimal zu lesen.
 *
 * @throws {LVLoadError} bei falschem Dateityp oder zu großer Datei.
 */
export async function readLvFile(file: File): Promise<ArrayBuffer> {
  // Beides vor dem Lesen: eine zu große Datei soll gar nicht erst in den
  // Speicher kommen, und ein falscher Dateityp keine Parser-Meldung erzeugen.
  pruefeDateityp(file.name);
  pruefeGroesse(file.size, file.name);
  return file.arrayBuffer();
}
