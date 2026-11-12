// Bereich „Überblick" im Splitscreen (WP-L, Schritt 3): Kennzahlen, Treemap
// nach Hauptabschnitt und Einheit, Pareto (mit Preisen) bzw. größte Mengen
// (ohne Preise), Mengen je Einheit (nur mit Preisen — ohne Preise stehen die
// Einheiten schon in „Größte Mengen") und Import-Log. Die Prüfung ist ein eigener Bereich.
//
// **Ein Filterzustand, alle Ansichten** (.claude/CLAUDE.md): gerechnet wird
// über der gefilterten Menge, dieselbe, die Tabelle und Graph zeigen. Ohne
// Filter stimmen die Zahlen mit den Summen im Tabellenkopf überein.
//
// Gerechnet wird gegen den flachen Positions-Index, einmal je Filterwechsel —
// nie über den Baum und nie im Render (WP-I).

import { useMemo, useState } from 'react';
import { BetonSortenCard } from './BetonSortenCard';
import { ImportLogCard } from './ImportLogCard';
import { LargestQuantities } from './LargestQuantities';
import { MetricTiles } from './MetricTiles';
import { ParetoCard } from './ParetoCard';
import { Treemap } from './Treemap';
import { UnitTotals } from './UnitTotals';
import { BlockLabel } from '@conocto/design';
import { buildBetonSorten } from '../../lib/beton/sorten';
import { linkedTextsOf } from '../../lib/docs/docNotes';
import { formatCount, formatPositions } from '../../lib/format';
import { filterMask } from '../../lib/index/positionIndex';
import { buildOverview, DIRECT_KEY } from '../../lib/overview/model';
import { headingOf } from '../../lib/tree/heading';
import { matchCount } from '../../lib/tree/matchCounts';
import { useMitnehmen } from '../common/useMitnehmen';
import { useScrollMemory } from '../common/useScrollMemory';
import { toggleFacetValue } from '../../state/filterState';
import { useViewer, useViewerDispatch } from '../../state/viewer';
import type { LVNode } from '../../types/lvNode';

const EMPTY_ACTIVE: ReadonlySet<string> = new Set();

const CRUMB =
  'cursor-pointer truncate border-none bg-transparent p-0 font-mono text-[11.5px] text-mute hover:text-ink hover:underline';

function Card({
  title,
  note,
  children,
}: {
  title: string;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="min-w-0 flex-1 basis-[300px] rounded-[var(--r-md)] border border-line bg-surface px-[14px] py-[12px]">
      <BlockLabel right={note}>{title}</BlockLabel>
      {children}
    </section>
  );
}

export function OverviewView() {
  const { lv, index, active, matches, nodes, filter, parents, selection, annotations } =
    useViewer();
  const dispatch = useViewerDispatch();
  const [attachScroll, onScroll] = useScrollMemory('overview');
  const mitnehmen = useMitnehmen();

  const mask = useMemo(
    () => (active.filtering ? filterMask(index, active) : null),
    [index, active],
  );
  // Geöffneter Abschnitt in der Verteilung (Issue #191). Gilt nur für dieses LV.
  const [opened, setOpened] = useState<{ index: typeof index; id: string } | null>(null);
  const focus = opened !== null && opened.index === index ? opened.id : null;
  const model = useMemo(
    () => buildOverview({ index, mask, parents, focus }),
    [index, mask, parents, focus],
  );
  const docTexts = useMemo(() => linkedTextsOf(annotations.documents), [annotations.documents]);
  const betonSorten = useMemo(
    () => buildBetonSorten(index, mask, docTexts),
    [index, mask, docTexts],
  );

  // Hinweiszahl wie in der Ansicht „Prüfung": abgeschaltete Regeln zählen nicht,
  // und gezählt wird nur, was der Filter durchlässt.
  const flags = useMemo(() => {
    const check = lv?.check ?? null;
    if (check === null) return 0;
    return check.flags.filter((flag) => {
      if (filter.mutedRules.has(flag.id)) return false;
      if (!matches.filtering) return true;
      const node = nodes.get(flag.positionId);
      return node !== undefined && matchCount(matches, node) > 0;
    }).length;
  }, [lv, filter.mutedRules, matches, nodes]);

  if (lv === null) return null;

  const { metrics } = model;
  const activeUnits = filter.filters.facets.einheit ?? EMPTY_ACTIVE;
  const activeSorten = filter.filters.facets.betonsorte ?? EMPTY_ACTIVE;

  const pickSorte = (key: string): void =>
    dispatch({
      type: 'setFacet',
      facetId: 'betonsorte',
      values: toggleFacetValue(filter.filters, 'betonsorte', key),
    });

  const pickUnit = (unit: string): void =>
    dispatch({
      type: 'setFacet',
      facetId: 'einheit',
      values: toggleFacetValue(filter.filters, 'einheit', unit),
    });

  const pickSection = (sectionId: string): void => dispatch({ type: 'selectNode', id: sectionId });

  // Klick auf einen Abschnitt öffnet ihn in der Verteilung; der Graph wählt ihn und zoomt hin.
  // Der Filter bleibt, Tabelle und andere Bereiche zeigen weiter alles (Issue #191).
  const openSection = (sectionId: string | null): void => {
    setOpened(sectionId === null ? null : { index, id: sectionId });
    if (sectionId === null) return;
    pickSection(sectionId);
    dispatch({ type: 'graphFocus' });
  };

  const pickSectionUnit = (sectionId: string, unit: string): void => {
    // Anwählen **und** filtern: der Klick sagt „diese Einheit in diesem
    // Abschnitt" — die Ansicht bleibt, wo sie ist.
    pickUnit(unit);
    pickSection(sectionId === DIRECT_KEY && focus !== null ? focus : sectionId);
  };

  // Pfad zum geöffneten Abschnitt, von oben nach unten.
  const trail: LVNode[] = [];
  for (
    let up: LVNode | null = focus === null ? null : (nodes.get(focus) ?? null);
    up !== null;
    up = parents.get(up.id) ?? null
  ) {
    if (up.kind === 'section') trail.unshift(up);
  }

  const pickPosition = (nodeId: string): void =>
    dispatch({
      type: 'selectPosition',
      nodeId: parents.get(nodeId)?.id ?? null,
      positionId: nodeId,
    });

  return (
    <div ref={attachScroll} onScroll={onScroll} className="absolute inset-0 overflow-auto">
      <div className="flex flex-col gap-[12px] px-[14px] py-[14px]">
        <div>
          <p className="m-0 font-display text-[14px] font-semibold text-ink">
            {formatPositions(metrics.positions)}
            {metrics.filtering && (
              <span className="font-normal text-dim">
                {' '}
                · im aktuellen Filter, von {formatCount(metrics.totalPositions)}
              </span>
            )}
          </p>
        </div>

        <MetricTiles metrics={metrics} flags={flags} />

        <Card
          title="Verteilung · Abschnitt und Einheit"
          note={model.measure === 'preis' ? 'Fläche = Summe' : 'Fläche = Anzahl Positionen'}
        >
          {trail.length > 0 && (
            <nav
              aria-label="Geöffneter Abschnitt"
              className="mb-[6px] flex min-w-0 flex-wrap items-center gap-x-[6px] font-mono text-[11.5px] text-mute"
            >
              <button type="button" onClick={() => openSection(null)} className={CRUMB}>
                ‹ Alle Abschnitte
              </button>
              {trail.map((node, at) => (
                <span key={node.id} className="flex min-w-0 items-center gap-[6px]">
                  <span aria-hidden="true">/</span>
                  {at === trail.length - 1 ? (
                    <span className="truncate text-ink">{headingOf(node)}</span>
                  ) : (
                    <button type="button" onClick={() => openSection(node.id)} className={CRUMB}>
                      {headingOf(node)}
                    </button>
                  )}
                </span>
              ))}
            </nav>
          )}
          <Treemap
            groups={model.groups}
            measure={model.measure}
            selectedId={selection.nodeId}
            activeUnits={activeUnits}
            onPickSection={openSection}
            onPickUnit={pickSectionUnit}
          />
        </Card>

        <div className="flex flex-wrap gap-[12px]">
          {metrics.hasPrices ? (
            <>
              <Card title="Pareto · 80 % der Summe">
                <ParetoCard pareto={model.pareto} />
              </Card>
              <Card title="Mengen je Einheit" note="absteigend">
                <UnitTotals units={model.units} active={activeUnits} onPick={pickUnit} />
              </Card>
            </>
          ) : (
            <Card title="Größte Mengen" note="je Einheit">
              <LargestQuantities
                units={model.largest}
                selectedId={selection.positionId}
                onPick={pickPosition}
              />
            </Card>
          )}
        </div>

        {mitnehmen.hatBeton && (
          <Card title="Betonsorten">
            <BetonSortenCard
              liste={betonSorten}
              active={activeSorten}
              selectedId={selection.positionId}
              onPickSorte={pickSorte}
              onPickPosition={pickPosition}
            />
          </Card>
        )}

        <Card title="Import-Log" note="ganze Datei">
          <ImportLogCard />
        </Card>
      </div>
    </div>
  );
}
