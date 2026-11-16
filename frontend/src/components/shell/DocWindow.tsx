// Begleitdokument (Entscheidung 0072) im eigenen Browserfenster für den zweiten
// Bildschirm — dieselbe Mechanik wie die Tabelle (TableWindow.tsx): ↗ im Bereichskopf
// löst es aus dem Splitscreen, ↙ hier holt es zurück. Sonst steht das Dokument als
// Bereich in `SplitView`. Im Fenster zwei gleichfarbige Leisten, keine Titelzeile dazwischen:
// „↙“ sitzt rechts in der Kopfleiste (Issue #225, Variante A).

import { useCallback, useEffect } from 'react';
import { ExternalWindow } from '../common/ExternalWindow';
import { useWorkspace } from './WorkspaceProvider';
import { DocumentView } from '../docs/DocumentView';
import { PopoutHead } from './PopoutHead';
import { useViewer } from '../../state/viewer';

const DOCK_BUTTON =
  'inline-flex h-[36px] min-w-[36px] shrink-0 cursor-pointer items-center justify-center gap-[6px] rounded-[var(--r-sm)] border border-line bg-surface px-[10px] font-mono text-[12px] text-dim hover:border-line2 hover:text-ink';

export function DocWindow() {
  const {
    tree,
    view: { workspace },
  } = useViewer();
  const { hosts, dock } = useWorkspace();
  const popup = hosts.doc;

  const shown = !workspace.closed.doc && tree !== null;
  // Dokument von woanders zu (neues LV): das zweite Fenster geht mit.
  useEffect(() => {
    if (!shown && popup !== null) dock('doc');
  }, [shown, popup, dock]);

  // Zweites Fenster von Hand zu: das Dokument kehrt in seinen Bereich zurück.
  const closedByHand = useCallback((): void => dock('doc'), [dock]);

  if (!shown || popup === null) return null;
  return (
    <ExternalWindow host={popup} onClosed={closedByHand}>
      <section
        aria-label="Dokument — eigenes Fenster"
        data-search-source="doc"
        className="flex min-h-0 flex-1 flex-col"
      >
        <PopoutHead
          end={
            <button
              type="button"
              onClick={() => dock('doc')}
              title="Zurück ins Hauptfenster"
              aria-label="Dokument zurück ins Hauptfenster"
              className={DOCK_BUTTON}
            >
              ↙<span className="hidden md:inline">Ins Hauptfenster</span>
            </button>
          }
        />
        <DocumentView ownWindow />
      </section>
    </ExternalWindow>
  );
}
