// Treffer-Navigator der einen Suche über LV und PDFs (Entscheidung 0103): Quellen mit
// Trefferzahl, gezeigter Treffer je Quelle, vor/zurück und Sprung in eine andere Quelle.
// Standard ist die Quelle, in der zuletzt gearbeitet wurde: ein Klick oder Fokus in einem
// Bereich mit `data-search-source` („lv“ oder „doc“) setzt sie — in jedem Fenster.
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
  /** Quelle, in der ▲ ▼ springen. */
  readonly current: SearchSource;
  step: (direction: 1 | -1) => void;
  choose: (id: string) => void;
  readonly hint: SearchEndHint | null;
  /** Zuletzt bearbeiteter Bereich — Strg F holt dann die Suche. */
  readonly area: SearchArea;
}

const SearchNavContext = createContext<SearchNav | null>(null);

/** Nächste Quelle mit Treffern nach der, deren Ende erreicht ist. */
function endHintOf(
  hint: { needle: string; from: string } | null,
  needle: string,
  currentId: string,
  sources: readonly SearchSource[],
): SearchEndHint | null {
  if (hint === null || hint.needle !== needle || hint.from !== currentId) return null;
  const at = sources.findIndex((source) => source.id === hint.from);
  for (let k = 1; k < sources.length; k++) {
    const next = sources[(at + k) % sources.length];
    if ((next.count ?? 0) > 0) return { from: hint.from, next };
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

  // Aktivität in jedem Fenster verfolgen: Hauptfenster und ausgelagerte.
  const hostWindows = useMemo(() => {
    const list: Window[] = [window];
    if (workspace !== null) {
      for (const host of Object.values(workspace.hosts)) if (host !== null) list.push(host.win);
    }
    return list;
  }, [workspace]);
  useEffect(() => {
    const onActivity = (event: Event): void => {
      const next = areaOf(event.target);
      if (next !== null) setArea(next);
    };
    for (const host of hostWindows) {
      host.addEventListener('pointerdown', onActivity, true);
      host.addEventListener('focusin', onActivity, true);
    }
    return () => {
      for (const host of hostWindows) {
        host.removeEventListener('pointerdown', onActivity, true);
        host.removeEventListener('focusin', onActivity, true);
      }
    };
  }, [hostWindows]);

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

  const currentId = area === 'doc' && documents?.active != null ? documents.active.id : LV_SOURCE;
  const current = sources.find((source) => source.id === currentId) ?? sources[0];

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

  const step = useCallback(
    (direction: 1 | -1): void => {
      const count = current.count ?? 0;
      if (count === 0) return;
      const from = current.index;
      const next = from < 0 ? (direction > 0 ? 0 : count - 1) : (from + direction + count) % count;
      const wrapped = from >= 0 && (direction > 0 ? next < from : next > from);
      setHint(wrapped ? { needle, from: current.id } : null);
      if (current.id === LV_SOURCE) {
        selectSlot(lvSlots[next]);
        return;
      }
      documents?.setHitIndex(current.id, next);
      dispatch({ type: 'showPane', pane: 'doc' });
    },
    [current, needle, lvSlots, selectSlot, documents, dispatch],
  );

  const choose = useCallback(
    (id: string): void => {
      setHint(null);
      if (id === LV_SOURCE) {
        setArea('lv');
        if (lvIndex < 0 && lvSlots.length > 0) selectSlot(lvSlots[0]);
        return;
      }
      setArea('doc');
      documents?.activate(id);
      // Gleicher Treffer nochmal: das PDF blättert dorthin.
      documents?.setHitIndex(id, documents.hitIndexOf(id));
    },
    [lvIndex, lvSlots, selectSlot, documents],
  );

  const endHint = useMemo(
    () => endHintOf(hint, needle, currentId, sources),
    [hint, needle, currentId, sources],
  );

  const value = useMemo<SearchNav>(
    () => ({ needle, sources, current, step, choose, hint: endHint, area }),
    [needle, sources, current, step, choose, endHint, area],
  );
  return <SearchNavContext.Provider value={value}>{children}</SearchNavContext.Provider>;
}

/** Navigator der Suche; `null` ohne Provider (z. B. in Einzeltests der Suchleiste). */
export function useSearchNav(): SearchNav | null {
  return useContext(SearchNavContext);
}
