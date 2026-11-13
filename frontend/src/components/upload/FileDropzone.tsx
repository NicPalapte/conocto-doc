// Datei laden → lokale Pipeline anstoßen. Drag & Drop + Datei-Dialog, dazu das
// mitgelieferte Demo-Projekt zum Ausprobieren ohne eigene Datei: LV mit Preisen,
// verknüpfte PDFs und ein Plan mit Messung (lib/pipeline/loadDemoLv.ts, Entscheidung 0100).
// Die Datei verlässt den Browser nie: kein Upload. Die zuletzt geöffnete eigene
// Datei bleibt in der IndexedDB dieses Browsers (Entscheidung 0046, lib/persist).

import { useCallback, useEffect, useRef, useState } from 'react';
import { ConoctoLogo } from '@conocto/design';
import {
  DEMO_PROJEKT,
  loadDemoLv,
  takeDemoFromUrl,
  type DemoProjekt,
} from '../../lib/pipeline/loadDemoLv';
import { handOverDocs } from '../../lib/docs/pendingDocs';
import { GAEB_ENDUNGEN } from '@core';
import { formatPositions, formatWhen } from '../../lib/format';
import {
  clearLastLv,
  newPersistId,
  persistIdOf,
  readLastLv,
  readLastLvMeta,
  storedSources,
  touchLastLv,
  type LastLvInfo,
} from '../../lib/persist/lastLv';
import {
  loadLvsFromBytes,
  LVLoadError,
  MAX_FILE_BYTES,
  readLvFile,
  type LoadedLvs,
  type LvSource,
} from '../../lib/pipeline/loadLv';
import { isPdfFile } from '../../lib/docs/pdf';
import { saveProject } from '../../lib/persist/project';
import { MANY_FILES, MANY_POSITIONS } from '../docs/LvFilesProvider';
import { indexNodes } from '../../lib/tree/buildTree';
import { UNEXPECTED_FAILURE } from '../../lib/pipeline/messages';
import { countEvent } from '../../lib/usage/count';
import { usePaintNames } from '../../state/paintNames';
import { useViewer, useViewerDispatch } from '../../state/viewer';
import { rekey, storageKeys, type Annotations } from '../../lib/annotations';
import { downloadText, exportFileName } from '../../lib/export/download';
import { notesFileText } from '../../lib/notesFile';
import { exportFehler } from '../common/useMitnehmen';
import type { LoadedLV } from '../../lib/pipeline/runPipeline';

/** Ergebnis eines Ladewegs: das LV und, wenn gespeichert, seine Notizen. */
interface Geladen {
  lv: LoadedLV;
  annotations?: Annotations;
  persistId?: string | null;
  /** Bytes der LVs, damit in der Sitzung weitere dazukommen können (Entscheidung 0110). */
  sources?: readonly LvSource[];
}

// Der Dateidialog unterscheidet Groß- und Kleinschreibung der Endung je nach System.
// PDFs dürfen mit (Entscheidung 0110): sie öffnen neben dem LV im Bereich „Dokument“.
const ACCEPT = [...GAEB_ENDUNGEN, 'pdf']
  .flatMap((endung) => [`.${endung}`, `.${endung.toUpperCase()}`])
  .join(',');
const MAX_MB = MAX_FILE_BYTES / (1024 * 1024);
const DATEI_BLEIBT =
  'Kein Server, kein Upload, kein Konto. Die zuletzt geöffnete Datei bleibt in diesem ' +
  'Browser gespeichert, bis du sie löschst.';

export function FileDropzone() {
  const { loading, error } = useViewer();
  const { names } = usePaintNames();
  const dispatch = useViewerDispatch();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  // Beim Überfahren von Kindelementen feuert dragleave, obwohl der Zeiger die
  // Ablage nie verlassen hat — deshalb wird gezählt statt geschaltet.
  const dragDepth = useRef(0);
  const [letzte, setLetzte] = useState<LastLvInfo | null>(null);

  useEffect(() => {
    let aktiv = true;
    void readLastLvMeta().then((meta) => {
      if (aktiv) setLetzte(meta);
    });
    return () => {
      aktiv = false;
    };
  }, []);

  /**
   * Ein Ladeweg, eine Fehlerbehandlung — Datei wie Demo-LV. `load` bekommt eine
   * Funktion, mit der es Hinweise melden kann; sie erscheinen nach dem Laden in
   * der Hinweisleiste, weil die Startseite dann verschwunden ist.
   */
  const run = useCallback(
    async (
      load: (onNotice: (message: string) => void) => Promise<Geladen>,
      vorab: readonly string[] = [],
    ): Promise<LoadedLV | null> => {
      dispatch({ type: 'loading' });
      const notices = [...vorab];
      try {
        const { lv, annotations, persistId, sources } = await load((message) =>
          notices.push(message),
        );
        dispatch({ type: 'loaded', lv, notices, annotations, persistId, sources });
        return lv;
      } catch (cause) {
        countEvent('laden-fehlgeschlagen');
        // Ein erwarteter Fehler (leere Datei, falsches Format …) erklärt sich selbst.
        // Ein unerwarteter ist ein Bug: seine Ursache steht am Fehler und gehört in
        // die Konsole, genau wie bei einem Absturz (ErrorBoundary). Die UI zeigt
        // trotzdem nur den deutschen Satz; der Systemtext wäre Englisch.
        if (!(cause instanceof LVLoadError) || cause.code === 'unknown') {
          console.error('Unerwarteter Fehler beim Laden:', cause);
        }
        dispatch({
          type: 'error',
          message: cause instanceof LVLoadError ? cause.message : UNEXPECTED_FAILURE,
        });
        return null;
      }
    },
    [dispatch],
  );

  /**
   * Demo-Projekt öffnen: Notizen gehen, bleiben aber nur in der Sitzung (`persistId`
   * fehlt). Die PDFs öffnet der Bereich „Dokument“, sobald das LV da ist.
   */
  const runDemo = useCallback(
    (demo: DemoProjekt): void => {
      void run(async (onNotice) => {
        const { lv, annotations, docs, bytes } = await loadDemoLv(demo, { onNotice });
        handOverDocs(lv, docs);
        return { lv, annotations, sources: [{ key: 'LV1', fileName: lv.fileName, bytes }] };
      }).then((lv) => {
        if (lv !== null) countEvent('demo-geoeffnet');
      });
    },
    [run],
  );

  // „Demo starten" auf der Startseite verlinkt `doc/?demo=projekt`: die Demo öffnet
  // direkt. Der Parameter verschwindet beim ersten Lesen — im StrictMode-Doppellauf
  // findet der zweite Durchgang deshalb nichts mehr.
  useEffect(() => {
    const demo = takeDemoFromUrl();
    if (demo !== undefined) runDemo(demo);
  }, [runDemo]);

  const handleFiles = useCallback(
    async (files: readonly File[]): Promise<void> => {
      // Gemischt ablegen (Entscheidung 0110): GAEB-Dateien werden LVs, PDFs öffnen danach
      // im Bereich „Dokument“. Die Art erkennt die App an der Endung.
      const pdfs = files.filter(isPdfFile);
      const gaeb = files.filter((file) => !isPdfFile(file));
      if (gaeb.length === 0) {
        if (pdfs.length > 0) {
          dispatch({
            type: 'error',
            message: 'Bitte mindestens eine GAEB-Datei mit auswählen. PDFs kommen zum LV dazu.',
          });
        }
        return;
      }
      // Die Bytes einmal lesen und für Laden und Speichern teilen: eine Datei bis
      // 50 MB nicht zweimal im Speicher, und kein zweites Lesen, das scheitern kann.
      // In einem Behälter: TypeScript sieht die Zuweisung im Ladeweg sonst nicht.
      const halter: { geladen: LoadedLvs | null } = { geladen: null };
      const lv = await run(async (onNotice) => {
        const sources: LvSource[] = [];
        let ersterFehler: unknown = null;
        for (const [i, file] of gaeb.entries()) {
          try {
            sources.push({ key: `LV${i + 1}`, fileName: file.name, bytes: await readLvFile(file) });
          } catch (fehler) {
            // Eine unlesbare Datei bricht die anderen nicht ab (Entscheidung 0110).
            ersterFehler ??= fehler;
            if (gaeb.length > 1 && fehler instanceof LVLoadError) onNotice(fehler.message);
          }
        }
        if (sources.length === 0) throw ersterFehler;
        const geladen = await loadLvsFromBytes(sources, { onNotice });
        halter.geladen = geladen;
        meldeLadeHinweise(geladen, onNotice);
        handOverDocs(geladen.lv, pdfs);
        return { lv: geladen.lv, sources: geladen.sources };
      });
      // Erst nach erfolgreichem Laden merken: eine kaputte Datei soll nicht die
      // letzte gute ersetzen. Demo-LVs werden nie gespeichert.
      const ergebnis = halter.geladen;
      if (lv === null || ergebnis === null) return;
      countEvent('datei-geoeffnet');
      const persistId = newPersistId();
      // Die Kennung erst nach dem Speichern setzen: scheitert es (volle oder
      // gesperrte IndexedDB), bleiben Notizen sichtbar in der Sitzung. Was schon
      // während des Speicherns entstand, schreibt useSaveAnnotations danach.
      if (await saveProject(lv, ergebnis.sources, persistId, false)) {
        dispatch({ type: 'persisted', lv, persistId });
      }
    },
    [run, dispatch],
  );

  /**
   * Neue Datei gewählt. Hat die gespeicherte Datei Notizen, fragt das Feld „Letzte
   * Datei" erst nach: die neue Datei ersetzt sie samt Notizen (Entscheidung 0061).
   */
  const [wartend, setWartend] = useState<readonly File[] | null>(null);
  const waehleDateien = (files: FileList | null | undefined): void => {
    // Kopie: der Dateidialog wird gleich zurückgesetzt, die FileList dann leer.
    const liste = Array.from(files ?? []);
    if (liste.length === 0) return;
    if (letzte !== null && letzte.marked + letzte.comments + letzte.painted + letzte.docMarks > 0)
      setWartend(liste);
    else void handleFiles(liste);
  };

  const openLetzte = (): void => {
    if (loading) return;
    void (async () => {
      const lv = await run(async (onNotice) => {
        const gespeichert = await readLastLv();
        if (gespeichert === null) {
          setLetzte(null);
          throw new LVLoadError(
            'gespeichert',
            'Die zuletzt geöffnete Datei ist in diesem Browser nicht mehr gespeichert.',
          );
        }
        const geladen = await loadLvsFromBytes(storedSources(gespeichert), { onNotice });
        meldeLadeHinweise(geladen, onNotice);
        const { lv } = geladen;
        // Gespeichert unter dem Positions-Hash, in der Sitzung unter der Knoten-ID.
        const keys = storageKeys(indexNodes(lv.tree).values());
        return {
          lv,
          annotations: rekey(gespeichert.annotations, keys.toNode),
          persistId: persistIdOf(gespeichert.meta),
          sources: geladen.sources,
        };
      });
      // Zeitpunkt auffrischen, damit „gestern 16:42" das letzte Öffnen meint.
      if (lv === null) return;
      countEvent('letzte-datei-geoeffnet');
      await touchLastLv(Date.now());
    })();
  };

  const vergiss = (): void => {
    void clearLastLv().then((geloescht) => {
      // Feld nur ausblenden, wenn wirklich gelöscht: sonst tauchte die Datei beim
      // nächsten Besuch wieder auf, obwohl die Startseite „gelöscht" gezeigt hat.
      if (geloescht) {
        setLetzte(null);
        return;
      }
      dispatch({
        type: 'error',
        message:
          'Die gespeicherte Datei konnte nicht gelöscht werden. ' +
          'Bitte die Website-Daten im Browser löschen.',
      });
    });
  };

  /**
   * Notizen der gespeicherten Datei als Notiz-Datei (Entscheidung 0061). Gelöscht wird
   * erst nach einer zweiten Bestätigung: ob der Browser die Datei wirklich gespeichert
   * hat (Dialog abgebrochen, Download blockiert), erfährt die Seite nicht.
   */
  const sichereNotizen = async (): Promise<boolean> => {
    try {
      const gespeichert = await readLastLv();
      if (gespeichert === null) throw new Error('Keine gespeicherte Datei');
      // OZ und Kurztext stehen nur in der Datei selbst — also einmal einlesen.
      const { lv } = await loadLvsFromBytes(storedSources(gespeichert));
      const knoten = [...indexNodes(lv.tree).values()];
      const annotations = rekey(gespeichert.annotations, storageKeys(knoten).toNode);
      downloadText(
        exportFileName(lv.fileName, 'arbeitsstand', 'json'),
        notesFileText(annotations, knoten, lv, Date.now(), names),
        'json',
      );
      countEvent('notizen-gesichert');
      return true;
    } catch (fehler) {
      console.error(fehler);
      dispatch({ type: 'error', message: exportFehler('Die Arbeitsstand-Datei') });
      return false;
    }
  };

  const openDemo = (): void => {
    if (!loading) runDemo(DEMO_PROJEKT);
  };

  const openDialog = (): void => {
    if (loading) return;
    inputRef.current?.click();
  };

  return (
    <div className="start">
      <div className="start-in">
        <div className="start-brand">
          <ConoctoLogo size={40} />
          <h1 className="sr-only">conocto – LV-Viewer</h1>
          <p className="start-tag">Erlebe dein Leistungsverzeichnis wie nie zuvor.</p>
        </div>

        <div className="start-grid">
          <div className="start-col">
            <div
              onDragEnter={(event) => {
                event.preventDefault();
                dragDepth.current += 1;
                if (!loading) setDragging(true);
              }}
              onDragOver={(event) => event.preventDefault()}
              onDragLeave={() => {
                dragDepth.current = Math.max(0, dragDepth.current - 1);
                if (dragDepth.current === 0) setDragging(false);
              }}
              onDrop={(event) => {
                event.preventDefault();
                dragDepth.current = 0;
                setDragging(false);
                // Während ein Import läuft, würde eine zweite Datei den ersten Lauf
                // überholen und das Ergebnis wäre nicht mehr vorhersagbar.
                if (loading) return;
                waehleDateien(event.dataTransfer.files);
              }}
              onClick={openDialog}
              aria-busy={loading}
              className={`start-card start-drop${dragging ? ' over' : ''}`}
              style={{ cursor: loading ? 'progress' : 'pointer' }}
            >
              <span className="start-ring" aria-hidden="true">
                ⇪
              </span>
              <h2 className="start-title">Eigenes LV öffnen</h2>
              <span className="start-sub">GAEB-Datei hierher ziehen</span>
              {/*
              Der Klick auf die Fläche ist eine Mausbequemlichkeit; die bedienbare
              Schaltfläche ist dieser Knopf (fokussierbar, Enter/Leertaste). Sein
              Klick darf nicht zusätzlich auf der Fläche landen, sonst öffnet sich
              der Dateidialog zweimal.
            */}
              <button
                type="button"
                className="start-btn primary"
                onClick={(event) => {
                  event.stopPropagation();
                  openDialog();
                }}
              >
                {loading ? 'Wird gelesen…' : 'Datei auswählen'}
              </button>
              <span className="start-meta">x81 – x86 · xml · auch mehrere, gern mit PDF · bis {MAX_MB} MB</span>
              <input
                ref={inputRef}
                type="file"
                accept={ACCEPT}
                multiple
                className="hidden"
                aria-label="GAEB-Datei auswählen"
                onClick={(event) => event.stopPropagation()}
                onChange={(event) => {
                  waehleDateien(event.target.files);
                  // Zurücksetzen, damit dieselbe Datei erneut gewählt werden kann.
                  event.target.value = '';
                }}
              />
            </div>
            {letzte !== null && (
              <LetzteDatei
                meta={letzte}
                loading={loading}
                onOpen={() => {
                  setWartend(null);
                  openLetzte();
                }}
                onForget={vergiss}
                onSaveNotes={sichereNotizen}
                neueDatei={wartend === null ? null : dateiNamen(wartend)}
                onReplace={() => {
                  const dateien = wartend;
                  setWartend(null);
                  if (dateien !== null) void handleFiles(dateien);
                }}
                onKeepOld={() => setWartend(null)}
              />
            )}
          </div>

          <div className="start-card start-demo">
            <DemoArt />
            <h2 className="start-title">Demo-Projekt ansehen</h2>
            <span className="start-sub">{DEMO_PROJEKT.title}</span>
            <span className="start-meta">{DEMO_PROJEKT.hint}</span>
            <span className="flex flex-wrap justify-center gap-[8px]">
              <button
                type="button"
                className="start-btn primary"
                onClick={openDemo}
                title={DEMO_PROJEKT.hint}
              >
                {DEMO_PROJEKT.label}
              </button>
            </span>
          </div>
        </div>

        {error !== null && (
          <div
            role="alert"
            className="w-full rounded-[var(--r-md)] border px-[12px] py-[10px] text-left font-mono text-[11.5px] leading-[1.6]"
            style={{ borderColor: 'var(--red)', background: 'var(--redS)', color: 'var(--redD)' }}
          >
            {error}
          </div>
        )}

        {/*
          Drei Sätze statt einer Anleitung: der Rest erschließt sich in der App.
          Die Frage „wo landet meine Datei" bleibt beantwortet (Issue #72).
        */}
        <ul className="start-tips">
          <li>
            <span className="start-tip-dot" aria-hidden="true" />
            Bubble anklicken öffnet die Details
          </li>
          <li>
            <span className="start-tip-ring" aria-hidden="true" />
            Hinweise stehen direkt im Graphen
          </li>
          <li title={DATEI_BLEIBT}>
            <span className="start-tip-lock" aria-hidden="true">
              ●
            </span>
            Die Datei bleibt im Browser
          </li>
        </ul>
      </div>
    </div>
  );
}

/** Unlesbare und doppelte Dateien beim Laden mehrerer LVs als Hinweis (Entscheidung 0110). */
function meldeLadeHinweise(geladen: LoadedLvs, onNotice: (message: string) => void): void {
  for (const { fileName, message } of geladen.failed) {
    onNotice(message.startsWith(fileName) ? message : `${fileName}: ${message}`);
  }
  for (const fileName of geladen.duplicates) onNotice(`${fileName} ist doppelt und fehlt daher.`);
  const { files, summary } = geladen.lv;
  if (files.length > 1 && (files.length >= MANY_FILES || summary.positionCount >= MANY_POSITIONS)) {
    onNotice(
      `${files.length} LVs mit zusammen ${summary.positionCount.toLocaleString('de-DE')} ` +
        'Positionen sind offen. Die App kann dabei langsamer werden.',
    );
  }
}

interface LetzteDateiProps {
  meta: LastLvInfo;
  loading: boolean;
  onOpen: () => void;
  onForget: () => void;
  /** Notizen als Datei sichern; `true`, wenn der Download angestoßen wurde. */
  onSaveNotes: () => Promise<boolean>;
  /** Name der neu gewählten Datei, solange die Frage „Ersetzen?" offen ist. */
  neueDatei: string | null;
  onReplace: () => void;
  /** Frage „Ersetzen?" verwerfen; die gespeicherte Datei bleibt. */
  onKeepOld: () => void;
}

/** „Rohbau.x83" oder „Rohbau.x83 + 2 weitere" (Entscheidung 0110). */
function mitWeiteren(erste: string, anzahl: number): string {
  return anzahl > 1 ? `${erste} + ${anzahl - 1} weitere` : erste;
}

function dateiNamen(dateien: readonly File[]): string {
  const gaeb = dateien.filter((datei) => !isPdfFile(datei));
  return mitWeiteren(gaeb[0]?.name ?? dateien[0]?.name ?? '', gaeb.length);
}

/** Name des gespeicherten Projekts für die Startseite. */
function projektName(meta: LastLvInfo): string {
  return mitWeiteren(meta.fileName, meta.files?.length ?? 1);
}

/** „⚑ 4 mit Marker · ✎ 7 Kommentare" — leer ohne Notizen. */
function notizText(meta: LastLvInfo): string {
  const teile: string[] = [];
  if (meta.marked > 0) teile.push(`⚑ ${meta.marked} mit Marker`);
  if (meta.comments > 0) {
    teile.push(`✎ ${meta.comments} ${meta.comments === 1 ? 'Kommentar' : 'Kommentare'}`);
  }
  if (meta.painted > 0) teile.push(`▍ ${meta.painted} mit Textmarkierung`);
  if (meta.docMarks > 0) teile.push(`▤ ${meta.docMarks} im Dokument`);
  return teile.join(' · ');
}

/** Feld unter der Ablage: zuletzt geöffnete Datei öffnen oder löschen. */
function LetzteDatei({
  meta,
  loading,
  onOpen,
  onForget,
  onSaveNotes,
  neueDatei,
  onReplace,
  onKeepOld,
}: LetzteDateiProps) {
  // Löschen fragt im Feld selbst nach; ein Browser-Dialog passt nicht zur Startseite.
  const [fragen, setFragen] = useState(false);
  const [gesichert, setGesichert] = useState(false);
  const notizen = notizText(meta);
  const abbrechen = (): void => {
    setFragen(false);
    setGesichert(false);
  };

  if (neueDatei !== null) {
    return (
      <div
        className="start-recent ask stack warn"
        role="group"
        aria-label="Gespeicherte Datei ersetzen"
      >
        <span className="start-recent-q">
          <b>
            {neueDatei} ersetzt {projektName(meta)}
          </b>
          <br />
          {notizen} gehen mit.
        </span>
        <span className="start-recent-acts">
          <button type="button" className="start-btn primary" onClick={onReplace}>
            Ersetzen
          </button>
          <button type="button" className="start-btn" onClick={onOpen}>
            ↺ {projektName(meta)} öffnen
          </button>
          <button type="button" className="start-btn" onClick={onKeepOld}>
            Abbrechen
          </button>
        </span>
      </div>
    );
  }

  if (fragen && gesichert) {
    return (
      <div
        className="start-recent ask stack"
        role="group"
        aria-label="Gespeichertes Projekt löschen"
      >
        <span className="start-recent-q">
          <b>Arbeitsstand heruntergeladen.</b>
          <br />
          Gespeicherte Datei jetzt löschen?
        </span>
        <span className="start-recent-acts">
          <button type="button" className="start-btn danger" onClick={onForget}>
            Löschen
          </button>
          <button type="button" className="start-btn" onClick={abbrechen}>
            Abbrechen
          </button>
        </span>
      </div>
    );
  }

  if (fragen && notizen !== '') {
    return (
      <div
        className="start-recent ask stack"
        role="group"
        aria-label="Gespeichertes Projekt löschen"
      >
        <span className="start-recent-q">
          <b>Gespeicherte Datei löschen?</b>
          <br />
          {notizen} gehen mit.
        </span>
        <span className="start-recent-acts">
          <button
            type="button"
            className="start-btn primary"
            onClick={() => void onSaveNotes().then(setGesichert)}
          >
            Arbeitsstand sichern + löschen
          </button>
          <button type="button" className="start-btn danger" onClick={onForget}>
            Löschen
          </button>
          <button type="button" className="start-btn" onClick={() => setFragen(false)}>
            Abbrechen
          </button>
        </span>
      </div>
    );
  }

  if (fragen) {
    return (
      <div className="start-recent ask" role="group" aria-label="Gespeichertes Projekt löschen">
        <span className="start-recent-q">Gespeicherte Datei löschen?</span>
        <button type="button" className="start-btn danger" onClick={onForget}>
          Löschen
        </button>
        <button type="button" className="start-btn" onClick={() => setFragen(false)}>
          Abbrechen
        </button>
      </div>
    );
  }

  return (
    <div
      className="start-recent"
      onClick={onOpen}
      aria-busy={loading}
      style={{ cursor: loading ? 'progress' : 'pointer' }}
    >
      <span className="start-recent-ic" aria-hidden="true">
        ↺
      </span>
      <span className="start-recent-txt">
        <span className="start-recent-name" title={projektName(meta)}>
          {projektName(meta)}
        </span>
        <span className="start-recent-meta">
          <span>{formatPositions(meta.positionCount)}</span>
          {meta.marked > 0 && <span className="start-recent-mk">⚑ {meta.marked} mit Marker</span>}
          {meta.comments > 0 && (
            <span className="start-recent-km">
              ✎ {meta.comments} {meta.comments === 1 ? 'Kommentar' : 'Kommentare'}
            </span>
          )}
          {meta.painted > 0 && <span>▍ {meta.painted} mit Textmarkierung</span>}
          {meta.docMarks > 0 && <span>▤ {meta.docMarks} im Dokument</span>}
          <span>{formatWhen(meta.savedAt)}</span>
        </span>
      </span>
      {/* Wie bei der Ablage: der Knopf ist das bedienbare Element, die Fläche Bequemlichkeit. */}
      <button
        type="button"
        className="start-btn primary"
        aria-label={`Letzte Datei öffnen: ${projektName(meta)}`}
        onClick={(event) => {
          event.stopPropagation();
          onOpen();
        }}
      >
        {loading ? 'Wird gelesen…' : 'Öffnen'}
      </button>
      <button
        type="button"
        className="start-recent-x"
        aria-label="Gespeicherte Datei löschen"
        title="Gespeicherte Datei löschen"
        onClick={(event) => {
          event.stopPropagation();
          setFragen(true);
        }}
      >
        ✕
      </button>
    </div>
  );
}

/** Kleines Bild auf der Demo-Karte: drei Gruppen mit Positionen, eine mit Hinweis. */
function DemoArt() {
  return (
    <svg className="start-art" viewBox="0 0 220 120" aria-hidden="true">
      <circle cx="70" cy="62" r="44" className="g g1" />
      <circle cx="150" cy="48" r="30" className="g g2" />
      <circle cx="168" cy="98" r="18" className="g g3" />
      <g className="p1">
        <circle cx="58" cy="50" r="6" />
        <circle cx="76" cy="46" r="4" />
        <circle cx="84" cy="64" r="7" />
        <circle cx="62" cy="72" r="5" />
        <circle cx="72" cy="88" r="4" />
        <circle cx="46" cy="66" r="3.5" />
        <circle cx="95" cy="80" r="3" />
      </g>
      <g className="p2">
        <circle cx="142" cy="42" r="5" />
        <circle cx="158" cy="52" r="4" />
        <circle cx="146" cy="60" r="3" />
        <circle cx="160" cy="36" r="3" />
      </g>
      <g className="p3">
        <circle cx="164" cy="96" r="3.5" />
        <circle cx="174" cy="100" r="2.5" />
      </g>
      <circle cx="84" cy="64" r="11" fill="none" stroke="var(--amber)" strokeWidth="2" />
    </svg>
  );
}
