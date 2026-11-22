// Pläne in Begleit-PDFs messen (Entscheidung 0095): Seitenart und Seitenfilter, Werkzeuge,
// Entwurf, Einrasten, Auswahl im Fenster wie im CAD, Maßstab, Rechenansatz und die Leisten
// dazu. `DocumentView` bindet das nur ein; die Daten liegen in `lib/docs/planNotes.ts`.

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';
import { useDocuments } from './DocumentsProvider';
import { LinkDialog } from './LinkDialog';
import { DOC_TOOL as TOOL } from './PdfInput';
import type { PageSize } from './PdfPage';
import { PlanLayer, type PlanDraft } from './PlanLayer';
import { GROUP_OF, SNAP_TOOLS, TWO_POINT_TOOLS, type PlanTool, type ToolGroup } from './planTools';
import { MeasureBar, PlanToolbar, ScalePanel, SelectionBar } from './PlanControls';
import { usePageInfo } from './usePageInfo';
import { pageMaskOf, snapAt, type PageMask, type Snap } from './pageMask';
import { useHostWindow } from '../common/hostWindow';
import { useJumpToPosition } from '../common/useJumpToPosition';
import type { OpenedPdf } from '../../lib/docs/pdf';
import { useViewer, useViewerDispatch } from '../../state/viewer';
import {
  polylineLength,
  selectInWindow,
  windowModeOf,
  windowOf,
  type PageKind,
  type PlanPoint,
  type WindowMode,
} from '@core';
import {
  appendTerm,
  EMPTY_PLAN_NOTES,
  measuresOfPage,
  measureValue,
  pageKindOf,
  parseMass,
  scaleOf,
  type AnsatzTerm,
  type MeasureKind,
  type PlanMeasure,
  rectangleFrom,
  selectShapeOf,
} from '../../lib/docs/planNotes';

const NO_IDS: readonly string[] = [];

/** Messart je Werkzeug; Rechteck, Polygon und Kreis sind Flächen. */
const TOOL_KIND: Readonly<Record<Exclude<PlanTool, 'massstab'>, MeasureKind>> = {
  laenge: 'laenge',
  kette: 'kette',
  rechteck: 'flaeche',
  polygon: 'flaeche',
  kreis: 'flaeche',
  stueck: 'stueck',
};

const TOOL_NAME: Readonly<Record<Exclude<PlanTool, 'massstab'>, string>> = {
  laenge: 'Länge',
  kette: 'Kette',
  rechteck: 'Fläche',
  polygon: 'Fläche',
  kreis: 'Fläche',
  stueck: 'Stück',
};

const shownPagesAll = (pages: number): number[] => Array.from({ length: pages }, (_, i) => i + 1);

/** Alles zum Messen für ein offenes PDF; `sizes` sind die gemessenen Seitengrößen. */
export function usePlanMeasuring(doc: OpenedPdf, sizes: ReadonlyMap<number, PageSize>) {
  const { setOverview, planWanted, donePlanWanted, jump, pageText, ansatzFor, setAnsatzFor } =
    useDocuments();
  const { annotations, index } = useViewer();
  const dispatch = useViewerDispatch();
  const jumpToPosition = useJumpToPosition();
  const host = useHostWindow();
  const pages = doc.pdf.numPages;
  const first = sizes.get(1) ?? null;
  const positionOf = (id: string) => {
    const slot = index.slotOf.get(id);
    return slot === undefined ? null : index.nodes[slot].position;
  };
  const plans = annotations.plans ?? EMPTY_PLAN_NOTES;
  const pageInfo = usePageInfo(doc, pageText);
  const [pageFilter, setPageFilter] = useState<'alle' | PageKind>('alle');
  const [tool, setTool] = useState<PlanTool | null>(null);
  const [draft, setDraft] = useState<PlanDraft | null>(null);
  const [selected, setSelected] = useState<readonly string[]>(NO_IDS);
  const [scalePage, setScalePage] = useState<number | null>(null);
  const [distance, setDistance] = useState<{ page: number; length: number } | null>(null);
  const [linkingMeasure, setLinkingMeasure] = useState<{
    ids: readonly string[];
    left: number;
    top: number;
  } | null>(null);
  const kindOf = useCallback(
    (page: number): PageKind =>
      pageKindOf(plans, { doc: doc.id, page }) ?? pageInfo.get(page)?.guess ?? 'text',
    [plans, doc.id, pageInfo],
  );
  const planCount = useMemo(() => {
    let count = 0;
    for (let page = 1; page <= pages; page += 1) if (kindOf(page) === 'plan') count += 1;
    return count;
  }, [pages, kindOf]);
  // Ansatz gestartet: nur die Pläne zeigen; hat dieses PDF keine,
  // in die Übersicht springen, damit ein Plan gewählt wird. Erst wenn alle Seiten geschätzt
  // sind, sonst wirkt ein großer Plansatz am Anfang planlos.
  const pagesKnown = pageInfo.size >= pages;
  const hasPlans = planCount > 0;
  // Je Ansatz einmal auf die Pläne stellen; danach darf man selbst umschalten.
  const planFor = ansatzFor !== null && pagesKnown && hasPlans ? ansatzFor : null;
  const [plansShownFor, setPlansShownFor] = useState<string | null>(null);
  if (planFor !== null && planFor !== plansShownFor) {
    setPlansShownFor(planFor);
    setPageFilter('plan');
  }
  useEffect(() => {
    if (!planWanted || ansatzFor === null || !pagesKnown) return;
    donePlanWanted();
    if (!hasPlans) setOverview(true);
  }, [ansatzFor, pagesKnown, hasPlans, planWanted, donePlanWanted, setOverview]);
  // Liegt das Sprungziel auf einer ausgeblendeten Seite, wieder alle Seiten zeigen.
  if (
    jump !== null &&
    jump.spot.doc === doc.id &&
    pageFilter !== 'alle' &&
    kindOf(jump.spot.page) !== pageFilter
  ) {
    setPageFilter('alle');
  }
  const shownPages = useMemo(() => {
    const all = Array.from({ length: pages }, (_, i) => i + 1);
    return pageFilter === 'alle' ? all : all.filter((page) => kindOf(page) === pageFilter);
  }, [pages, pageFilter, kindOf]);
  const selectedMeasures = plans.measures.filter((entry) => selected.includes(entry.id));
  const selectedMeasure = selectedMeasures.length === 1 ? selectedMeasures[0] : null;
  const ansatzNote = ansatzFor === null ? null : (plans.quantities.get(ansatzFor) ?? {});
  const addToAnsatz = useCallback(
    (term: AnsatzTerm): void => {
      if (ansatzFor === null) return;
      const note = plans.quantities.get(ansatzFor) ?? {};
      dispatch({
        type: 'planQuantity',
        id: ansatzFor,
        note: { ...note, ansatz: appendTerm(note.ansatz ?? [], term) },
      });
    },
    [ansatzFor, plans, dispatch],
  );

  const finishDraft = useCallback(
    (from: PlanTool, points: readonly PlanPoint[], page: number, snapped?: Snap): void => {
      if (from === 'massstab') return;
      const kind = TOOL_KIND[from];
      const shape =
        snapped !== undefined
          ? snapped.shape
          : from === 'rechteck' || from === 'kreis'
            ? from
            : undefined;
      const count = plans.measures.filter((entry) => entry.kind === kind).length + 1;
      const id = `m-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
      const measure: PlanMeasure = {
        id,
        doc: doc.id,
        page,
        kind,
        points:
          snapped !== undefined
            ? snapped.points
            : from === 'rechteck'
              ? rectangleFrom(points[0], points[1])
              : points,
        ...(shape === undefined ? {} : { shape }),
        name: `${TOOL_NAME[from]} ${count}`,
        links: [],
        at: Date.now(),
      };
      dispatch({ type: 'planMeasure', measure });
      setSelected([id]);
      setDraft(null);
      if (ansatzFor !== null) addToAnsatz({ kind: 'messung', id });
    },
    [plans.measures, doc.id, dispatch, ansatzFor, addToAnsatz],
  );
  const minPoints = (kind: PlanTool): number =>
    kind === 'polygon' ? 3 : kind === 'stueck' ? 1 : 2;
  const canFinish =
    tool !== null &&
    tool !== 'massstab' &&
    draft !== null &&
    draft.points.length >= minPoints(tool);
  const finish = (): void => {
    if (draft === null || tool === null || tool === 'massstab') return;
    if (draft.points.length >= minPoints(tool)) finishDraft(tool, draft.points, draft.page);
  };

  const [snap, setSnap] = useState<(Snap & { page: number }) | null>(null);
  // Zuletzt gewählte Form je Hauptwerkzeug (Länge: Strecke/Kette, Fläche: Rechteck/…).
  const [lastShape, setLastShape] = useState<Readonly<Record<ToolGroup, PlanTool>>>({
    laenge: 'laenge',
    flaeche: 'rechteck',
    stueck: 'stueck',
  });
  const chooseTool = (next: PlanTool): void => {
    setTool(next);
    setDraft(null);
    setSnap(null);
    if (next !== 'massstab') setLastShape((map) => ({ ...map, [GROUP_OF[next]]: next }));
  };

  // Erkannte Fläche unter dem Mauszeiger (Rechteck, Kreis). Die Linienmaske je Seite wird
  // einmal gezeichnet und gemerkt.
  const masks = useRef(new Map<number, Promise<PageMask | null>>());
  const hoverTimer = useRef(0);
  const onHover = useCallback(
    (page: number, point: PlanPoint | null, free: boolean): void => {
      host.clearTimeout(hoverTimer.current);
      const busy = draft !== null && draft.points.length > 0;
      if (point === null || free || busy || tool === null || !SNAP_TOOLS.has(tool)) {
        setSnap((current) => (current === null ? current : null));
        return;
      }
      const circle = tool === 'kreis';
      hoverTimer.current = host.setTimeout(() => {
        let mask = masks.current.get(page);
        if (mask === undefined) {
          mask = doc.pdf
            .getPage(page)
            .then(pageMaskOf)
            .catch(() => null);
          masks.current.set(page, mask);
        }
        void mask.then((ready) => {
          const found = ready === null ? null : snapAt(ready, point, circle);
          setSnap(found === null ? null : { ...found, page });
        });
      }, 120);
    },
    [host, draft, tool, doc.pdf],
  );

  const onTap = useCallback(
    (page: number, point: PlanPoint, scale: number): void => {
      if (tool === null) return;
      const before = draft !== null && draft.page === page ? draft.points : [];
      // Erkannte Fläche unter dem Zeiger: ein Klick übernimmt sie.
      if (SNAP_TOOLS.has(tool) && before.length === 0 && snap !== null && snap.page === page) {
        finishDraft(tool, snap.points, page, snap);
        setSnap(null);
        return;
      }
      // Kette: Doppelklick (zweiter Klick auf dieselbe Stelle) beendet sie.
      if (tool === 'kette' && before.length > 0) {
        const [lx, ly] = before[before.length - 1];
        if (Math.hypot(point[0] - lx, point[1] - ly) * scale < 6) {
          if (before.length >= 2) finishDraft('kette', before, page);
          return;
        }
      }
      const points = [...before, point];
      if (tool === 'massstab') {
        if (points.length < 2) {
          setDraft({ page, points });
          return;
        }
        setDraft(null);
        setDistance({ page, length: polylineLength(points.slice(-2)) });
        setScalePage(page);
        return;
      }
      // Länge, Rechteck, Kreis: mit dem zweiten Punkt fertig.
      if (TWO_POINT_TOOLS.has(tool) && points.length >= 2) {
        finishDraft(tool, points.slice(-2), page);
        return;
      }
      // Polygon: Antippen nahe dem ersten Punkt schließt es.
      if (tool === 'polygon' && before.length >= 3) {
        const [x0, y0] = before[0];
        if (Math.hypot(point[0] - x0, point[1] - y0) * scale < 22) {
          finishDraft('polygon', before, page);
          return;
        }
      }
      setDraft({ page, points });
    },
    [tool, draft, finishDraft, snap],
  );

  const pan = useRef<{
    id: number;
    x: number;
    y: number;
    left: number;
    top: number;
    moved: boolean;
    /** Seite, auf der das Auswahlfenster beginnt; sonst wird verschoben. */
    frame: HTMLElement | null;
    add: boolean;
  } | null>(null);
  const space = useRef(false);

  // Tastatur wie im CAD: Esc beendet den Befehl, Enter schließt ab, Entf löscht die gewählte
  // Messung, Rücktaste nimmt den letzten Punkt zurück. Nicht beim Tippen in Feldern.
  const keys = useRef<(event: KeyboardEvent) => void>(() => undefined);
  useLayoutEffect(() => {
    keys.current = (event: KeyboardEvent): void => {
      const target = event.target as Element | null;
      const typing = target?.closest?.('input, textarea, select, [contenteditable="true"]');
      if (typing != null) return;
      if (event.key === ' ' && target?.closest?.('button') == null) {
        // Leertaste gehalten: Ziehen verschiebt den Plan statt ein Fenster aufzuziehen.
        space.current = true;
        if (pan.current === null) event.preventDefault();
        return;
      }
      if (event.key === 'Escape') {
        if (linkingMeasure !== null || scalePage !== null) return;
        if (draft !== null && tool !== null && tool !== 'massstab') {
          if (draft.points.length >= minPoints(tool)) finishDraft(tool, draft.points, draft.page);
          else setDraft(null);
        } else if (draft !== null) {
          setDraft(null);
        } else if (tool !== null) {
          setTool(null);
          setSnap(null);
        } else if (ansatzFor !== null) {
          setAnsatzFor(null);
        } else if (selected.length > 0) {
          setSelected(NO_IDS);
        } else {
          return;
        }
        event.preventDefault();
        return;
      }
      if (event.key === 'Enter' && canFinish) {
        finish();
        event.preventDefault();
        return;
      }
      if (event.key === 'Backspace' && draft !== null) {
        setDraft(draft.points.length <= 1 ? null : { ...draft, points: draft.points.slice(0, -1) });
        event.preventDefault();
        return;
      }
      if (event.key === 'Delete' || event.key === 'Backspace') {
        if (selected.length > 0) {
          for (const id of selected) dispatch({ type: 'planRemove', id });
          setSelected(NO_IDS);
          event.preventDefault();
        }
      }
    };
  });
  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => keys.current(event);
    const onUp = (event: KeyboardEvent): void => {
      if (event.key === ' ') space.current = false;
    };
    const onBlur = (): void => {
      space.current = false;
    };
    host.addEventListener('keydown', onKey);
    host.addEventListener('keyup', onUp);
    host.addEventListener('blur', onBlur);
    return () => {
      host.removeEventListener('keydown', onKey);
      host.removeEventListener('keyup', onUp);
      host.removeEventListener('blur', onBlur);
    };
  }, [host]);

  const pickMeasure = useCallback(
    (id: string, add: boolean): void => {
      if (ansatzFor !== null && tool === null) {
        addToAnsatz({ kind: 'messung', id });
        return;
      }
      // Mit Shift mehrere wählen; ohne Shift nur diese (oder keine, wenn schon allein gewählt).
      setSelected((current) => {
        if (add) {
          return current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id];
        }
        return current.length === 1 && current[0] === id ? NO_IDS : [id];
      });
    },
    [ansatzFor, tool, addToAnsatz],
  );

  const overlay = useCallback(
    (page: number, size: PageSize, scale: number) => {
      const kind = kindOf(page);
      const guess = pageInfo.get(page)?.guess ?? 'text';
      const toggle = (
        <button
          type="button"
          aria-label={`Seite ${page} ist ${kind === 'plan' ? 'Plan' : 'Text'} — umstellen`}
          title={kind === 'plan' ? 'Als Text behandeln' : 'Als Plan behandeln'}
          onClick={() => {
            const next: PageKind = kind === 'plan' ? 'text' : 'plan';
            dispatch({
              type: 'planKind',
              ref: { doc: doc.id, page },
              kind: next === guess ? null : next,
            });
          }}
          className="absolute left-[6px] top-[6px] z-[4] h-[28px] cursor-pointer rounded-[var(--r-pill)] border border-line bg-surface px-[10px] font-sans text-[11px] text-dim opacity-80 shadow-[var(--shadow-sm)] hover:opacity-100"
        >
          {kind === 'plan' ? 'Plan' : 'Text'}
        </button>
      );
      if (kind !== 'plan') return toggle;
      const ref = { doc: doc.id, page };
      return (
        <>
          {toggle}
          <PlanLayer
            size={size}
            scale={scale}
            measures={measuresOfPage(plans, ref)}
            planScale={scaleOf(plans, ref)}
            draft={draft !== null && draft.page === page ? draft.points : null}
            tool={tool}
            selected={selected}
            picking={ansatzFor !== null}
            snap={snap !== null && snap.page === page ? snap : null}
            onTap={(point) => onTap(page, point, scale)}
            onPick={pickMeasure}
            onHover={(point, free) => onHover(page, point, free)}
          />
          {scaleOf(plans, ref) === null && (
            <button
              type="button"
              onClick={() => {
                setScalePage(page);
                setDistance(null);
              }}
              className="absolute bottom-[6px] left-[6px] z-[4] h-[28px] cursor-pointer rounded-[var(--r-pill)] border border-amber bg-amberS px-[10px] font-sans text-[11px] text-amber"
            >
              Maßstab fehlt
            </button>
          )}
        </>
      );
    },
    [
      kindOf,
      pageInfo,
      dispatch,
      doc.id,
      plans,
      draft,
      tool,
      selected,
      ansatzFor,
      onTap,
      pickMeasure,
      snap,
      onHover,
    ],
  );

  /** Gedrucktes Maß unter dem Finger: Zahl im Textinhalt der Seite (Rechenansatz). */
  const massAt = (event: ReactMouseEvent): AnsatzTerm | null => {
    const owner = (event.target as Element).ownerDocument;
    const layer = (event.target as Element).closest<HTMLElement>('.doc-text');
    const pageEl = layer?.closest<HTMLElement>('[data-page]');
    if (layer == null || pageEl == null) return null;
    const caret = owner.caretRangeFromPoint?.(event.clientX, event.clientY) ?? null;
    if (caret === null || !layer.contains(caret.startContainer)) return null;
    // Nur im angetippten Textstück suchen: der PDF-Text klebt Stücke ohne Trenner
    // aneinander („6,50“ + „5,00“ wären sonst eine Zahl).
    const node = caret.startContainer;
    const before = owner.createRange();
    before.setStart(layer, 0);
    before.setEnd(node, 0);
    const base = before.toString().length;
    const offset = caret.startOffset;
    for (const match of (node.textContent ?? '').matchAll(/\d[\d.,]*\d|\d/g)) {
      const start = base + match.index;
      if (offset < match.index - 1 || offset > match.index + match[0].length + 1) continue;
      const value = parseMass(match[0]);
      if (value === null) return null;
      return {
        kind: 'mass',
        value,
        doc: doc.id,
        page: Number(pageEl.dataset.page),
        start,
        text: match[0],
      };
    }
    return null;
  };

  // Linke Maustaste auf Plänen ohne Werkzeug zieht ein Auswahlfenster wie im CAD.
  // Verschieben: mittlere Maustaste, Leertaste + Ziehen, beim Messen auch links,
  // am Touchscreen mit dem Finger. Erst ab ein paar Pixeln Weg — Antippen bleibt Antippen.
  const [frameBox, setFrameBox] = useState<{
    left: number;
    top: number;
    width: number;
    height: number;
    mode: WindowMode;
  } | null>(null);
  const swallowClick = useRef(false);
  const onPanStart = (event: ReactPointerEvent<HTMLDivElement>): void => {
    if (event.pointerType === 'touch' && tool === null) return;
    const target = event.target as Element;
    if (target.closest('button, input, a, [role="dialog"]') !== null) return;
    const page = target.closest<HTMLElement>('[data-page]');
    const onPlan = page !== null && kindOf(Number(page.dataset.page)) === 'plan';
    if (!(event.button === 1 || (event.button === 0 && onPlan))) return;
    if (event.button === 1) event.preventDefault();
    const framing =
      event.button === 0 &&
      event.pointerType !== 'touch' &&
      tool === null &&
      ansatzFor === null &&
      !space.current;
    const el = event.currentTarget;
    pan.current = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      left: el.scrollLeft,
      top: el.scrollTop,
      moved: false,
      frame: framing ? page : null,
      add: event.shiftKey,
    };
  };
  const onPanMove = (event: ReactPointerEvent<HTMLDivElement>): void => {
    const state = pan.current;
    if (state === null || state.id !== event.pointerId) return;
    const dx = event.clientX - state.x;
    const dy = event.clientY - state.y;
    if (!state.moved && Math.hypot(dx, dy) < 5) return;
    if (!state.moved) {
      state.moved = true;
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    host.getSelection()?.removeAllRanges();
    if (state.frame !== null) {
      const origin = event.currentTarget.parentElement?.getBoundingClientRect();
      if (origin === undefined) return;
      setFrameBox({
        left: Math.min(state.x, event.clientX) - origin.left,
        top: Math.min(state.y, event.clientY) - origin.top,
        width: Math.abs(dx),
        height: Math.abs(dy),
        mode: windowModeOf([state.x, state.y], [event.clientX, event.clientY]),
      });
      return;
    }
    event.currentTarget.scrollLeft = state.left - dx;
    event.currentTarget.scrollTop = state.top - dy;
  };
  const onPanEnd = (event: ReactPointerEvent<HTMLDivElement>): void => {
    const state = pan.current;
    if (state === null || state.id !== event.pointerId) return;
    pan.current = null;
    swallowClick.current = state.moved;
    setFrameBox(null);
    if (state.frame === null) return;
    if (!state.moved) {
      // Antippen ins Leere ohne Shift hebt die Auswahl auf, wie im CAD.
      if (!state.add) setSelected(NO_IDS);
      return;
    }
    if (event.type === 'pointercancel') return;
    const pageNo = Number(state.frame.dataset.page);
    const size = sizes.get(pageNo) ?? first;
    if (size === null) return;
    const box = state.frame.getBoundingClientRect();
    const unit = size.width / box.width;
    const toPage = (x: number, y: number): PlanPoint => [
      (x - box.left) * unit,
      (y - box.top) * unit,
    ];
    const start: PlanPoint = [state.x, state.y];
    const end: PlanPoint = [event.clientX, event.clientY];
    const shapes = plans.measures
      .filter((entry) => entry.doc === doc.id && entry.page === pageNo)
      .map((entry) => ({ id: entry.id, ...selectShapeOf(entry) }));
    const hits = selectInWindow(
      windowOf(toPage(...start), toPage(...end)),
      shapes,
      windowModeOf(start, end),
    );
    setSelected((current) => {
      if (!state.add) return hits.length === 0 ? NO_IDS : hits;
      return [...new Set([...current, ...hits])];
    });
  };

  const pageChoices = [
    ['alle', `Alle ${pages}`],
    ['text', `Text ${pages - planCount}`],
    ['plan', `Pläne ${planCount}`],
  ] as const;

  /** Seitenfilter und „Messen“ in der Kopfleiste. */
  const headerEls = (narrow: boolean): ReactNode => (
    <>
      {planCount > 0 && narrow && (
        // Schmal: eine Auswahl statt drei Knöpfen, sonst schieben sie sich übereinander.
        <select
          aria-label="Seiten"
          value={pageFilter}
          onChange={(event) => setPageFilter(event.target.value as 'alle' | PageKind)}
          className={`${TOOL} ${pageFilter === 'alle' ? '' : 'border-accent bg-accent-soft text-accent-ink'}`}
        >
          {pageChoices.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      )}
      {planCount > 0 && !narrow && (
        <span
          role="radiogroup"
          aria-label="Seiten"
          className="flex shrink-0 items-center gap-[2px]"
        >
          {pageChoices.map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={pageFilter === value}
              onClick={() => setPageFilter(value)}
              className={`${TOOL} ${pageFilter === value ? 'border-accent bg-accent-soft text-accent-ink' : ''}`}
            >
              {label}
            </button>
          ))}
        </span>
      )}
      {planCount > 0 && (
        <button
          type="button"
          aria-pressed={tool !== null}
          data-tour="measure"
          onClick={() => {
            setTool((current) => (current === null ? 'laenge' : null));
            setDraft(null);
          }}
          className={`${TOOL} ${tool !== null ? 'border-accent bg-accent-soft text-accent-ink' : ''}`}
        >
          Messen
        </button>
      )}
    </>
  );

  /** Hinweis, solange ein Rechenansatz Maße oder Messungen sammelt. */
  const ansatzBar: ReactNode = (
    <>
      {ansatzFor !== null && ansatzNote !== null && (
        <div
          role="status"
          className="flex shrink-0 items-center gap-[8px] border-b border-line bg-accent-soft px-[12px] py-[6px] font-sans text-[12.5px] text-accent-ink"
        >
          <span className="flex-1">
            Ansatz für {positionOf(ansatzFor)?.oz ?? 'Position'}: Maß oder Messung im Plan antippen
          </span>
          <button type="button" className="cn-btn" onClick={() => setAnsatzFor(null)}>
            Fertig
          </button>
        </div>
      )}
    </>
  );

  /** Auswahlfenster beim Aufziehen. */
  const frameEl: ReactNode = (
    <>
      {frameBox !== null && (
        // Durchgezogen: nur was ganz drin liegt; gestrichelt: alles, was berührt wird.
        <div
          aria-hidden
          className={`pointer-events-none absolute z-[5] border border-accent ${
            frameBox.mode === 'inside' ? 'border-solid' : 'border-dashed'
          }`}
          style={{
            left: frameBox.left,
            top: frameBox.top,
            width: frameBox.width,
            height: frameBox.height,
          }}
        >
          <div className="absolute inset-0 bg-accent-soft opacity-40" />
        </div>
      )}
    </>
  );

  /** Zeiger und Klicks im Rollbereich: Verschieben, Auswahlfenster, Maß in den Ansatz. */
  const scrollerProps = {
    onPointerDown: onPanStart,
    onPointerMove: onPanMove,
    onPointerUp: onPanEnd,
    onPointerCancel: onPanEnd,
    onClickCapture: (event: ReactMouseEvent): void => {
      // Nach dem Verschieben ist das Loslassen kein Klick (Maß, Messung, Text).
      if (!swallowClick.current) return;
      swallowClick.current = false;
      event.stopPropagation();
      event.preventDefault();
    },
    onClick: (event: ReactMouseEvent): void => {
      if (ansatzFor === null || tool !== null) return;
      const term = massAt(event);
      if (term === null) return;
      host.getSelection()?.removeAllRanges();
      addToAnsatz(term);
    },
  };

  /** Werkzeugleiste und Maßstab; schweben über dem Plan. */
  const floatingEls = (current: number): ReactNode => (
    <>
      {tool !== null && (
        <PlanToolbar
          tool={tool}
          hasScale={scaleOf(plans, { doc: doc.id, page: current }) !== null}
          canFinish={canFinish}
          canUndo={draft !== null && draft.points.length > 0}
          onGroup={(group) => chooseTool(lastShape[group])}
          onTool={(next) => {
            chooseTool(next);
            if (next === 'massstab') {
              setDistance(null);
              setScalePage(current);
            }
          }}
          onUndo={() =>
            setDraft((value) =>
              value === null || value.points.length <= 1
                ? null
                : { ...value, points: value.points.slice(0, -1) },
            )
          }
          onFinish={finish}
          onClose={() => {
            setTool(null);
            setDraft(null);
          }}
        />
      )}
      {scalePage !== null && (
        <ScalePanel
          page={scalePage}
          current={scaleOf(plans, { doc: doc.id, page: scalePage })}
          ratios={pageInfo.get(scalePage)?.ratios ?? []}
          sameRatioPages={(ratio) =>
            shownPagesAll(pages).filter(
              (page) =>
                page !== scalePage &&
                kindOf(page) === 'plan' &&
                pageInfo.get(page)?.ratios[0] === ratio,
            )
          }
          unscaledPages={shownPagesAll(pages).filter(
            (page) =>
              page !== scalePage &&
              kindOf(page) === 'plan' &&
              scaleOf(plans, { doc: doc.id, page }) === null,
          )}
          distance={distance !== null && distance.page === scalePage ? distance.length : null}
          onApply={(unit, source, list) => {
            dispatch({
              type: 'planScale',
              refs: list.map((page) => ({ doc: doc.id, page })),
              scale: { unit, source, at: Date.now() },
            });
            setScalePage(null);
            setDistance(null);
            setTool((value) => (value === 'massstab' ? 'laenge' : value));
          }}
          onRemove={() =>
            dispatch({
              type: 'planScale',
              refs: [{ doc: doc.id, page: scalePage }],
              scale: null,
            })
          }
          onMeasure={() => {
            setDistance(null);
            setDraft(null);
            setTool('massstab');
          }}
          onClose={() => {
            setScalePage(null);
            setDistance(null);
          }}
        />
      )}
    </>
  );

  /** Leisten unter dem Plan: gewählte Messung(en) und Verknüpfen. */
  const barsEl: ReactNode = (
    <>
      {selectedMeasure !== null && (
        <MeasureBar
          measure={selectedMeasure}
          scale={scaleOf(plans, selectedMeasure)}
          ozOf={(id) => positionOf(id)?.oz ?? '?'}
          onRename={(name) =>
            dispatch({ type: 'planMeasure', measure: { ...selectedMeasure, name } })
          }
          onLink={(anchor) => setLinkingMeasure({ ids: [selectedMeasure.id], ...anchor })}
          onUnlink={(id) =>
            dispatch({
              type: 'planMeasure',
              measure: {
                ...selectedMeasure,
                links: selectedMeasure.links.filter((entry) => entry !== id),
              },
            })
          }
          onShowPosition={(id) => jumpToPosition(id, { stayInView: true })}
          onRemove={() => {
            dispatch({ type: 'planRemove', id: selectedMeasure.id });
            setSelected(NO_IDS);
          }}
          onClose={() => setSelected(NO_IDS)}
        />
      )}
      {selectedMeasures.length > 1 && (
        <SelectionBar
          measures={selectedMeasures}
          valueOf={(measure) => measureValue(measure, scaleOf(plans, measure))}
          onLink={(anchor) =>
            setLinkingMeasure({ ids: selectedMeasures.map((entry) => entry.id), ...anchor })
          }
          onRemove={() => {
            for (const measure of selectedMeasures) {
              dispatch({ type: 'planRemove', id: measure.id });
            }
            setSelected(NO_IDS);
          }}
          onClose={() => setSelected(NO_IDS)}
        />
      )}
      {linkingMeasure !== null && (
        <LinkDialog
          left={linkingMeasure.left}
          top={linkingMeasure.top}
          already={
            linkingMeasure.ids.length === 1
              ? (plans.measures.find((entry) => entry.id === linkingMeasure.ids[0])?.links ??
                NO_IDS)
              : NO_IDS
          }
          onLink={(ids) => {
            for (const measure of plans.measures) {
              if (!linkingMeasure.ids.includes(measure.id)) continue;
              dispatch({
                type: 'planMeasure',
                measure: { ...measure, links: [...new Set([...measure.links, ...ids])] },
              });
            }
            setLinkingMeasure(null);
          }}
          onClose={() => setLinkingMeasure(null)}
        />
      )}
    </>
  );

  return {
    kindOf,
    planCount,
    shownPages,
    overlay,
    headerEls,
    ansatzBar,
    frameEl,
    scrollerProps,
    floatingEls,
    barsEl,
  };
}
