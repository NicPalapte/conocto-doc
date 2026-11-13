// LVs im Bereich „Dokument“ (Entscheidung 0110): jedes offene LV als Karte unter der
// Kategorie „LV“, neben den PDFs (Nico, 13.11.2026). Keine Lesefassung, nur ein Symbol.
// Antippen blendet das LV im Graphen, in der Tabelle und der Suche ein oder aus — über die
// Facette „LV“, also derselbe Filter wie in der Filterleiste. Der Papierkorb schließt ein
// LV; das letzte bleibt, dafür gibt es „Anderes LV öffnen“.

import { fileExtension } from '@core';
import { formatPositions } from '../../lib/format';
import type { LvFile } from '../../lib/pipeline/runPipeline';
import { useViewer, useViewerDispatch } from '../../state/viewer';
import { KindDot } from './DocKindChip';
import { useOptionalLvFiles } from './LvFilesProvider';

/** Höhe der Symbolfläche, wie die Miniatur einer PDF-Karte (DocOverview). */
export const LV_SYMBOL_BOX = 156;

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

/** Offene LVs, deren Name oder Kennung zur Suche im Namen passt. */
export function useLvCards(query: string): readonly LvFile[] {
  const { lv } = useViewer();
  if (lv === null) return [];
  const needle = query.trim().toLocaleLowerCase('de');
  if (needle === '') return lv.files;
  return lv.files.filter((file) =>
    [file.key, file.fileName, file.projectName ?? ''].some((text) =>
      text.toLocaleLowerCase('de').includes(needle),
    ),
  );
}

function TrashIcon() {
  return (
    <svg aria-hidden="true" width="14" height="14" viewBox="0 0 16 16" fill="none">
      <path
        d="M2.5 4h11M6 4V2.5h4V4M4 4l.7 9.5h6.6L12 4M6.5 6.5v4.5M9.5 6.5v4.5"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Eine Karte je LV, gleiche Maße wie eine PDF-Karte; als `<li>` für das Raster. */
export function LvCard({ file }: { file: LvFile }) {
  const { lv, filter } = useViewer();
  const dispatch = useViewerDispatch();
  const files = useOptionalLvFiles();
  if (lv === null) return null;
  const keys = lv.files.map((entry) => entry.key);
  const shown = filter.filters.facets.lv;
  const several = keys.length > 1;
  const visible = shown === undefined || shown.size === 0 || shown.has(file.key);
  const name = file.projectName ?? file.fileName;
  const endung = fileExtension(file.fileName)?.toUpperCase() ?? 'GAEB';

  return (
    <li className="relative flex">
      <button
        type="button"
        aria-pressed={several ? visible : undefined}
        disabled={!several}
        title={
          several
            ? `${file.fileName} — im Graphen ${visible ? 'ausblenden' : 'zeigen'}`
            : file.fileName
        }
        onClick={() =>
          dispatch({ type: 'setFacet', facetId: 'lv', values: toggledLvs(keys, shown, file.key) })
        }
        className={`flex w-full cursor-pointer flex-col overflow-hidden rounded-[var(--r-md)] bg-surface p-0 text-left font-mono text-ink disabled:cursor-default ${
          visible ? 'border border-line hover:border-line2' : 'border border-dashed border-line2'
        }`}
      >
        <span
          className={`flex w-full flex-col items-center justify-center gap-[6px] border-b border-line bg-panel ${
            visible ? '' : 'opacity-50'
          }`}
          style={{ height: LV_SYMBOL_BOX }}
        >
          <span className="flex h-[86px] w-[70px] flex-col items-center justify-center gap-[2px] border border-line bg-surface shadow-[var(--shadow-sm)]">
            <b className="font-display text-[20px] font-bold text-ink">{file.key}</b>
            <span className="text-[10.5px] text-mute">{endung}</span>
          </span>
          {several && (
            <span className="text-[11px] text-mute">
              {visible ? 'im Graphen sichtbar' : 'ausgeblendet'}
            </span>
          )}
        </span>
        <span className="flex flex-col gap-[2px] pb-[42px] pl-[10px] pr-[42px] pt-[8px]">
          <span className="truncate text-[12.5px] font-semibold">{name}</span>
          <span className="truncate text-[11px] text-mute">
            {formatPositions(file.positionCount)} · {file.fileName}
          </span>
        </span>
      </button>
      <span className="pointer-events-none absolute bottom-[12px] left-[10px] flex items-center gap-[6px] font-mono text-[11px] text-dim">
        <KindDot kind="lv" />
        LV
      </span>
      {several && files !== null && (
        <button
          type="button"
          aria-label={`${file.key} schließen`}
          title="LV schließen — Notizen bleiben gespeichert"
          disabled={files.busy}
          onClick={() => void files.removeLv(file.key)}
          className="absolute bottom-[8px] right-[8px] inline-flex h-[26px] w-[26px] cursor-pointer items-center justify-center rounded-[var(--r-sm)] border border-line bg-surface p-0 text-mute hover:border-line2 hover:text-ink disabled:cursor-progress"
        >
          <TrashIcon />
        </button>
      )}
    </li>
  );
}
