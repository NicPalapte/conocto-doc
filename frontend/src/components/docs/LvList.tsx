// LVs im Bereich „Dokument“ (Entscheidung 0110): jedes offene LV als Kennzeichen, keine
// Lesefassung. Antippen blendet das LV im Graphen, in der Tabelle und der Suche ein oder
// aus — über die Facette „LV“, also derselbe Filter wie in der Filterleiste. × schließt
// ein LV; das letzte bleibt, dafür gibt es „Anderes LV öffnen“.

import { formatPositions } from '../../lib/format';
import { useViewer, useViewerDispatch } from '../../state/viewer';
import { DOCUMENT_ACCEPT, useOptionalLvFiles } from './LvFilesProvider';
import { DOC_TOOL, PdfInput } from './PdfInput';

/** Neue Auswahl der Facette „LV“ nach Antippen von `key`; leer = alle sichtbar. */
export function toggledLvs(
  keys: readonly string[],
  shown: ReadonlySet<string> | undefined,
  key: string,
): Set<string> {
  const visible = new Set(shown === undefined || shown.size === 0 ? keys : shown);
  if (visible.has(key)) {
    // Das letzte sichtbare LV bleibt: ganz ohne LV zeigte der Graph nichts.
    if (visible.size === 1) return new Set(shown ?? []);
    visible.delete(key);
  } else {
    visible.add(key);
  }
  return keys.every((candidate) => visible.has(candidate)) ? new Set() : visible;
}

export function LvList() {
  const { lv, filter } = useViewer();
  const dispatch = useViewerDispatch();
  // Ohne Provider (Tests einzelner Bereiche) nur die Kennzeichen, ohne Hinzufügen/Schließen.
  const files = useOptionalLvFiles();
  if (lv === null) return null;
  const busy = files?.busy ?? false;
  const keys = lv.files.map((file) => file.key);
  const shown = filter.filters.facets.lv;
  const several = lv.files.length > 1;

  return (
    <section
      aria-label="Leistungsverzeichnisse"
      className="flex shrink-0 flex-wrap items-center gap-[6px] border-b border-line px-[10px] py-[6px]"
    >
      <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.06em] text-mute">
        LV
      </span>
      <ul className="m-0 flex min-w-0 flex-1 list-none flex-wrap gap-[6px] p-0">
        {lv.files.map((file) => {
          const visible = shown === undefined || shown.size === 0 || shown.has(file.key);
          const name = file.projectName ?? file.fileName;
          return (
            <li
              key={file.key}
              className={`flex h-[26px] min-w-0 items-center rounded-[var(--r-sm)] border bg-surface font-mono text-[11.5px] ${
                visible ? 'border-line2 text-ink' : 'border-dashed border-line text-mute'
              }`}
            >
              <button
                type="button"
                aria-pressed={visible}
                disabled={!several}
                title={
                  several
                    ? `${file.fileName} · ${formatPositions(file.positionCount)} — im Graphen ${
                        visible ? 'ausblenden' : 'zeigen'
                      }`
                    : `${file.fileName} · ${formatPositions(file.positionCount)}`
                }
                onClick={() =>
                  dispatch({
                    type: 'setFacet',
                    facetId: 'lv',
                    values: toggledLvs(keys, shown, file.key),
                  })
                }
                className="flex h-full min-w-0 cursor-pointer items-center gap-[6px] border-0 bg-transparent px-[8px] font-mono text-inherit disabled:cursor-default"
              >
                <b className="font-semibold">{file.key}</b>
                <span className="max-w-[180px] truncate">{name}</span>
              </button>
              {several && files !== null && (
                <button
                  type="button"
                  aria-label={`${file.key} schließen`}
                  title="LV schließen — Notizen bleiben gespeichert"
                  disabled={busy}
                  onClick={() => void files.removeLv(file.key)}
                  className="flex h-full cursor-pointer items-center border-0 border-l border-line bg-transparent px-[6px] text-mute hover:text-ink disabled:cursor-progress"
                >
                  ×
                </button>
              )}
            </li>
          );
        })}
      </ul>
      {files !== null && (
        <PdfInput
          label={busy ? 'Liest…' : '+ Hinzufügen'}
          accept={DOCUMENT_ACCEPT}
          onFiles={(chosen) => void files.addFiles(chosen)}
          className={`${DOC_TOOL} border-dashed border-line2 text-dim`}
        />
      )}
    </section>
  );
}
