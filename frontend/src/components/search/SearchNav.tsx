// Treffer-Navigator der einen Suche über LV und PDFs (Entscheidung 0103): alle Treffer wie
// eine lange Liste, je Quelle ein Abschnitt. ▲ ▼ laufen am Ende einer Quelle direkt in die
// nächste mit Treffern weiter.
// Im Hauptfenster beginnt die Liste bei der Quelle, in der zuletzt gearbeitet wurde: ein
// Klick oder Fokus in einem Bereich mit `data-search-source` („lv“ oder „doc“) setzt sie.
// Ausgelagerte Fenster haben ihre feste Quelle; so laufen LV und PDF in zwei Fenstern
// parallel. Ändert nie Filter oder Suchbegriff; nur die Auswahl (LV) und das gezeigte PDF.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { searchNeedleOf } from '@core';
import { useOptionalDocuments } from '../docs/DocumentsProvider';
import { useOptionalWorkspace } from '../shell/WorkspaceProvider';
import { useHostWindow } from '../common/hostWindow';
import { searchSnippet } from '../../lib/searchSnippet';
import { useViewer, useViewerDispatch } from '../../state/viewer';

/** Bereich, in dem zuletzt gearbeitet wurde. */
export type SearchArea = 'lv' | 'doc';

/** Kennung der Quelle „LV“; PDFs heißen nach ihrer Dokument-Kennung. */
export const LV_SOURCE = 'lv';

export interface SearchSource {
  readonly id: string;
  readonly label: string;
  /** Trefferzahl; `null`, solange das PDF noch durchsucht wird. */
  readonly count: number | null;
  /** Gezeigter Treffer (ab 0); `-1`, wenn im LV keine Trefferposition gewählt ist. */
  readonly index: number;
}

/** Ein Treffer in der Liste unter der Suchleiste. */
export interface SearchItem {
  /** Stelle in der Quelle (ab 0). */
  readonly at: number;
  /** OZ im LV, „S. 3“ im PDF. */
  readonly lead: string;
  readonly text: string;
}

export interface SearchNav {
  /** Suchbegriff als Schlüssel; leer = keine Suche, kein Navigator. */
  readonly needle: string;
  /** Quellen in Listenfolge: die dieses Fensters zuerst, dann reihum. */
  readonly sources: readonly SearchSource[];
  /** Quelle, in der ▲ ▼ in diesem Fenster gerade stehen. */
  readonly current: SearchSource;
  step: (direction: 1 | -1) => void;
  /** Springt zum Treffer `at` der Quelle `id`. */
  goTo: (id: string, at: number) => void;
  /** Treffer `from` bis vor `to` einer Quelle für die Liste. */
  itemsOf: (id: string, from: number, to: number) => readonly SearchItem[];
  /** Bereich dieses Fensters, in dem zuletzt gearbeitet wurde — Strg F holt dann die Suche. */
  readonly area: SearchArea;
}

/** Fenster mit eigenem Navigator: Hauptfenster, ausgelagertes Dokument, ausgelagertes LV. */
type NavWindow = 'main' | 'doc' | 'lv';

/**
 * Stand des Blätterns in einem Fenster: `id` = Quelle, in der ▲ ▼ gerade stehen; `anchor` =
 * Quelle, deren Abschnitt oben steht. Blättern über das Ende einer Quelle ändert nur `id`,
 * damit die Liste nicht umsortiert. Ein Klick in einen Bereich verwirft den Stand.
 */
interface NavCursor {
  readonly needle: string;
  readonly anchor: string;
  readonly id: string;
}

/** Gemeinsamer Stand aller Fenster; `useSearchNav` bindet ihn an das eigene Fenster. */
interface SearchNavShared {
  readonly needle: string;
  readonly sources: readonly SearchSource[];
  /** Zuletzt bearbeiteter Bereich im Hauptfenster. */
  readonly mainArea: SearchArea;
  readonly docWindow: Window | null;
  readonly activeDocId: string | null;
  readonly cursors: Readonly<Partial<Record<NavWindow, NavCursor>>>;
  goTo: (id: string, at: number, win: NavWindow, anchor: string) => void;
  itemsOf: (id: string, from: number, to: number) => readonly SearchItem[];
}

const SearchNavContext = createContext<SearchNavShared | null>(null);

/** Quellen ab `currentId` reihum — so liest man die lange Trefferliste. */
export function inListOrder(
  sources: readonly SearchSource[],
  currentId: string,
): readonly SearchSource[] {
  const at = Math.max(
    0,
    sources.findIndex((source) => source.id === currentId),
  );
  return [...sources.slice(at), ...sources.slice(0, at)];
}

/**
 * Nächster Treffer der langen Liste: in der Quelle weiter, am Ende in die nächste Quelle mit
 * Treffern (erster Treffer, rückwärts der letzte). Gibt es keine andere, beginnt die Quelle
 * von vorn. `null`, wenn es nirgends Treffer gibt.
 */
export function nextHit(
  ordered: readonly SearchSource[],
  direction: 1 | -1,
  allowed: (source: SearchSource) => boolean,
): { id: string; at: number } | null {
  const current = ordered[0];
  const count = current.count ?? 0;
  const from = current.index;
  if (count > 0 && from < 0) return { id: current.id, at: direction > 0 ? 0 : count - 1 };
  const inside = from + direction;
  if (count > 0 && inside >= 0 && inside < count) return { id: current.id, at: inside };
  const others = direction > 0 ? ordered.slice(1) : [...ordered.slice(1)].reverse();
  for (const source of others) {
    const n = source.count ?? 0;
    if (n > 0 && allowed(source)) return { id: source.id, at: direction > 0 ? 0 : n - 1 };
  }
  if (count === 0) return null;
  return { id: current.id, at: direction > 0 ? 0 : count - 1 };
}

/** Bereich eines Ereignisses: das nächste Element mit `data-search-source`. */
function areaOf(target: EventTarget | null): SearchArea | null {
  const element = target as Element | null;
  if (typeof element?.closest !== 'function') return null;
  const value = element.closest<HTMLElement>('[data-search-source]')?.dataset.searchSource;
  return value === 'lv' || value === 'doc' ? value : null;
}

export function SearchNavProvider({ children }: { children: ReactNode }) {
  const { filter, index, mask, selection, parents } = useViewer();
  const dispatch = useViewerDispatch();
  const documents = useOptionalDocuments();
  const workspace = useOptionalWorkspace();
  const [area, setArea] = useState<SearchArea>('lv');
  const [cursors, setCursors] = useState<Partial<Record<NavWindow, NavCursor>>>({});
  const docWindow = workspace?.hosts.doc?.win ?? null;

  // Bereich im Hauptfenster verfolgen; ein ausgelagertes Fenster zeigt nur einen Bereich,
  // dort steht die Quelle fest (Dokument-Fenster ⇒ PDF, sonst LV). Ein Klick in einen
  // Bereich — in jedem Fenster — setzt dort den Stand des Blätterns zurück: dann steht der
  // Abschnitt dieses Bereichs wieder oben.
  const hostWindows = useMemo(() => {
    const list: Window[] = [window];
    if (workspace !== null) {
      for (const host of Object.values(workspace.hosts)) if (host !== null) list.push(host.win);
    }
    return list;
  }, [workspace]);
  useEffect(() => {
    const cleanups = hostWindows.map((host) => {
      const win: NavWindow = host === window ? 'main' : host === docWindow ? 'doc' : 'lv';
      const onPointer = (event: Event): void => {
        const next = areaOf(event.target);
        if (next === null) return;
        if (win === 'main') setArea(next);
        setCursors((prev) => (prev[win] === undefined ? prev : { ...prev, [win]: undefined }));
      };
      const onFocus = (event: Event): void => {
        const next = areaOf(event.target);
        if (win === 'main' && next !== null) setArea(next);
      };
      host.addEventListener('pointerdown', onPointer, true);
      host.addEventListener('focusin', onFocus, true);
      return () => {
        host.removeEventListener('pointerdown', onPointer, true);
        host.removeEventListener('focusin', onFocus, true);
      };
    });
    return () => cleanups.forEach((cleanup) => cleanup());
  }, [hostWindows, docWindow]);

  const needle = searchNeedleOf(filter.search);

  // LV-Treffer: Positionen im aktuellen Filter, in LV-Reihenfolge (Index = Dokumentfolge).
  const lvSlots = useMemo(() => {
    if (needle === '' || mask === null) return [];
    const slots: number[] = [];
    for (let slot = 0; slot < mask.length; slot++) if (mask[slot] === 1) slots.push(slot);
    return slots;
  }, [needle, mask]);
  const selectedSlot =
    selection.positionId === null ? -1 : (index.slotOf.get(selection.positionId) ?? -1);
  const lvIndex = selectedSlot < 0 ? -1 : lvSlots.indexOf(selectedSlot);

  const sources = useMemo<SearchSource[]>(() => {
    const lv: SearchSource = { id: LV_SOURCE, label: 'LV', count: lvSlots.length, index: lvIndex };
    if (documents === null) return [lv];
    return [
      lv,
      ...documents.docs.map((doc) => {
        const hits = documents.searchHits.get(doc.id);
        const count = hits?.length ?? null;
        const at =
          count === null || count === 0 ? -1 : Math.min(documents.hitIndexOf(doc.id), count - 1);
        return { id: doc.id, label: doc.name, count, index: at };
      }),
    ];
  }, [lvSlots, lvIndex, documents]);

  const itemsOf = useCallback(
    (id: string, from: number, to: number): readonly SearchItem[] => {
      if (id === LV_SOURCE) {
        return lvSlots.slice(from, to).map((slot, k) => {
          const position = index.positions[slot];
          return {
            at: from + k,
            lead: position.oz,
            text:
              searchSnippet(position.shortText, filter.search) ??
              searchSnippet(position.longText, filter.search) ??
              position.shortText,
          };
        });
      }
      const hits = documents?.searchHits.get(id) ?? [];
      return hits
        .slice(from, to)
        .map((hit, k) => ({ at: from + k, lead: `S. ${hit.page}`, text: hit.around ?? hit.text }));
    },
    [lvSlots, index, filter.search, documents],
  );

  const selectSlot = useCallback(
    (slot: number): void => {
      const node = index.nodes[slot];
      dispatch({
        type: 'selectPosition',
        nodeId: parents.get(node.id)?.id ?? null,
        positionId: node.id,
      });
    },
    [index, parents, dispatch],
  );

  const goTo = useCallback(
    (id: string, at: number, win: NavWindow, anchor: string): void => {
      setCursors((prev) => ({ ...prev, [win]: { needle, anchor, id } }));
      if (id === LV_SOURCE) {
        const slot = lvSlots[at];
        if (slot !== undefined) selectSlot(slot);
        return;
      }
      if (documents?.active?.id !== id) documents?.activate(id);
      documents?.setHitIndex(id, at);
      dispatch({ type: 'showPane', pane: 'doc' });
    },
    [needle, lvSlots, selectSlot, documents, dispatch],
  );

  const activeDocId = documents?.active?.id ?? null;
  const value = useMemo<SearchNavShared>(
    () => ({ needle, sources, mainArea: area, docWindow, activeDocId, cursors, goTo, itemsOf }),
    [needle, sources, area, docWindow, activeDocId, cursors, goTo, itemsOf],
  );
  return <SearchNavContext.Provider value={value}>{children}</SearchNavContext.Provider>;
}

/**
 * Navigator der Suche für das Fenster, in dem die Leiste steht: im Hauptfenster die Quelle,
 * in der zuletzt gearbeitet wurde; im ausgelagerten Dokument das PDF, sonst das LV. So
 * springen LV und PDF in zwei Fenstern unabhängig. `null` ohne Provider.
 */
export function useSearchNav(): SearchNav | null {
  const shared = useContext(SearchNavContext);
  const host = useHostWindow();
  return useMemo(() => {
    if (shared === null) return null;
    const inMain = host === window;
    // Ist das Dokument ausgelagert, zeigt das Hauptfenster nur noch das LV.
    const mainArea = shared.docWindow === null ? shared.mainArea : 'lv';
    const area: SearchArea = inMain ? mainArea : host === shared.docWindow ? 'doc' : 'lv';
    const win: NavWindow = inMain ? 'main' : area;
    const fallback = area === 'doc' && shared.activeDocId !== null ? shared.activeDocId : LV_SOURCE;
    const known = (id: string): boolean => shared.sources.some((source) => source.id === id);
    const cursor = shared.cursors[win];
    const valid =
      cursor !== undefined &&
      cursor.needle === shared.needle &&
      known(cursor.id) &&
      known(cursor.anchor);
    const anchor = valid ? cursor.anchor : fallback;
    const currentId = valid ? cursor.id : fallback;
    const sources = inListOrder(shared.sources, anchor);
    const current = sources.find((source) => source.id === currentId) ?? sources[0];
    // ▲ ▼ laufen nur in Quellen weiter, die dieses Fenster zeigt: ausgelagert nur die eigene
    // Art, im Hauptfenster PDFs nur, solange das Dokument nicht ausgelagert ist.
    const allowed = (source: SearchSource): boolean => {
      const isLv = source.id === LV_SOURCE;
      if (!inMain) return isLv === (area === 'lv');
      return isLv || shared.docWindow === null;
    };
    return {
      needle: shared.needle,
      sources,
      current,
      step: (direction: 1 | -1) => {
        const next = nextHit(inListOrder(shared.sources, current.id), direction, allowed);
        if (next !== null) shared.goTo(next.id, next.at, win, anchor);
      },
      goTo: (id: string, at: number) => shared.goTo(id, at, win, anchor),
      itemsOf: shared.itemsOf,
      area,
    };
  }, [shared, host]);
}
