// Sucheintrag im Menü beim Markieren im Langtext und Kurztext: „In Suche übernehmen“. Seit
// Entscheidung 0103 gibt es eine Suche für LV und PDFs — der Begriff gilt für beide.

import { useCallback } from 'react';
import type { SearchAction } from './PaintBar';
import { searchTermOf } from './paint';
import { useViewerDispatch } from '../../state/viewer';

/** Baut die Einträge für einen markierten Text; `done` schließt das Menü. */
export function useTextSearches(): (text: string, done: () => void) => SearchAction[] {
  const dispatch = useViewerDispatch();
  return useCallback(
    (text, done) => [
      {
        label: 'In Suche übernehmen',
        run: () => {
          dispatch({ type: 'search', value: searchTermOf(text) });
          done();
        },
      },
    ],
    [dispatch],
  );
}
