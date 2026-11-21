// Geführte Tour über dem Hauptscreen (Mockup v7, Bereich K): ein Spotlight auf
// einem echten Bedienelement plus eine kleine Karte daneben. Das Spotlight
// fängt keine Klicks ab — wer mag, klickt das markierte Element selbst; manche
// Schritte warten genau darauf (`done` in tourSteps.ts).
//
// Die Tour hat drei Kapitel; jedes lässt sich überspringen (Entscheidung neu-tour-in-kapiteln).
// Nach dem ersten LV bietet Conocto sie einmal als Willkommenskarte in der Mitte an,
// der Graph dahinter abgedunkelt (0116). Ohne PDF läuft dann nur Kapitel 1; Kapitel 2
// und 3 bietet eine zweite Karte an, sobald das erste PDF da ist. „Später", Escape oder ein
// Tipp daneben schließen die Karten. Gesehen bleibt je Teil gemerkt (Entscheidung 0098).

import { useCallback, useEffect, useRef, useState } from 'react';
import { useViewer, useViewerDispatch } from '../../state/viewer';
import { readTourSeen, saveTourSeen, type TourSeen } from '../../lib/persist/lastLv';
import { useOptionalDocuments, type DocumentsApi } from '../docs/DocumentsProvider';
import { PdfInput } from '../docs/PdfInput';
import {
  CARD_TARGET,
  chapterStart,
  nextChapterStart,
  POINT_TARGET,
  TOUR_CHAPTERS,
  TOUR_STEPS,
  type TourPrepare,
} from './tourSteps';

/**
 * Abstand zwischen zwei Suchen nach dem Ziel. Der Punkt-Schritt sucht über alle
 * Punkte (bei ~10k Positionen ebenso viele Elemente) — das nicht in jedem Frame.
 */
const SEARCH_MS = 100;
/** So lange darf ein Ziel fehlen, bevor die Tour den Schritt überspringt. */
const MISSING_MS = 800;
/** Luft zwischen Element und Spotlight-Rand. */
const PAD = 6;
/** Kleinster Durchmesser des runden Spotlights — ein Punkt ist oft nur 6 px groß. */
const ROUND_MIN = 40;
const CARD_WIDTH = 300;
/** Platz, den die Karte unter dem Ziel braucht; sonst steht sie darüber. */
const CARD_SPACE = 190;
const EDGE = 12;

/** Breite der Willkommenskarte beim ersten Besuch. */
const OFFER_WIDTH = 360;
/** Knöpfe der Willkommenskarte: 44 px, gut mit dem Finger zu treffen. */
const BIG_BUTTON =
  'h-[44px] cursor-pointer rounded-[var(--r-sm)] border px-[18px] font-sans text-[14px]';

const BUTTON =
  'h-[28px] cursor-pointer rounded-[var(--r-sm)] border px-[10px] font-mono text-[11.5px]';

interface Box {
  top: number;
  left: number;
  width: number;
  height: number;
}

/** Erstes Element zum Selektor, das im Fenster sichtbar ist. */
function findVisible(selector: string): Element | null {
  for (const element of document.querySelectorAll(selector)) {
    if (isVisible(element.getBoundingClientRect())) return element;
  }
  return null;
}

/**
 * Ziel, das nur aus dem Bild gescrollt ist (Karte weiter unten im Überblick), ins Bild holen.
 * Ohne Fläche (zugeklappt, nicht gezeichnet) bleibt es weg, dann überspringt die Tour.
 */
function scrollToFirst(selector: string): boolean {
  const element = document.querySelector(selector);
  if (element === null) return false;
  const rect = element.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) return false;
  element.scrollIntoView({ block: 'nearest' });
  return true;
}

function isVisible(rect: DOMRect): boolean {
  if (rect.width === 0 && rect.height === 0) return false;
  return !(
    rect.right < 0 ||
    rect.bottom < 0 ||
    rect.left > window.innerWidth ||
    rect.top > window.innerHeight
  );
}

function sameBox(a: Box | null, b: Box | null): boolean {
  if (a === null || b === null) return a === b;
  return a.top === b.top && a.left === b.left && a.width === b.width && a.height === b.height;
}

/** Spotlight-Fläche: etwas größer als das Ziel, beim Punkt rund und mindestens ROUND_MIN. */
function spotBox(rect: Box, round: boolean): Box {
  if (!round) {
    return {
      top: rect.top - PAD,
      left: rect.left - PAD,
      width: rect.width + 2 * PAD,
      height: rect.height + 2 * PAD,
    };
  }
  const size = Math.max(ROUND_MIN, rect.width + 2 * PAD, rect.height + 2 * PAD);
  return {
    top: rect.top + rect.height / 2 - size / 2,
    left: rect.left + rect.width / 2 - size / 2,
    width: size,
    height: size,
  };
}

type CardPlace = { left: number; top: number } | { left: number; bottom: number };

/**
 * Karte unter das Ziel, sonst darüber. Ist das Ziel fast so hoch wie das Fenster
 * (Positionskarte), passt beides nicht — dann daneben, auf der Seite mit mehr Platz.
 */
function cardPlace(spot: Box, width: number, height: number): CardPlace {
  const clampX = (x: number): number =>
    Math.min(Math.max(EDGE, x), Math.max(EDGE, width - CARD_WIDTH - EDGE));
  const centered = clampX(spot.left + spot.width / 2 - CARD_WIDTH / 2);
  if (spot.top + spot.height + CARD_SPACE < height) {
    return { left: centered, top: spot.top + spot.height + EDGE };
  }
  if (spot.top > CARD_SPACE) return { left: centered, bottom: height - spot.top + EDGE };
  const roomLeft = spot.left;
  const roomRight = width - spot.left - spot.width;
  const left =
    roomLeft >= roomRight ? spot.left - CARD_WIDTH - EDGE : spot.left + spot.width + EDGE;
  const top = Math.min(
    Math.max(EDGE, spot.top + spot.height / 2 - CARD_SPACE / 2),
    height - CARD_SPACE,
  );
  return { left: clampX(left), top };
}

/** Ein PDF zeigen: das aktive, wenn es passt, sonst das erste passende. */
function showDoc(docs: DocumentsApi | null, plan: boolean): void {
  if (docs === null) return;
  const fits = (id: string): boolean => (docs.kindOf(id).kind === 'plan') === plan;
  const active = docs.active;
  const doc = active !== null && fits(active.id) ? active : docs.docs.find((d) => fits(d.id));
  if (doc === undefined) return;
  docs.activate(doc.id);
}

function runPrepare(
  prepare: TourPrepare,
  dispatch: ReturnType<typeof useViewerDispatch>,
  docs: DocumentsApi | null,
): void {
  switch (prepare) {
    case 'closeFilter':
      dispatch({ type: 'filterBar', open: false });
      return;
    case 'showOverview':
      dispatch({ type: 'showPane', pane: 'overview' });
      return;
    case 'showDocOverview':
      dispatch({ type: 'showPane', pane: 'doc' });
      docs?.setOverview(true);
      return;
    case 'showDocText':
    case 'showDocPlan':
      dispatch({ type: 'showPane', pane: 'doc' });
      showDoc(docs, prepare === 'showDocPlan');
      return;
    case 'closeSelection':
      dispatch({ type: 'closeSelection' });
      return;
    case 'showTable':
      // Die Tabelle ist beim Start zu (Entscheidung 0078); der Schritt zeigt sie.
      dispatch({ type: 'showPane', pane: 'table' });
      return;
    case 'ensureSelection': {
      // Wer den Punkt-Schritt übersprungen hat, bekommt trotzdem eine Karte:
      // der Klick läuft über denselben Weg wie ein echter Klick im Graphen.
      if (document.querySelector(CARD_TARGET) !== null) return;
      findVisible(POINT_TARGET)?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      return;
    }
  }
}

export function Tour() {
  const state = useViewer();
  const dispatch = useViewerDispatch();
  const { lv } = state;
  const { step: index, seen, until } = state.view.tour;
  const step = index === null ? undefined : TOUR_STEPS[index];
  const docs = useOptionalDocuments();
  const docsRef = useRef(docs);
  useEffect(() => {
    docsRef.current = docs;
  });
  const hasDocs = (docs?.docs.length ?? 0) > 0;

  /** Ende des laufenden Durchgangs: ohne PDF endet das Angebot nach dem LV-Kapitel. */
  const limit = until ?? TOUR_STEPS.length;
  /** Kapitel 2 und 3 in dieser Sitzung angeboten, gestartet oder abgelehnt. */
  const [docsAnswered, setDocsAnswered] = useState(false);
  /** Kapitel 1 ohne PDF ist durch: Karte „PDF hinzufügen“ zeigen. */
  const [askPdf, setAskPdf] = useState(false);
  /** Über diese Karte ein PDF gewählt: sobald es da ist, gleich weiter mit Kapitel 2. */
  const [wantDocsTour, setWantDocsTour] = useState(false);

  // Gesehen oder abgelehnt bleibt über das Neuladen gemerkt (Issue #191, Entscheidung 0098).
  // `null`, solange der Merker noch gelesen wird — bis dahin kein Angebot, sonst blitzt es auf.
  const [stored, setStored] = useState<TourSeen | null>(null);
  useEffect(() => {
    let active = true;
    void readTourSeen().then((value) => {
      if (active) setStored((current) => current ?? value);
    });
    return () => {
      active = false;
    };
  }, []);
  const savedSeen = useRef(false);
  useEffect(() => {
    if (!seen || stored === null || stored.lv || savedSeen.current) return;
    savedSeen.current = true;
    void saveTourSeen('lv');
  }, [seen, stored]);
  const savedDocs = useRef(false);
  useEffect(() => {
    if (!docsAnswered || stored === null || stored.unterlagen || savedDocs.current) return;
    savedDocs.current = true;
    void saveTourSeen('unterlagen');
  }, [docsAnswered, stored]);

  const [box, setBox] = useState<Box | null>(null);
  /** Richtung der letzten Bewegung — ein fehlendes Ziel wird in dieselbe Richtung übersprungen. */
  const direction = useRef<1 | -1>(1);

  // Die Tour schließt Karte und Filterleiste und wählt zur Vorführung selbst
  // einen Punkt. Danach gilt wieder der eigene Stand: beim Start merken, beim
  // Ende zurückgeben — außer ein neues LV ist inzwischen geladen.
  const { nodeId, positionId } = state.selection;
  const before = useRef<{
    lv: typeof lv;
    nodeId: string | null;
    positionId: string | null;
  }>(null);
  useEffect(() => {
    if (index !== null) {
      before.current ??= { lv, nodeId, positionId };
      return;
    }
    const saved = before.current;
    if (saved === null) return;
    before.current = null;
    if (saved.lv !== lv) return;
    if (saved.nodeId === nodeId && saved.positionId === positionId) return;
    dispatch({ type: 'selectPosition', nodeId: saved.nodeId, positionId: saved.positionId });
  }, [index, lv, nodeId, positionId, dispatch]);

  const go = useCallback(
    (next: number | null): void => {
      if (next !== null && index !== null) direction.current = next < index ? -1 : 1;
      const valid = next !== null && next >= 0 && next < limit;
      // Ende eines Durchgangs ohne PDF: nach Unterlagen fragen (nicht bei „Beenden“).
      if (next !== null && next >= limit && until !== null && !hasDocs) setAskPdf(true);
      // Wer die PDF-Kapitel erreicht, bekommt sie nicht noch einmal angeboten.
      if (valid && TOUR_STEPS[next]?.chapter !== 'lv') setDocsAnswered(true);
      dispatch({ type: 'tour', step: valid ? next : null });
    },
    [dispatch, index, limit, until, hasDocs],
  );

  // Beim Betreten eines Schritts den Bildschirm vorbereiten.
  useEffect(() => {
    if (index === null) return;
    for (const prepare of TOUR_STEPS[index]?.prepare ?? []) {
      runPrepare(prepare, dispatch, docsRef.current);
    }
  }, [index, dispatch]);

  // Ziel verfolgen: Bereiche, Zoom und Fenster verschieben es laufend.
  // Ein Frame-Takt ist billig (eine Abfrage) und braucht keine Beobachter je Ziel.
  useEffect(() => {
    if (index === null) return;
    const selector = TOUR_STEPS[index]?.target;
    if (selector === undefined) return;
    let frame = 0;
    let missingSince: number | null = null;
    let last: Box | null = null;
    // Gefundenes Ziel merken: je Frame dann nur ein `getBoundingClientRect`,
    // neu gesucht wird erst, wenn es weg oder aus dem Bild ist.
    let element: Element | null = null;
    let searchedAt = -Infinity;
    let scrolled = false;
    const tick = (): void => {
      const now = Date.now();
      let rect = element?.isConnected === true ? element.getBoundingClientRect() : null;
      if (rect !== null && !isVisible(rect)) rect = null;
      if (rect === null && now - searchedAt >= SEARCH_MS) {
        searchedAt = now;
        element = findVisible(selector);
        if (element === null && !scrolled) scrolled = scrollToFirst(selector);
        rect = element?.getBoundingClientRect() ?? null;
      }
      if (rect === null) {
        missingSince ??= now;
        if (now - missingSince > MISSING_MS) {
          go(index + direction.current);
          return;
        }
      } else {
        missingSince = null;
        const next = { top: rect.top, left: rect.left, width: rect.width, height: rect.height };
        if (!sameBox(last, next)) {
          last = next;
          setBox(next);
        }
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      setBox(null);
    };
  }, [index, go]);

  // Wartende Schritte gehen weiter, sobald man das Verlangte getan hat. Erst
  // „scharf", wenn die Bedingung im Schritt einmal nicht erfüllt war — sonst
  // spränge der Punkt-Schritt bei einer noch offenen Karte sofort weiter.
  const fulfilled = step?.done?.(state) ?? false;
  const armed = useRef<number | null>(null);
  useEffect(() => {
    if (index === null) return;
    if (!fulfilled) armed.current = index;
    else if (armed.current === index) go(index + 1);
  }, [fulfilled, index, go]);

  // Escape beendet die Tour — in der Capture-Phase, damit es nicht zusätzlich
  // die Auswahl zurücknimmt (ViewerPage).
  const offerLv = lv !== null && index === null && !seen && stored !== null && !stored.lv;
  const offerDocs =
    lv !== null &&
    index === null &&
    !offerLv &&
    hasDocs &&
    !docsAnswered &&
    !wantDocsTour &&
    stored !== null &&
    !stored.unterlagen;
  const offering = offerLv || offerDocs;
  // PDF über die Karte am Ende von Kapitel 1 gewählt: Kapitel 2 ohne zweite Nachfrage.
  const docsTourStarted = useRef(false);
  useEffect(() => {
    if (!wantDocsTour || !hasDocs || index !== null || docsTourStarted.current) return;
    docsTourStarted.current = true;
    // Erst jetzt gemerkt: scheitert das PDF, kommt die Karte „PDFs sind da“ später noch.
    if (!savedDocs.current) {
      savedDocs.current = true;
      void saveTourSeen('unterlagen');
    }
    // „Dokument hinzufügen“ ist gerade erledigt: gleich zur Übersicht der Unterlagen.
    dispatch({ type: 'tour', step: chapterStart('unterlagen') + 1 });
  }, [wantDocsTour, hasDocs, index, dispatch]);
  const decline = useCallback((): void => {
    // Mit PDFs gilt die erste Karte für alle Kapitel; sonst käme gleich die zweite.
    if (offerDocs || hasDocs) setDocsAnswered(true);
    go(null);
  }, [offerDocs, hasDocs, go]);
  const start = (): void => {
    if (offerDocs) {
      setDocsAnswered(true);
      go(chapterStart('unterlagen'));
      return;
    }
    if (hasDocs) {
      setDocsAnswered(true);
      go(0);
    } else {
      dispatch({ type: 'tour', step: 0, until: chapterStart('unterlagen') });
    }
  };
  useEffect(() => {
    if (index === null && !offering && !askPdf) return;
    const onKey = (event: KeyboardEvent): void => {
      if (event.key !== 'Escape') return;
      // Ein anderes offenes Fenster oder die Suche bekommt Escape zuerst.
      const target = event.target;
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) return;
      if (document.querySelector('[role="dialog"]:not([data-tour-card])') !== null) return;
      event.stopImmediatePropagation();
      if (index !== null) go(null);
      else if (askPdf) setAskPdf(false);
      else decline();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [index, offering, askPdf, go, decline]);

  if (lv === null) return null;

  if (index === null && askPdf) {
    return (
      <>
        <div
          aria-hidden="true"
          onClick={() => setAskPdf(false)}
          className="fixed inset-0 z-[50] bg-[var(--spot)]"
        />
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="tour-pdf-titel"
          data-tour-card=""
          className="ov-glass fixed left-1/2 top-1/2 z-[51] flex -translate-x-1/2 -translate-y-1/2 flex-col gap-[12px] p-[20px]"
          style={{ width: OFFER_WIDTH, maxWidth: `calc(100vw - ${2 * EDGE}px)` }}
        >
          <b id="tour-pdf-titel" className="font-display text-[18px] font-semibold text-ink">
            Unterlagen dazu?
          </b>
          <p className="m-0 font-sans text-[14px] leading-[1.45] text-dim">
            Lade ein PDF, zum Beispiel die Baubeschreibung oder einen Plan. Dann zeigt dir die Tour,
            wie du Stellen verknüpfst, misst und abarbeitest.
          </p>
          <div className="mt-[4px] flex flex-wrap items-center gap-[8px]">
            <PdfInput
              label="PDF hinzufügen…"
              onFiles={(files) => {
                setAskPdf(false);
                setWantDocsTour(true);
                void docsRef.current?.openFiles(files);
              }}
              className={`${BIG_BUTTON} border-accent-fill bg-accent-fill font-semibold text-white hover:bg-accent-fill-hover`}
            />
            <button
              type="button"
              onClick={() => setAskPdf(false)}
              title="Die Tour meldet sich wieder, sobald du ein PDF lädst"
              className={`${BIG_BUTTON} border-line bg-surface text-ink hover:bg-sunken`}
            >
              Später
            </button>
          </div>
        </div>
      </>
    );
  }

  if (index === null) {
    if (!offering) return null;
    const from = offerDocs ? chapterStart('unterlagen') : 0;
    const to = offerDocs || hasDocs ? TOUR_STEPS.length : chapterStart('unterlagen');
    const minutes = Math.max(1, Math.round((to - from) / 5));
    return (
      <>
        {/* Abdunkeln wie bei der Tour; ein Tipp daneben heißt „Später". */}
        <div
          aria-hidden="true"
          onClick={decline}
          className="fixed inset-0 z-[50] bg-[var(--spot)]"
        />
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="tour-angebot-titel"
          data-tour-card=""
          className="ov-glass fixed left-1/2 top-1/2 z-[51] flex -translate-x-1/2 -translate-y-1/2 flex-col gap-[12px] p-[20px]"
          style={{ width: OFFER_WIDTH, maxWidth: `calc(100vw - ${2 * EDGE}px)` }}
        >
          <b id="tour-angebot-titel" className="font-display text-[18px] font-semibold text-ink">
            {offerDocs ? 'PDFs sind da' : 'Willkommen bei Conocto'}
          </b>
          <p className="m-0 font-sans text-[14px] leading-[1.45] text-dim">
            {offerDocs
              ? 'Zwei kurze Kapitel: Unterlagen verknüpfen, kalkulieren und abarbeiten.'
              : hasDocs
                ? 'Drei kurze Kapitel: LV lesen, Unterlagen verknüpfen, kalkulieren. Jedes lässt sich überspringen.'
                : 'Die wichtigsten Griffe im LV. Die Kapitel zu PDFs folgen, sobald du ein PDF lädst.'}
          </p>
          <span className="font-mono text-[11.5px] text-mute">
            {to - from} Schritte · ca. {minutes} {minutes === 1 ? 'Minute' : 'Minuten'}
          </span>
          <div className="mt-[4px] flex flex-wrap items-center gap-[8px]">
            <button
              type="button"
              autoFocus
              onClick={start}
              className={`${BIG_BUTTON} border-accent-fill bg-accent-fill font-semibold text-white hover:bg-accent-fill-hover`}
            >
              Tour starten
            </button>
            <button
              type="button"
              onClick={decline}
              title="Die Tour bleibt im Logo-Menü unter „Hilfe & Feedback“"
              className={`${BIG_BUTTON} border-line bg-surface text-ink hover:bg-sunken`}
            >
              Später
            </button>
          </div>
        </div>
      </>
    );
  }

  if (step === undefined || box === null) return null;

  const spot = spotBox(box, step.round === true);
  const place = cardPlace(spot, window.innerWidth, window.innerHeight);
  const waiting = step.done !== undefined && !fulfilled;
  const last = index >= limit - 1;
  const chapterNo = TOUR_CHAPTERS.findIndex((chapter) => chapter.id === step.chapter);
  const inChapter = TOUR_STEPS.map((entry, at) => ({ entry, at })).filter(
    ({ entry, at }) => entry.chapter === step.chapter && at < limit,
  );
  const chapterAt = inChapter.findIndex(({ at }) => at === index);
  const skipTo = nextChapterStart(index);
  const canSkip = skipTo !== null && skipTo < limit;

  return (
    <>
      {/* Abdunkeln über einen riesigen Schatten: das Loch bleibt klickbar, weil
          die Fläche selbst keine Klicks annimmt. */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed z-[50] border-2 border-accent transition-all duration-200"
        style={{
          top: spot.top,
          left: spot.left,
          width: spot.width,
          height: spot.height,
          borderRadius: step.round === true ? '50%' : 'var(--r-sm)',
          boxShadow: '0 0 0 9999px var(--spot)',
        }}
      />
      <div
        role="dialog"
        aria-label={`Tour: ${step.title}`}
        data-tour-card=""
        className="ov-glass fixed z-[51] flex flex-col gap-[8px] p-[14px]"
        style={{
          width: CARD_WIDTH,
          maxWidth: `calc(100vw - ${2 * EDGE}px)`,
          ...place,
        }}
      >
        <div className="flex items-center justify-between gap-[8px]">
          <span className="min-w-0 truncate font-mono text-[11px] text-mute">
            Kapitel {chapterNo + 1} · {TOUR_CHAPTERS[chapterNo]?.title}
          </span>
          {canSkip && (
            <button
              type="button"
              onClick={() => go(skipTo)}
              className="shrink-0 cursor-pointer rounded-[var(--r-pill)] border border-dashed border-line2 bg-transparent px-[8px] py-[2px] font-mono text-[11px] text-dim hover:bg-sunken hover:text-ink"
            >
              Kapitel überspringen ›
            </button>
          )}
        </div>
        <div className="flex items-baseline justify-between gap-[8px]">
          <b className="font-display text-[14px] font-semibold text-ink">{step.title}</b>
          <span className="font-mono text-[11px] text-mute">
            {chapterAt + 1} / {inChapter.length}
          </span>
        </div>
        <p className="m-0 font-sans text-[13.5px] leading-[1.45] text-dim">{step.text}</p>
        {waiting && step.todo !== undefined && (
          <p className="m-0 font-mono text-[11.5px] text-accent-ink">→ {step.todo}</p>
        )}
        <div className="mt-[2px] flex items-center gap-[6px]">
          <button
            type="button"
            onClick={() => go(null)}
            className="cursor-pointer border-none bg-transparent p-0 font-mono text-[11.5px] text-mute hover:text-ink"
          >
            Beenden
          </button>
          <span className="flex-1" />
          {index > 0 && (
            <button
              type="button"
              onClick={() => go(index - 1)}
              className={`${BUTTON} border-line bg-surface text-ink hover:bg-sunken`}
            >
              Zurück
            </button>
          )}
          <button
            type="button"
            onClick={() => go(index + 1)}
            className={
              waiting
                ? `${BUTTON} border-line bg-surface text-dim hover:bg-sunken`
                : `${BUTTON} border-accent-fill bg-accent-fill text-white hover:bg-accent-fill-hover`
            }
          >
            {last ? 'Fertig' : waiting ? 'Überspringen' : 'Weiter'}
          </button>
        </div>
      </div>
    </>
  );
}
