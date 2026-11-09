// Treffer-Navigator der einen Suche über LV und PDFs (Entscheidung 0103): Quellen mit
// Trefferzahl, gezeigter Treffer je Quelle, vor/zurück und Sprung in eine andere Quelle.
// Im Hauptfenster gilt die Quelle, in der zuletzt gearbeitet wurde: ein Klick oder Fokus in
// einem Bereich mit `data-search-source` („lv“ oder „doc“) setzt sie. Ausgelagerte Fenster
// haben ihre feste Quelle; so laufen LV und PDF in zwei Fenstern parallel.
// Ändert nie Filter oder Suchbegriff; nur die Auswahl (LV-Treffer) und das gezeigte PDF.

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
  /** Ausschnitt um den gezeigten (oder ersten) Treffer. */
  readonly preview: string | null;
}

/** Ende einer Quelle erreicht: Hinweis auf die nächste mit Treffern. */
export interface SearchEndHint {
  readonly from: string;
  readonly next: SearchSource;
}

export interface SearchNav {
  /** Suchbegriff als Schlüssel; leer = keine Suche, kein Navigator. */
  readonly needle: string;
  readonly sources: readonly SearchSource[];
  /** Quelle, in der ▲ ▼ in diesem Fenster springen. */
  readonly current: SearchSource;
  step: (direction: 1 | -1) => void;
  choose: (id: string) => void;
  readonly hint: SearchEndHint | null;
  /** Bereich dieses Fensters, in dem zuletzt gearbeitet wurde — Strg F holt dann die Suche. */
  readonly area: SearchArea;
}

/** Gemeinsamer Stand aller Fenster; `useSearchNav` bindet ihn an das eigene Fenster. */
interface SearchNavShared {
  readonly needle: string;
  readonly sources: readonly SearchSource[];
  /** Zuletzt bearbeiteter Bereich im Hauptfenster. */
  readonly mainArea: SearchArea;
  readonly docWindow: Window | null;
  readonly activeDocId: string | null;
  readonly hint: { needle: string; from: string } | null;
  stepIn: (source: SearchSource, direction: 1 | -1) => void;
  choose: (id: string, inMain: boolean) => void;
}

const SearchNavContext = createContext<SearchNavShared | null>(null);

/** Nächste Quelle mit Treffern nach der, deren Ende erreicht ist. */
function endHintOf(
  hint: { needle: string; from: string } | null,
  needle: string,
  currentId: string,
  sources: readonly SearchSource[],
  /** Quellen, die dieses Fenster zeigen kann; ausgelagert nur die eigene Art. */
  allowed: (source: SearchSource) => boolean = () => true,
): SearchEndHint | null {
  if (hint === null || hint.needle !== needle || hint.from !== currentId) return null;
  const at = sources.findIndex((source) => source.id === hint.from);
  for (let k = 1; k < sources.length; k++) {
    const next = sources[(at + k) % sources.length];
    if ((next.count ?? 0) > 0 && allowed(next)) return { from: hint.from, next };
  }
  return null;
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
  const [hint, setHint] = useState<{ needle: string; from: string } | null>(null);

  // Aktivität nur im Hauptfenster verfolgen: ein ausgelagertes Fenster zeigt nur einen
  // Bereich, dort steht die Quelle fest (Dokument-Fenster ⇒ PDF, sonst LV).
  useEffect(() => {
    const onActivity = (event: Event): void => {
      const next = areaOf(event.target);
      if (next !== null) setArea(next);
    };
    window.addEventListener('pointerdown', onActivity, true);
    window.addEventListener('focusin', onActivity, true);
    return () => {
      window.removeEventListener('pointerdown', onActivity, true);
      window.removeEventListener('focusin', onActivity, true);
    };
  }, []);

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
    const previewSlot = lvSlots[Math.max(0, lvIndex)];
    const position = previewSlot === undefined ? null : index.positions[previewSlot];
    const lv: SearchSource = {
      id: LV_SOURCE,
      label: 'LV',
      count: lvSlots.length,
      index: lvIndex,
      preview:
        position === null
          ? null
          : `${position.oz} ${
              searchSnippet(position.shortText, filter.search) ??
              searchSnippet(position.longText, filter.search) ??
              position.shortText
            }`,
    };
    if (documents === null) return [lv];
    return [
      lv,
      ...documents.docs.map((doc) => {
        const hits = documents.searchHits.get(doc.id);
        const at = hits === undefined ? 0 : Math.min(documents.hitIndexOf(doc.id), hits.length - 1);
        const hit = hits?.[at] ?? null;
        return {
          id: doc.id,
          label: doc.name,
          count: hits?.length ?? null,
          index: hit === null ? -1 : at,
          preview: hit === null ? null : `S. ${hit.page} · ${hit.around ?? hit.text}`,
        };
      }),
    ];
  }, [lvSlots, lvIndex, index, filter.search, documents]);

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

  const stepIn = useCallback(
    (source: SearchSource, direction: 1 | -1): void => {
      const count = source.count ?? 0;
      if (count === 0) return;
      const from = source.index;
      const next = from < 0 ? (direction > 0 ? 0 : count - 1) : (from + direction + count) % count;
      const wrapped = from >= 0 && (direction > 0 ? next < from : next > from);
      setHint(wrapped ? { needle, from: source.id } : null);
      if (source.id === LV_SOURCE) {
        selectSlot(lvSlots[next]);
        return;
      }
      documents?.setHitIndex(source.id, next);
      dispatch({ type: 'showPane', pane: 'doc' });
    },
    [needle, lvSlots, selectSlot, documents, dispatch],
  );

  const choose = useCallback(
    (id: string, inMain: boolean): void => {
      setHint(null);
      if (id === LV_SOURCE) {
        if (inMain) setArea('lv');
        if (lvIndex < 0 && lvSlots.length > 0) selectSlot(lvSlots[0]);
        return;
      }
      if (inMain) setArea('doc');
      documents?.activate(id);
      // Gleicher Treffer nochmal: das PDF blättert dorthin.
      documents?.setHitIndex(id, documents.hitIndexOf(id));
      dispatch({ type: 'showPane', pane: 'doc' });
    },
    [lvIndex, lvSlots, selectSlot, documents, dispatch],
  );

  const docWindow = workspace?.hosts.doc?.win ?? null;
  const activeDocId = documents?.active?.id ?? null;
  const value = useMemo<SearchNavShared>(
    () => ({ needle, sources, mainArea: area, docWindow, activeDocId, hint, stepIn, choose }),
    [needle, sources, area, docWindow, activeDocId, hint, stepIn, choose],
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
    const area: SearchArea = inMain ? shared.mainArea : host === shared.docWindow ? 'doc' : 'lv';
    const currentId =
      area === 'doc' && shared.activeDocId !== null ? shared.activeDocId : LV_SOURCE;
    const current = shared.sources.find((source) => source.id === currentId) ?? shared.sources[0];
    return {
      needle: shared.needle,
      sources: shared.sources,
      current,
      step: (direction: 1 | -1) => shared.stepIn(current, direction),
      choose: (id: string) => shared.choose(id, inMain),
      // Ausgelagert bleibt der Hinweis bei der eigenen Art: im Dokument-Fenster nur PDFs.
      hint: endHintOf(shared.hint, shared.needle, current.id, shared.sources, (source) =>
        inMain ? true : (source.id === LV_SOURCE) === (area === 'lv'),
      ),
      area,
    };
  }, [shared, host]);
}
