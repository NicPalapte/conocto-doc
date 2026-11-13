// LVs in der laufenden Sitzung dazunehmen und schließen (Entscheidung 0110). Ein Weg für
// das Logo-Menü „Dokument hinzufügen…", das Ablegen auf der App und den Bereich
// „Dokument": PDFs gehen an `DocumentsProvider`, GAEB-Dateien kommen als weiteres LV dazu.
//
// Ein LV dazu oder weg rechnet den Baum aus allen Quellen neu (Parser, Klassifizierung,
// Prüfung, Beziehungen über alle LVs). Notizen wandern über den Positions-Hash mit
// (`carryOver`); Filter, Auswahl und Ansicht bleiben.

import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import { fileExtension, GAEB_ENDUNGEN, isGaebExtension } from '@core';
import { carryOver, positionMoves } from '../../lib/annotations';
import { isPdfFile } from '../../lib/docs/pdf';
import { saveProject } from '../../lib/persist/project';
import {
  loadLvsFromBytes,
  LVLoadError,
  readLvFile,
  type LoadedLvs,
  type LvSource,
} from '../../lib/pipeline/loadLv';
import { UNEXPECTED_FAILURE } from '../../lib/pipeline/messages';
import { indexNodes } from '../../lib/tree/buildTree';
import { countEvent } from '../../lib/usage/count';
import { useViewer, useViewerDispatch, type ViewerState } from '../../state/viewer';
import { useDocuments } from './DocumentsProvider';

/** Ab so vielen LVs oder Positionen ein Hinweis, kein Stopp (Entscheidung 0110). */
export const MANY_FILES = 8;
export const MANY_POSITIONS = 10_000;

/** Dateidialog „Dokument hinzufügen…": PDF und GAEB, in beiden Schreibweisen der Endung. */
export const DOCUMENT_ACCEPT = ['pdf', ...GAEB_ENDUNGEN]
  .flatMap((endung) => [`.${endung}`, `.${endung.toUpperCase()}`])
  .concat('application/pdf')
  .join(',');

/** PDF oder GAEB (x81–x86, xml), erkannt an Typ bzw. Endung. */
export function isDocumentFile(file: File): boolean {
  return isPdfFile(file) || isGaebExtension(fileExtension(file.name));
}

export interface LvFilesValue {
  /** PDFs und GAEB-Dateien gemischt; die App erkennt die Art an der Endung. */
  addFiles: (files: readonly File[]) => Promise<void>;
  /** LV schließen; das letzte bleibt (dafür „Anderes LV öffnen"). */
  removeLv: (key: string) => Promise<void>;
  /** Ein LV wird gerade dazugenommen oder geschlossen. */
  readonly busy: boolean;
}

const LvFilesContext = createContext<LvFilesValue | null>(null);

export function useLvFiles(): LvFilesValue {
  const value = useContext(LvFilesContext);
  if (value === null) throw new Error('useLvFiles muss innerhalb von <LvFilesProvider> stehen');
  return value;
}

/** Wie `useLvFiles`, aber `null` ohne Provider — für ausgelagerte Fenster. */
export function useOptionalLvFiles(): LvFilesValue | null {
  return useContext(LvFilesContext);
}

/** Kleinste freie Kennung „LVn"; Kennungen geschlossener LVs werden wieder frei. */
export function nextKeys(used: readonly string[], count: number): string[] {
  const taken = new Set(used);
  const out: string[] = [];
  for (let n = 1; out.length < count; n++) {
    const key = `LV${n}`;
    if (!taken.has(key)) out.push(key);
  }
  return out;
}

export function LvFilesProvider({ children }: { children: ReactNode }) {
  const viewer = useViewer();
  const dispatch = useViewerDispatch();
  const { openFiles } = useDocuments();
  const [busy, setBusy] = useState(false);
  // Aktueller Stand für die asynchronen Schritte; der Render-Wert wäre nach `await` alt.
  const latest = useRef<ViewerState>(viewer);
  useLayoutEffect(() => {
    latest.current = viewer;
  });
  // Nacheinander, nie zwei Neuberechnungen zugleich: sonst überholte die zweite die erste.
  const queue = useRef<Promise<void>>(Promise.resolve());

  const notice = useCallback(
    (message: string): void => dispatch({ type: 'notice', message }),
    [dispatch],
  );

  /** Baum aus `sources` neu rechnen und übernehmen. */
  const rebuild = useCallback(
    async (sources: readonly LvSource[]): Promise<LoadedLvs | null> => {
      const before = latest.current;
      if (before.lv === null) return null;
      let result: LoadedLvs;
      try {
        result = await loadLvsFromBytes(sources, { onNotice: notice });
      } catch (cause) {
        if (!(cause instanceof LVLoadError) || cause.code === 'unknown') {
          console.error('Unerwarteter Fehler beim Laden:', cause);
        }
        notice(cause instanceof LVLoadError ? cause.message : UNEXPECTED_FAILURE);
        return null;
      }
      // Inzwischen ein anderes Projekt geöffnet oder geschlossen: Ergebnis verwerfen.
      const now = latest.current;
      if (now.session !== before.session || now.lv === null) return null;
      const oldNodes = [...indexNodes(now.lv.tree).values()];
      const newNodes = [...indexNodes(result.lv.tree).values()];
      dispatch({
        type: 'lvsChanged',
        lv: result.lv,
        sources: result.sources,
        annotations: carryOver(now.annotations, oldNodes, newNodes),
        moved: positionMoves(oldNodes, newNodes),
      });
      for (const { fileName, message } of result.failed) {
        notice(message.startsWith(fileName) ? message : `${fileName}: ${message}`);
      }
      for (const fileName of result.duplicates) notice(`${fileName} ist schon geladen.`);
      const { files, summary } = result.lv;
      if (
        files.length > 1 &&
        (files.length >= MANY_FILES || summary.positionCount >= MANY_POSITIONS)
      ) {
        notice(
          `${files.length} LVs mit zusammen ${summary.positionCount.toLocaleString('de-DE')} ` +
            'Positionen sind offen. Die App kann dabei langsamer werden.',
        );
      }
      // Gespeichertes Projekt: die LVs mit merken, Notizen bleiben (Entscheidung 0110).
      if (now.persistId !== null) {
        void saveProject(result.lv, result.sources, now.persistId, true);
      }
      return result;
    },
    [dispatch, notice],
  );

  const enqueue = useCallback((task: () => Promise<void>): Promise<void> => {
    const run = queue.current.then(async () => {
      setBusy(true);
      try {
        await task();
      } finally {
        setBusy(false);
      }
    });
    queue.current = run.catch(() => undefined);
    return run;
  }, []);

  const addFiles = useCallback(
    async (files: readonly File[]): Promise<void> => {
      const pdfs = files.filter(isPdfFile);
      const gaeb = files.filter(
        (file) => !isPdfFile(file) && isGaebExtension(fileExtension(file.name)),
      );
      const other = files.filter((file) => !isDocumentFile(file));
      if (other.length > 0) {
        notice(
          `Nicht gelesen: ${other.map((file) => file.name).join(', ')}. ` +
            'Erwartet werden PDF oder GAEB (.x81 bis .x86, .xml).',
        );
      }
      if (pdfs.length > 0) void openFiles(pdfs);
      if (gaeb.length === 0) return;
      await enqueue(async () => {
        const { sources, lv } = latest.current;
        // Ohne Bytes des offenen LV (Test ohne Datei) lässt sich nichts dazurechnen.
        if (lv === null || sources.length === 0) return;
        const keys = nextKeys(
          sources.map((source) => source.key),
          gaeb.length,
        );
        const added: LvSource[] = [];
        for (const [i, file] of gaeb.entries()) {
          try {
            added.push({ key: keys[i], fileName: file.name, bytes: await readLvFile(file) });
          } catch (cause) {
            notice(cause instanceof LVLoadError ? cause.message : UNEXPECTED_FAILURE);
          }
        }
        if (added.length === 0) return;
        const result = await rebuild([...sources, ...added]);
        if (result !== null && result.sources.length > sources.length)
          countEvent('lv-hinzugefuegt');
      });
    },
    [enqueue, notice, openFiles, rebuild],
  );

  const removeLv = useCallback(
    (key: string): Promise<void> =>
      enqueue(async () => {
        const { sources } = latest.current;
        if (sources.length < 2) return;
        const rest = sources.filter((source) => source.key !== key);
        if (rest.length === sources.length) return;
        if ((await rebuild(rest)) !== null) countEvent('lv-geschlossen');
      }),
    [enqueue, rebuild],
  );

  const value = useMemo(() => ({ addFiles, removeLv, busy }), [addFiles, removeLv, busy]);
  return <LvFilesContext.Provider value={value}>{children}</LvFilesContext.Provider>;
}
