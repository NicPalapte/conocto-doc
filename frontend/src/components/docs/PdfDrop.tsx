// PDF auf die App ziehen: öffnet es als Begleitdokument im Bereich „Dokument“
// (Entscheidung 0072). Gilt für die ganze Arbeitsfläche, nicht nur für den leeren
// Bereich „Dokument“ — der muss dafür nicht erst offen sein. Seit Entscheidung 0110 auch
// GAEB-Dateien: sie kommen als weiteres LV dazu, gemischt mit PDFs.
//
// Lauscht am Fenster, damit kein Bereich etwas dafür tun muss. Hat ein Bereich den
// Abwurf schon selbst genommen (`defaultPrevented`, z. B. der leere Bereich
// „Dokument“), bleibt es dabei.

import { useEffect, useRef, useState } from 'react';
import { useLvFiles } from './LvFilesProvider';

type Over = 'files' | null;

/**
 * Ob Dateien gezogen werden. Den Namen und damit die Endung nennt der Browser erst beim
 * Abwerfen; GAEB-Dateien haben meist keinen Typ. Was nicht passt, meldet `addFiles`.
 */
function overOf(transfer: DataTransfer | null): Over {
  if (transfer === null || !transfer.types.includes('Files')) return null;
  return 'files';
}

export function PdfDrop() {
  const { addFiles } = useLvFiles();
  const [over, setOver] = useState<Over>(null);
  const timer = useRef(0);

  useEffect(() => {
    // `dragleave` feuert bei jedem Kind-Element; robuster: Overlay hält, solange
    // `dragover` kommt (der Browser schickt es laufend), und geht kurz danach.
    const hideSoon = (): void => {
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setOver(null), 150);
    };
    const onDragOver = (event: DragEvent): void => {
      const kind = overOf(event.dataTransfer);
      if (kind === null) return;
      // Ohne `preventDefault` öffnete der Browser die Datei und verwürfe die Sitzung.
      event.preventDefault();
      if (event.dataTransfer !== null) {
        event.dataTransfer.dropEffect = 'copy';
      }
      setOver(kind);
      hideSoon();
    };
    const onDrop = (event: DragEvent): void => {
      if (event.dataTransfer === null || !event.dataTransfer.types.includes('Files')) return;
      window.clearTimeout(timer.current);
      setOver(null);
      if (event.defaultPrevented) return;
      event.preventDefault();
      void addFiles([...event.dataTransfer.files]);
    };
    window.addEventListener('dragover', onDragOver);
    window.addEventListener('drop', onDrop);
    return () => {
      window.removeEventListener('dragover', onDragOver);
      window.removeEventListener('drop', onDrop);
      window.clearTimeout(timer.current);
    };
  }, [addFiles]);

  if (over === null) return null;
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[60] grid place-items-center border-2 border-dashed border-accent bg-[color-mix(in_srgb,var(--accent)_8%,transparent)]"
    >
      <div className="flex flex-col items-center gap-[4px] rounded-[var(--r-md)] bg-surface px-[22px] py-[16px] text-center shadow-[var(--shadow-sm)]">
        <b className="font-display text-[16px] font-semibold text-ink">Dokumente loslassen</b>
        <span className="text-[12.5px] text-mute">PDF oder GAEB, auch gemischt</span>
      </div>
    </div>
  );
}
