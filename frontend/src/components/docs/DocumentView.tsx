// Inhalt des Bereichs „Dokument" (Entscheidung 0072): ein Begleitdokument als PDF
// anzeigen, darin suchen, Stellen anstreichen und von Hand mit Positionen
// verknüpfen. Dieselbe Komponente steht im Splitscreen, im Fenster über dem Graphen
// und im eigenen Browserfenster.
//
// Markieren wie im Langtext: Text auswählen, Rechtsklick (Entscheidung 0063,
// Issue #155). Conocto deutet den Text nicht. Vorschläge gibt es nur, wo eine OZ oder
// eine Menge genau eine Position des LV trifft; verknüpft wird erst per Klick (0080).

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type MouseEvent as ReactMouseEvent,
} from 'react';
import { DocKindChip } from './DocKindChip';
import { DocOverview } from './DocOverview';
import { DocPicker } from './DocPicker';
import { useDocuments } from './DocumentsProvider';
import { LinkBadge } from './LinkBadge';
import { LinkDialog } from './LinkDialog';
import { DOC_TOOL as TOOL, PdfInput } from './PdfInput';
import { DOCUMENT_ACCEPT, useOptionalLvFiles } from './LvFilesProvider';
import { LvCard, useLvCards } from './LvList';
import { KindDot } from './DocKindChip';
import { THUMB_WIDTH } from '../../lib/docs/thumbnail';
import { PdfPage, type PageSize } from './PdfPage';
import { SuggestBar } from './SuggestBar';
import { StepNav, type StepMode } from './StepNav';
import { MoreMenu } from './MoreMenu';
import { usePlanMeasuring } from './usePlanMeasuring';
import type { DocHighlightItem } from './docHighlights';
import { PaintBar, PaintNamesDialog } from '../common/PaintBar';
import { DocNoteDialog } from './DocNoteDialog';
import { NoteBadge } from './NoteBadge';
import {
  paintSelection,
  searchTermOf,
  useTouchSelectionMenu,
  type PaintTarget,
} from '../common/paint';
import { useHostWindow } from '../common/hostWindow';
import { useJumpToPosition } from '../common/useJumpToPosition';
import {
  isWholeDoc,
  markAt,
  marksOfDoc,
  nextMarkIndex,
  wholeDocSpot,
  pendingSuggestions,
  steppableMarks,
  type DocMark,
  type DocSpot,
} from '../../lib/docs/docNotes';
import {
  orderSuggestions,
  sameSuggestion,
  stepSuggestion,
  type DocSuggestion,
} from '../../lib/docs/docSuggest';
import type { OpenedPdf } from '../../lib/docs/pdf';
import type { DocHit } from '../../lib/docs/docSearch';
import { useViewer, useViewerDispatch } from '../../state/viewer';

const ZOOM_MIN = 0.5;
// Pläne brauchen viel Zoom für Maßketten; das Bild bleibt scharf (`pageCanvas.ts`).
const ZOOM_MAX = 16;
const ZOOM_STEP = 1.2;
/** Schmaler (px): Knöpfe und Suche wandern ins Menü „⋯“, sonst überlappt die Leiste. */
const NARROW_BAR = 640;
/** Schmaler als das (px): auch das Etikett „Dokumentart“ fällt weg. */
const TIGHT_BAR = 440;
/** `NARROW_BAR`/`TIGHT_BAR` bei PDFs mit Plänen: Seitenfilter und „Messen“ brauchen Platz. */
const NARROW_BAR_PLANS = 860;
const TIGHT_BAR_PLANS = 520;
/** Rand links und rechts neben der Seite in px. */
const GUTTER = 16;
/** So lange leuchtet die Stelle nach einem Sprung. */
const FLASH_MS = 1800;
/** So lange wartet ein Sprung höchstens darauf, dass seine Seite gezeichnet ist. */
const JUMP_MAX_MS = 15_000;

/** Auswahl im Dokument samt Seite; Grundlage für Menü und Verknüpfen. */
interface Picked {
  readonly target: PaintTarget;
  readonly page: number;
}

/** Ohne offenes Dokument: hineinziehen oder wählen; dazu, was schon verknüpft war. */
function EmptyDocument() {
  const { openFiles: openPdfs, busy, error } = useDocuments();
  // PDF oder GAEB, auch gemischt (Entscheidung 0110); ohne Provider nur PDFs.
  const lvFiles = useOptionalLvFiles();
  const openFiles = lvFiles?.addFiles ?? openPdfs;
  const lvCards = useLvCards('');
  const { annotations } = useViewer();
  const [over, setOver] = useState(false);
  const { docs, marks } = annotations.documents;
  const counts = new Map<string, number>();
  for (const mark of marks) counts.set(mark.doc, (counts.get(mark.doc) ?? 0) + 1);
  const known = [...docs].filter(([id]) => counts.has(id));
  const drop = (event: DragEvent): void => {
    event.preventDefault();
    setOver(false);
    // Alle abgelegten Dateien, nicht nur die erste (Issue #211).
    void openFiles([...event.dataTransfer.files]);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {lvCards.length > 0 && (
        // Die LVs als Dokumente unter ihrer Kategorie (Entscheidung 0110), auch ohne PDF.
        <ul
          aria-label="Offene Dokumente"
          className="m-0 grid shrink-0 list-none gap-[14px] border-b border-line bg-panel p-[16px]"
          style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${THUMB_WIDTH}px, 1fr))` }}
        >
          <li
            role="presentation"
            className="col-span-full flex items-center gap-[8px] font-mono text-[11px] font-semibold uppercase tracking-[0.06em] text-mute"
          >
            <KindDot kind="lv" />
            LV
            <span className="font-normal">{lvCards.length}</span>
          </li>
          {lvCards.map((file) => (
            <LvCard key={file.key} file={file} />
          ))}
        </ul>
      )}
      <div className="flex min-h-0 flex-1 flex-col gap-[12px] overflow-auto p-[16px]">
        <div
          onDragOver={(event) => {
            event.preventDefault();
            setOver(true);
          }}
          onDragLeave={() => setOver(false)}
          onDrop={drop}
          className={`flex min-h-[180px] flex-1 flex-col items-center justify-center gap-[10px] rounded-[var(--r-md)] border-2 border-dashed text-center ${
            over ? 'border-accent bg-accent-soft' : 'border-line2'
          }`}
        >
          <span className="font-sans text-[14px] text-ink">
            {lvFiles === null ? 'PDFs hierher ziehen' : 'PDFs oder weitere LVs hierher ziehen'}
          </span>
          <PdfInput
            label={busy ? 'Öffnet…' : lvFiles === null ? 'PDF öffnen' : 'Dokument öffnen'}
            accept={lvFiles === null ? undefined : DOCUMENT_ACCEPT}
            onFiles={(files) => void openFiles(files)}
          />
          <span className="font-mono text-[11px] text-mute">Bleibt in diesem Browser.</span>
          {error !== null && (
            <span role="alert" className="font-mono text-[12px] text-red">
              {error}
            </span>
          )}
        </div>
        {known.length > 0 && (
          <ul
            aria-label="Dokumente mit Notizen"
            className="m-0 flex list-none flex-col gap-[6px] p-0"
          >
            {known.map(([id, info]) => (
              <li
                key={id}
                className="flex items-center gap-[10px] rounded-[var(--r-md)] border border-line px-[12px] py-[8px]"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-sans text-[13px] font-semibold text-ink">
                    {info.name}
                  </span>
                  <span className="font-mono text-[11px] text-mute">
                    {counts.get(id)} {counts.get(id) === 1 ? 'Stelle' : 'Stellen'}
                  </span>
                </span>
                <PdfInput label="Erneut öffnen" onFiles={(files) => void openFiles(files)} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function OpenDocument({ doc, ownWindow }: { doc: OpenedPdf; ownWindow: boolean }) {
  const {
    setOverview,
    error,
    jump,
    jumpTo,
    doneJump,
    searchHits,
    hitIndexOf,
    hitNonce,
    suggestions,
    suggest,
    setSuggest,
    setOffered,
  } = useDocuments();
  const { annotations, index } = useViewer();
  const dispatch = useViewerDispatch();
  const jumpToPosition = useJumpToPosition();
  const host = useHostWindow();
  const [scroller, setScroller] = useState<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [sizes, setSizes] = useState<ReadonlyMap<number, PageSize>>(new Map());
  const [scrolled, setCurrent] = useState(1);
  const [picked, setPicked] = useState<Picked | null>(null);
  const [linking, setLinking] = useState<{ spot: DocSpot; left: number; top: number } | null>(null);
  // Notiz an einer Stelle (Entscheidung 0111).
  const [noting, setNoting] = useState<{ spot: DocSpot; left: number; top: number } | null>(null);
  const [naming, setNaming] = useState<{ left: number; top: number } | null>(null);
  const [offer, setOffer] = useState<{
    suggestion: DocSuggestion;
    left: number;
    top: number;
  } | null>(null);
  // Die Positionskarte markiert, was zum offenen Vorschlag passt (Entscheidung 0108).
  const offered = offer?.suggestion ?? null;
  useEffect(() => {
    setOffered(offered);
    return () => setOffered(null);
  }, [offered, setOffered]);
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const attachScroller = useCallback((el: HTMLDivElement | null): void => {
    scrollerRef.current = el;
    setScroller(el);
  }, []);

  const pages = doc.pdf.numPages;

  const plan = usePlanMeasuring(doc, sizes);
  const { kindOf, planCount, shownPages } = plan;
  // Nach dem Filtern auf Pläne zählt die erste gezeigte Seite, nicht eine ausgeblendete.
  const current = shownPages.includes(scrolled) ? scrolled : (shownPages[0] ?? scrolled);
  const marks = useMemo(() => marksOfDoc(annotations.documents, doc.id), [annotations, doc.id]);
  const byPage = useMemo(() => {
    const out = new Map<number, DocMark[]>();
    for (const mark of marks) out.set(mark.page, [...(out.get(mark.page) ?? []), mark]);
    return out;
  }, [marks]);

  // Offene Vorschläge (0080): ohne abgelehnte und schon verknüpfte, je Seite.
  const pending = useMemo(
    () => pendingSuggestions(annotations.documents, doc.id, suggestions.get(doc.id) ?? [], suggest),
    [annotations.documents, doc.id, suggestions, suggest],
  );
  const pendingByPage = useMemo(() => {
    const out = new Map<number, DocSuggestion[]>();
    for (const item of pending) out.set(item.page, [...(out.get(item.page) ?? []), item]);
    return out;
  }, [pending]);
  const counts = useMemo(() => {
    const all = suggestions.get(doc.id) ?? [];
    const open = pendingSuggestions(annotations.documents, doc.id, all, {
      oz: true,
      menge: true,
      beton: true,
      text: true,
    });
    return {
      oz: open.filter((item) => item.source === 'oz').length,
      menge: open.filter((item) => item.source === 'menge').length,
      beton: open.filter((item) => item.source === 'beton').length,
      text: open.filter((item) => item.source === 'text').length,
    };
  }, [annotations.documents, doc.id, suggestions]);
  const onSuggestion = useCallback(
    (suggestion: DocSuggestion, at: { left: number; top: number }): void =>
      setOffer({ suggestion, ...at }),
    [],
  );
  // Durch die offenen Vorschläge blättern (Issue #191): Sprung zur Stelle, Leiste bleibt.
  const ordered = useMemo(() => orderSuggestions(pending), [pending]);
  const offerIndex =
    offer === null ? -1 : ordered.findIndex((item) => sameSuggestion(item, offer.suggestion));
  const showSuggestion = (index: number, at: { left: number; top: number }): void => {
    const suggestion = ordered[index];
    setOffer({ suggestion, ...at });
    jumpTo({ doc: doc.id, page: suggestion.page, start: suggestion.start, text: suggestion.text });
  };
  const stepOffer = (step: 1 | -1, at: { left: number; top: number }): void => {
    const next = stepSuggestion(ordered, offer?.suggestion ?? null, step);
    if (next !== null) showSuggestion(next, at);
  };
  /** Nach „Verknüpfen“ oder „Nein“ weiter zum nächsten, solange einer bleibt. */
  const afterDecision = (done: DocSuggestion, at: { left: number; top: number }): void => {
    const rest = ordered.filter((item) => !sameSuggestion(item, done));
    const at0 = ordered.findIndex((item) => sameSuggestion(item, done));
    if (rest.length === 0 || at0 < 0) {
      setOffer(null);
      return;
    }
    const next = rest[at0 % rest.length];
    setOffer({ suggestion: next, ...at });
    jumpTo({ doc: doc.id, page: next.page, start: next.start, text: next.text });
  };

  // Andere Datei gleichen Namens: Stellen von damals hängen an der alten Kennung.
  const otherVersion = useMemo(() => {
    for (const [id, info] of annotations.documents.docs) {
      if (id === doc.id || info.name !== doc.name) continue;
      if (annotations.documents.marks.some((mark) => mark.doc === id)) return true;
    }
    return false;
  }, [annotations, doc]);

  // Erste Seite messen: ihre Größe gilt für alle, bis eine Seite gemessen ist.
  useEffect(() => {
    let alive = true;
    void doc.pdf.getPage(1).then((page) => {
      if (!alive) return;
      const view = page.getViewport({ scale: 1 });
      setSizes(new Map([[1, { width: view.width, height: view.height }]]));
    });
    return () => {
      alive = false;
    };
  }, [doc]);
  const onSize = useCallback((page: number, size: PageSize): void => {
    setSizes((known) => {
      const same = known.get(page);
      if (same?.width === size.width && same.height === size.height) return known;
      return new Map(known).set(page, size);
    });
  }, []);

  useEffect(() => {
    if (scroller === null || typeof ResizeObserver === 'undefined') return;
    // Im eigenen Fenster (DocWindow) misst nur der Observer dieses Fensters dessen Größe.
    const Observer = scroller.ownerDocument.defaultView?.ResizeObserver ?? ResizeObserver;
    const observer = new Observer(() => setWidth(scroller.clientWidth));
    // Meldet sich gleich nach `observe` mit der ersten Breite.
    observer.observe(scroller);
    return () => observer.disconnect();
  }, [scroller]);

  const first = sizes.get(1) ?? null;
  // Jede Seite auf die Breite eingepasst: ein A0-Plan hinter A4-Text wird sonst riesig.
  const pageScale = (size: PageSize): number =>
    Math.max(0.05, (width === 0 ? 1 : (width - 2 * GUTTER) / size.width) * zoom);

  // Zoomen um einen Punkt: dieselbe Stelle der Seite bleibt unter dem Mauszeiger.
  const zoomRef = useRef(zoom);
  const anchor = useRef<{ page: string; fx: number; fy: number; x: number; y: number } | null>(
    null,
  );
  const zoomBy = useCallback((factor: number, at?: { x: number; y: number }): void => {
    const el = scrollerRef.current;
    const next = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoomRef.current * factor));
    if (el === null || next === zoomRef.current) return;
    const view = el.getBoundingClientRect();
    const x = at?.x ?? view.left + view.width / 2;
    const y = at?.y ?? view.top + view.height / 2;
    const pages = [...el.querySelectorAll<HTMLElement>('[data-page]')];
    const under =
      pages.find((page) => {
        const box = page.getBoundingClientRect();
        return y >= box.top && y <= box.bottom;
      }) ?? pages.find((page) => page.getBoundingClientRect().bottom >= y);
    if (under !== undefined) {
      const box = under.getBoundingClientRect();
      anchor.current = {
        page: under.dataset.page ?? '',
        fx: (x - box.left) / box.width,
        fy: (y - box.top) / box.height,
        x,
        y,
      };
    }
    zoomRef.current = next;
    setZoom(next);
  }, []);
  useLayoutEffect(() => {
    const el = scrollerRef.current;
    const at = anchor.current;
    anchor.current = null;
    if (el === null || at === null) return;
    const page = el.querySelector<HTMLElement>(`[data-page="${at.page}"]`);
    if (page === null) return;
    const box = page.getBoundingClientRect();
    el.scrollLeft += box.left + at.fx * box.width - at.x;
    el.scrollTop += box.top + at.fy * box.height - at.y;
  }, [zoom]);

  // Mausrad: über Plänen zoomen, über Text blättern; mit Strg (auch Zwei-Finger-Zoom am
  // Trackpad) überall zoomen. Eigener Listener, weil React `wheel` passiv anmeldet.
  const kindRef = useRef(kindOf);
  useLayoutEffect(() => {
    zoomRef.current = zoom;
    kindRef.current = kindOf;
  }, [zoom, kindOf]);
  useEffect(() => {
    if (scroller === null) return;
    const onWheel = (event: WheelEvent): void => {
      const target = event.target as Element | null;
      const page = target?.closest?.<HTMLElement>('[data-page]');
      const onPlan = page != null && kindRef.current(Number(page.dataset.page)) === 'plan';
      if (!event.ctrlKey && !event.metaKey && !onPlan) return;
      event.preventDefault();
      const lines = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 400 : 1;
      const delta = Math.max(-200, Math.min(200, event.deltaY * lines));
      zoomBy(Math.exp(-delta * 0.002), { x: event.clientX, y: event.clientY });
    };
    scroller.addEventListener('wheel', onWheel, { passive: false });
    return () => scroller.removeEventListener('wheel', onWheel);
  }, [scroller, zoomBy]);

  const scrollToPage = useCallback((page: number): void => {
    const el = scrollerRef.current;
    const target = el?.querySelector<HTMLElement>(`[data-page="${page}"]`);
    if (el != null && target != null) el.scrollTop = target.offsetTop - GUTTER;
  }, []);
  const scrollBy = useCallback((dy: number): void => {
    if (scrollerRef.current !== null) scrollerRef.current.scrollTop += dy;
  }, []);

  // Sprung von einer Verknüpfung (Positionskarte, Graph). Bis die Seite die Stelle ins Bild
  // gerückt hat, wird nachgescrollt, sooft sich Seitengrößen ändern: frisch geöffnet steht
  // erst Seite 1, die anderen werden beim Näherkommen gemessen und verschieben das Ziel
  // (sonst landet der erste Klick woanders). Danach leuchtet die Stelle kurz, der
  // Sprung ist erledigt und wiederholt sich beim nächsten Öffnen nicht.
  const target = jump !== null && jump.spot.doc === doc.id ? jump : null;
  const [revealed, setRevealed] = useState(0);
  // Die Seite meldet im Layout-Effekt, also vor dem Effekt hier: per Ref sofort sichtbar,
  // sonst scrollte er die eben gerückte Stelle zurück an den Seitenanfang.
  const revealedRef = useRef(0);
  const onRevealed = useCallback((nonce: number): void => {
    revealedRef.current = nonce;
    setRevealed(nonce);
  }, []);
  useEffect(() => {
    if (target === null || target.nonce === revealedRef.current) return;
    // Andere Fassung des PDFs mit weniger Seiten: Ziel gibt es nicht, Sprung verwerfen.
    if (target.spot.page > pages) return doneJump(target.nonce);
    if (first === null) return;
    // Ganzes Dokument (Seite 0, Entscheidung 0099): an den Anfang.
    const page = Math.max(1, target.spot.page);
    if (scrollerRef.current?.querySelector(`[data-page="${page}"]`) == null) return;
    scrollToPage(page);
  }, [target, revealed, first, sizes, shownPages, pages, scrollToPage, doneJump]);
  useEffect(() => {
    if (target === null) return;
    // Lädt die Seite nicht (defekt, sehr langsam), gibt der Sprung nach JUMP_MAX_MS auf.
    const wait = target.nonce === revealed ? FLASH_MS : JUMP_MAX_MS;
    const timer = window.setTimeout(() => doneJump(target.nonce), wait);
    return () => window.clearTimeout(timer);
  }, [target, revealed, doneJump]);
  const flash = target;
  // Neu je Seitengröße: rückt die Stelle nach, falls sich darüber noch etwas verschiebt.
  const reveal = useMemo(
    () =>
      flash === null
        ? null
        : { start: flash.spot.start, text: flash.spot.text, nonce: flash.nonce, sizes },
    [flash, sizes],
  );

  // Aktuelle Seite aus der Scrolllage.
  useEffect(() => {
    if (scroller === null) return;
    let frame = 0;
    const update = (): void => {
      frame = 0;
      const line = scroller.scrollTop + scroller.clientHeight / 3;
      let page = 1;
      for (const el of scroller.querySelectorAll<HTMLElement>('[data-page]')) {
        if (el.offsetTop > line) break;
        page = Number(el.dataset.page);
      }
      setCurrent(page);
    };
    const onScroll = (): void => {
      if (frame === 0) frame = host.requestAnimationFrame(update);
    };
    scroller.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      scroller.removeEventListener('scroll', onScroll);
      if (frame !== 0) host.cancelAnimationFrame(frame);
    };
  }, [scroller, host]);

  // Fundstellen und gezeigten Treffer führt der DocumentsProvider für alle offenen PDFs
  // (Entscheidung 0103); vor/zurück sitzt in der Suchleiste. Hier nur zeigen und blättern.
  const hits = searchHits.get(doc.id) ?? NO_HIT_LIST;
  const currentHit = hits[Math.min(hitIndexOf(doc.id), hits.length - 1)] ?? null;
  // Zum gezeigten Treffer: bei neuem Begriff zur Seite des ersten, bei einem Schritt mit
  // ▲ ▼ genau an die Fundstelle (wie ein Sprung zu einer Stelle) — je Treffer einmal.
  const shownHit = useRef<string>('');
  const stepped = useRef(hitNonce);
  useEffect(() => {
    if (currentHit === null) return;
    const key = `${doc.id}:${hitNonce}:${currentHit.page}:${currentHit.start}`;
    if (shownHit.current === key) return;
    shownHit.current = key;
    if (stepped.current !== hitNonce) {
      stepped.current = hitNonce;
      jumpTo({
        doc: doc.id,
        page: currentHit.page,
        start: currentHit.start,
        text: currentHit.text,
      });
      return;
    }
    // Ein Sprung zu einer Stelle geht vor.
    if (target === null) scrollToPage(currentHit.page);
  }, [currentHit, hitNonce, doc.id, scrollToPage, target, jumpTo]);

  const extraFor = useCallback(
    (page: number): DocHighlightItem[] => {
      const out: DocHighlightItem[] = [];
      for (const hit of hits) {
        if (hit.page !== page) continue;
        out.push({
          name: hit === currentHit ? 'docsearch-current' : 'docsearch',
          start: hit.start,
          text: hit.text,
        });
      }
      if (flash !== null && flash.spot.page === page) {
        out.push({ name: 'docflash', start: flash.spot.start, text: flash.spot.text });
      }
      return out;
    },
    [hits, currentHit, flash],
  );
  // Gleiche Liste je Seite, solange sich nichts ändert — sonst färbte jede Seite neu.
  const extras = useMemo(() => {
    const out = new Map<number, DocHighlightItem[]>();
    const pagesWith = new Set([...hits.map((hit) => hit.page), flash?.spot.page ?? 0]);
    for (const page of pagesWith) if (page > 0) out.set(page, extraFor(page));
    return out;
  }, [hits, flash, extraFor]);

  /** Auswahl in der Textebene einer Seite; `at` legt die Leiste dorthin statt unter die Auswahl. */
  const pickFrom = (from: Element | null, at: { left: number; top: number } | null): boolean => {
    const layer = from?.closest<HTMLElement>('.doc-text');
    const pageEl = layer?.closest<HTMLElement>('[data-page]');
    if (layer == null || pageEl == null) return false;
    const target = paintSelection(layer);
    if (target === null) return false;
    setPicked({
      target: at === null ? target : { ...target, ...at },
      page: Number(pageEl.dataset.page),
    });
    return true;
  };
  const onContextMenu = (event: ReactMouseEvent): void => {
    const at = { left: event.clientX, top: event.clientY + 4 };
    if (pickFrom(event.target as Element, at)) event.preventDefault();
  };
  // Ohne Rechtsklick am Tablet: Leiste unter der Auswahl, sobald sie ruht.
  useTouchSelectionMenu(scroller, (selection) => {
    const node = selection.anchorNode;
    // Kein `instanceof`: im zweiten Browserfenster gehören die Knoten zu dessen `Element`.
    const from = node?.nodeType === Node.ELEMENT_NODE ? (node as Element) : node?.parentElement;
    pickFrom(from ?? null, null);
  });

  const spotOf = (choice: Picked): DocSpot => ({
    doc: doc.id,
    page: choice.page,
    start: choice.target.start,
    text: choice.target.text,
  });
  /** Eigene Stellen, die die Auswahl berührt. */
  const touched = (choice: Picked): DocMark[] => {
    const end = choice.target.start + choice.target.text.length;
    return (byPage.get(choice.page) ?? []).filter(
      (mark) =>
        mark.paint !== null &&
        mark.start < end &&
        mark.start + mark.text.length > choice.target.start,
    );
  };
  const touchedNow = picked === null ? [] : touched(picked);
  /**
   * Stelle für „Notiz…“: berührt die Auswahl eine eigene Stelle, gehört die Notiz dorthin
   * (die mit Notiz zuerst) — sonst entstünde beim ungenauen Markieren am Tablet eine zweite.
   */
  const noteSpotOf = (choice: Picked): DocMark | DocSpot => {
    const end = choice.target.start + choice.target.text.length;
    const near = (byPage.get(choice.page) ?? []).filter(
      (mark) => mark.start < end && mark.start + mark.text.length > choice.target.start,
    );
    return near.find((mark) => (mark.comments ?? []).length > 0) ?? near[0] ?? spotOf(choice);
  };
  const noteSpot = picked === null ? null : noteSpotOf(picked);
  const noteCount =
    noteSpot === null ? 0 : (markAt(annotations.documents, noteSpot)?.comments?.length ?? 0);
  const positionOf = (id: string) => {
    const slot = index.slotOf.get(id);
    return slot === undefined ? null : index.nodes[slot].position;
  };

  // Stabil, damit `PdfPage` (memo) beim Scrollen nicht alle Seiten neu rendert.
  const badge = useCallback(
    (marks: readonly DocMark[]) => (
      <div className="flex items-start gap-[3px]">
        <NoteBadge
          marks={marks}
          onOpen={(spot, box) => setNoting({ spot, left: box.right - 340, top: box.bottom + 4 })}
        />
        <LinkBadge
          spots={marks}
          ozOf={(id) => {
            const slot = index.slotOf.get(id);
            return slot === undefined ? '?' : (index.nodes[slot].position?.oz ?? '?');
          }}
          titleOf={(id) => {
            const slot = index.slotOf.get(id);
            return slot === undefined ? '' : (index.nodes[slot].position?.shortText ?? '');
          }}
          onPick={(id) => jumpToPosition(id, { stayInView: true })}
        />
      </div>
    ),
    [index, jumpToPosition],
  );

  // Schmaler Bereich: seltene Knöpfe wandern ins Menü „⋯“, ganz schmal auch die Suche.
  const narrow = width > 0 && width < (planCount > 0 ? NARROW_BAR_PLANS : NARROW_BAR);
  const tight = width > 0 && width < (planCount > 0 ? TIGHT_BAR_PLANS : TIGHT_BAR);
  // Vor/zurück durch die eigenen Stellen dieses PDFs (Issue #191): angestrichen oder verknüpft,
  // in Lesereihenfolge. Ohne letzte Wahl geht es von der aktuellen Seite aus.
  // `from`: Seite beim Sprung — bis der Sprung angekommen ist, gilt die Wahl weiter.
  const [markPick, setMarkPick] = useState<{ index: number; from: number } | null>(null);
  const [seenMarks, setSeenMarks] = useState(marks);
  if (seenMarks !== marks) {
    setSeenMarks(marks);
    setMarkPick(null);
  }
  const spots = steppableMarks(marks);
  // Nach eigenem Blättern passt die letzte Wahl nicht mehr zur Seite — dann von der Seite aus.
  const pickedSpot = markPick === null ? undefined : spots[markPick.index];
  const markIndex =
    markPick !== null &&
    pickedSpot !== undefined &&
    (pickedSpot.page === current || markPick.from === current)
      ? markPick.index
      : null;
  // Das ganze Dokument mit Positionen verknüpfen (Issue #191, Entscheidung 0099).
  const wholeLinks = marks.find(isWholeDoc)?.links ?? NO_IDS;
  const wholeEl = (
    <button
      type="button"
      title="Mit Positionen verknüpfen, ohne bestimmte Textstelle"
      onClick={(event) => {
        const box = event.currentTarget.getBoundingClientRect();
        setLinking({ spot: wholeDocSpot(doc.id), left: box.left, top: box.bottom + 4 });
      }}
      className={`${TOOL} ${wholeLinks.length > 0 ? 'border-cyan bg-cyanS text-cyan' : ''}`}
    >
      {wholeLinks.length > 0 ? `Dokument verknüpft · ${wholeLinks.length}` : 'Dokument verknüpfen'}
    </button>
  );
  const stepMark = (step: 1 | -1): void => {
    const next = nextMarkIndex(spots, current, markIndex, step);
    if (next === null) return;
    setMarkPick({ index: next, from: current });
    jumpTo(spots[next]);
  };
  // Ein Blätterer für Vorschläge oder eigene Stellen. Gibt es nur
  // eines von beiden, geht er das durch; die Wahl gilt, solange dieses PDF offen ist.
  const [stepMode, setStepMode] = useState<StepMode>('vorschlaege');
  const suggestTotal = counts.oz + counts.menge + counts.beton;
  const mode: StepMode =
    suggestTotal === 0 ? 'stellen' : spots.length === 0 ? 'vorschlaege' : stepMode;
  const stepEl =
    suggestTotal + spots.length > 0 ? (
      <StepNav
        mode={mode}
        setMode={setStepMode}
        suggestTotal={suggestTotal}
        markTotal={spots.length}
        counts={counts}
        suggest={suggest}
        setSuggest={setSuggest}
        index={mode === 'stellen' ? markIndex : offerIndex < 0 ? null : offerIndex}
        total={mode === 'stellen' ? spots.length : ordered.length}
        onStep={(step, at) => (mode === 'stellen' ? stepMark(step) : stepOffer(step, at))}
      />
    ) : null;
  const zoomEls = (
    <>
      <button
        type="button"
        aria-label="Verkleinern"
        disabled={zoom <= ZOOM_MIN}
        onClick={() => zoomBy(1 / ZOOM_STEP)}
        className={TOOL}
      >
        −
      </button>
      <button
        type="button"
        aria-label="Vergrößern"
        disabled={zoom >= ZOOM_MAX}
        onClick={() => zoomBy(ZOOM_STEP)}
        className={TOOL}
      >
        +
      </button>
      {zoom !== 1 && (
        <button
          type="button"
          title="Auf Breite einpassen"
          onClick={() => zoomBy(1 / zoom)}
          className={TOOL}
        >
          {Math.round(zoom * 100)} %
        </button>
      )}
    </>
  );

  return (
    <div ref={rootRef} className="flex min-h-0 flex-1 flex-col">
      <div
        className={`flex shrink-0 items-center gap-[6px] border-b border-line px-[10px] py-[6px] ${
          ownWindow ? 'bg-surface' : ''
        }`}
      >
        {/* Links und als Pfeil, damit er nicht wie „Bereich schließen“ rechts daneben wirkt. */}
        <button
          type="button"
          aria-label="Zur Übersicht"
          title="Zur Übersicht aller PDFs — das PDF bleibt offen"
          onClick={() => setOverview(true)}
          className={TOOL}
        >
          ←
        </button>
        <DocPicker doc={doc} />
        {!tight && (
          <div className="flex shrink-0">
            <DocKindChip id={doc.id} name={doc.name} />
          </div>
        )}
        {plan.headerEls(narrow)}
        <span className="flex-1" />
        {!narrow && wholeEl}
        {stepEl}
        {!narrow && zoomEls}
        {narrow && (
          <MoreMenu>
            {wholeEl}
            {zoomEls}
          </MoreMenu>
        )}
      </div>
      {(otherVersion || error !== null) && (
        <div
          role="status"
          className="shrink-0 border-b border-line bg-amberS px-[12px] py-[6px] font-mono text-[11.5px] text-amber"
        >
          {error ?? 'Andere Fassung als beim Markieren — die Stellen von damals fehlen hier.'}
        </div>
      )}
      {plan.ansatzBar}
      {/* Werkzeugleiste und Maßstab schweben über dem Plan, nicht über der Leiste. */}
      <div className="relative flex min-h-0 flex-1 flex-col">
        {plan.frameEl}
        <div
          ref={attachScroller}
          onContextMenu={onContextMenu}
          data-tour="doc-page"
          {...plan.scrollerProps}
          className="relative min-h-0 flex-1 overflow-auto bg-grid2"
          style={{ padding: GUTTER }}
        >
          {/* Ohne `items-center`: breiter als der Bereich wäre der linke Rand unerreichbar. */}
          <div className="flex w-max min-w-full flex-col" style={{ gap: GUTTER }}>
            {first !== null &&
              shownPages.map((page) => (
                <PdfPage
                  key={page}
                  doc={doc}
                  page={page}
                  scale={pageScale(sizes.get(page) ?? first)}
                  size={sizes.get(page) ?? first}
                  root={scroller}
                  marks={byPage.get(page) ?? NO_MARKS}
                  extra={extras.get(page) ?? NO_EXTRA}
                  reveal={reveal !== null && flash?.spot.page === page ? reveal : null}
                  onRevealed={onRevealed}
                  onSize={onSize}
                  scrollBy={scrollBy}
                  badge={badge}
                  suggestions={pendingByPage.get(page) ?? NO_SUGGESTIONS}
                  onSuggestion={onSuggestion}
                  overlay={plan.overlay}
                />
              ))}
          </div>
        </div>
        {/* Seitenangabe schwebt unten mittig, die Kopfleiste bleibt frei. */}
        <span className="cn-pill pointer-events-none absolute bottom-[10px] left-1/2 z-[5] -translate-x-1/2 px-[10px] py-[3px] font-mono text-[11.5px] text-dim">
          {current} / {pages}
        </span>
        {plan.floatingEls(current)}
      </div>
      {plan.barsEl}
      {picked !== null && (
        <PaintBar
          target={picked.target}
          searches={[
            {
              label: 'In Suche übernehmen',
              run: () => {
                dispatch({ type: 'search', value: searchTermOf(picked.target.text) });
                host.getSelection()?.removeAllRanges();
                setPicked(null);
              },
            },
          ]}
          onCopy={() => {
            void host.navigator.clipboard?.writeText(picked.target.text);
            setPicked(null);
          }}
          onPaint={(paint) => {
            dispatch({ type: 'docPaint', spot: spotOf(picked), paint, at: Date.now() });
            host.getSelection()?.removeAllRanges();
            setPicked(null);
          }}
          onUnpaint={
            touchedNow.length === 0
              ? null
              : () => {
                  for (const mark of touchedNow) {
                    dispatch({ type: 'docPaint', spot: mark, paint: null, at: Date.now() });
                  }
                  setPicked(null);
                }
          }
          onRename={() => {
            setNaming({ left: picked.target.left, top: picked.target.top });
            setPicked(null);
          }}
          onLearn={null}
          onLink={() => {
            setLinking({
              spot: spotOf(picked),
              left: picked.target.left,
              top: picked.target.top,
            });
            setPicked(null);
          }}
          onNote={{
            count: noteCount,
            open: () => {
              if (noteSpot === null) return;
              setNoting({
                spot: {
                  doc: noteSpot.doc,
                  page: noteSpot.page,
                  start: noteSpot.start,
                  text: noteSpot.text,
                },
                left: picked.target.left,
                top: picked.target.top,
              });
              host.getSelection()?.removeAllRanges();
              setPicked(null);
            },
          }}
          onClose={() => setPicked(null)}
        />
      )}
      {noting !== null && (
        <DocNoteDialog
          spot={noting.spot}
          left={noting.left}
          top={noting.top}
          onClose={() => setNoting(null)}
        />
      )}
      {linking !== null && (
        <LinkDialog
          left={linking.left}
          top={linking.top}
          already={
            byPage
              .get(linking.spot.page)
              ?.find((mark) => mark.start === linking.spot.start && mark.text === linking.spot.text)
              ?.links ?? NO_IDS
          }
          onLink={(ids) => {
            dispatch({ type: 'docLink', spot: linking.spot, ids, at: Date.now() });
            host.getSelection()?.removeAllRanges();
            setLinking(null);
          }}
          onClose={() => setLinking(null)}
        />
      )}
      {offer !== null && (
        <SuggestBar
          suggestion={offer.suggestion}
          oz={positionOf(offer.suggestion.id)?.oz ?? '?'}
          shortText={positionOf(offer.suggestion.id)?.shortText ?? ''}
          left={offer.left}
          top={offer.top}
          place={offerIndex < 0 ? null : { index: offerIndex, total: ordered.length }}
          onStep={(step) => stepOffer(step, { left: offer.left, top: offer.top })}
          bounds={scroller}
          onLink={() => {
            const { suggestion } = offer;
            dispatch({
              type: 'docLink',
              spot: {
                doc: doc.id,
                page: suggestion.page,
                start: suggestion.start,
                text: suggestion.text,
              },
              ids: [suggestion.id],
              at: Date.now(),
              source: suggestion.source,
            });
            afterDecision(suggestion, { left: offer.left, top: offer.top });
          }}
          onReject={() => {
            const { suggestion } = offer;
            dispatch({
              type: 'docReject',
              spot: {
                doc: doc.id,
                page: suggestion.page,
                start: suggestion.start,
                text: suggestion.text,
              },
              id: suggestion.id,
              at: Date.now(),
            });
            afterDecision(suggestion, { left: offer.left, top: offer.top });
          }}
          onShow={() => jumpToPosition(offer.suggestion.id, { stayInView: true })}
          onShowAll={
            offer.suggestion.sorte === undefined
              ? undefined
              : () =>
                  dispatch({
                    type: 'setFacet',
                    facetId: 'betonsorte',
                    values: new Set([offer.suggestion.sorte?.key ?? '']),
                  })
          }
          onClose={() => setOffer(null)}
        />
      )}
      {naming !== null && (
        <PaintNamesDialog left={naming.left} top={naming.top} onClose={() => setNaming(null)} />
      )}
    </div>
  );
}

const NO_MARKS: readonly DocMark[] = [];
const NO_HIT_LIST: readonly DocHit[] = [];
const NO_EXTRA: readonly DocHighlightItem[] = [];
const NO_IDS: readonly string[] = [];
const NO_SUGGESTIONS: readonly DocSuggestion[] = [];

/** `ownWindow`: im eigenen Fenster hat die Leiste die Farbe der Kopfleiste (Issue #225). */
export function DocumentView({ ownWindow = false }: { ownWindow?: boolean } = {}) {
  const { active, overview } = useDocuments();
  if (active === null) return <EmptyDocument />;
  return overview ? (
    <DocOverview ownWindow={ownWindow} />
  ) : (
    <OpenDocument key={active.id} doc={active} ownWindow={ownWindow} />
  );
}
