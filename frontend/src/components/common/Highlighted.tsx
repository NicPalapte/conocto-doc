// Rendert `**…**`-Markierungen im Langtext als Hervorhebung, hebt den aktuellen
// Suchbegriff hervor und zeichnet seit WP-J die **Fundstellen der
// Klassifizierung** ein — je Kategorie eine Farbe, einzeln abschaltbar.
//
// Portiert aus `Highlighted` in design/claude-design/lv-main.jsx.
//
// Die Fundstellen kommen als Zeichen-Indizes in den Rohtext
// (docs/architecture/data-model.md#spans). Deshalb wird der Text zuerst an den
// Span-Grenzen zerlegt und erst danach je Stück auf `**…**` und Suchbegriff
// geprüft — umgekehrt würden die Indizes nicht mehr passen, sobald ein
// `**`-Paar entfernt ist.

import { Fragment, type CSSProperties, type ReactNode } from 'react';
import { categoryOf } from '../../lib/spanCategories';
import type { Span } from '../../lib/classify';
import { findInKey, searchKeyOf, searchNeedleOf } from '@core';
import { visibleSpans } from './shownText';

interface HighlightedProps {
  text: string;
  /** Optionaler Suchbegriff; wird zusätzlich zu `**…**` hervorgehoben. */
  query?: string;
  /** Fundstellen der Klassifizierung, überschneidungsfrei und nach `start` sortiert. */
  spans?: readonly Span[];
  /** Sichtbare Kategorien; ohne Angabe werden alle gezeichnet. */
  activeKeys?: ReadonlySet<string>;
}

function Mark({ children }: { children: ReactNode }) {
  return (
    <mark className="rounded-none border-b border-accent bg-accent-soft px-[3px] font-medium text-accent-ink">
      {children}
    </mark>
  );
}

/**
 * Fundstelle: getönte Fläche in der Farbe ihrer Kategorie, mit Erklärung im
 * Titel. Der Inhalt läuft weiter durch `plain()` — ein Suchbegriff, der zufällig
 * **in** einer Fundstelle liegt („din" in „DIN EN 206"), bliebe sonst als
 * einziger im Text unmarkiert.
 */
function SpanMark({ span, children }: { span: Span; children: ReactNode }) {
  const category = categoryOf(span.key);
  const style: CSSProperties = {
    background: category.background,
    color: category.color,
    borderBottom: `1px solid ${category.color}`,
    borderRadius: 0,
    padding: '0 2px',
  };
  return (
    <mark data-span-key={span.key} title={`${category.label}: ${span.label}`} style={style}>
      {children}
    </mark>
  );
}

function highlightQuery(text: string, query: string, keyPrefix: string): ReactNode[] {
  // Gleiche Regel wie die Suche (Entscheidung 0103): ohne Groß/klein, Leerraum und
  // Trennstrich am Zeilenende — sonst stünde ein Treffer ohne Hervorhebung da.
  const needle = searchNeedleOf(query);
  const ranges = findInKey(searchKeyOf(text), needle);
  if (ranges.length === 0) return [<Fragment key={`${keyPrefix}-0`}>{text}</Fragment>];
  const parts: ReactNode[] = [];
  let cursor = 0;
  ranges.forEach(({ start, end }, index) => {
    // Überlappende Vorkommen („aa“ in „aaa“): nur das erste markieren.
    if (start < cursor) return;
    if (start > cursor)
      parts.push(<Fragment key={`${keyPrefix}-t${index}`}>{text.slice(cursor, start)}</Fragment>);
    parts.push(<Mark key={`${keyPrefix}-m${index}`}>{text.slice(start, end)}</Mark>);
    cursor = end;
  });
  if (cursor < text.length)
    parts.push(<Fragment key={`${keyPrefix}-tail`}>{text.slice(cursor)}</Fragment>);
  return parts;
}

/** Ein Stück Text zwischen zwei Fundstellen: `**…**` und Suchbegriff wie bisher. */
function plain(text: string, query: string, keyPrefix: string): ReactNode[] {
  return text
    .split(/(\*\*[^*]+\*\*)/g)
    .map((segment, index) =>
      segment.startsWith('**') && segment.endsWith('**') ? (
        <Mark key={`${keyPrefix}-${index}`}>{segment.slice(2, -2)}</Mark>
      ) : (
        <Fragment key={`${keyPrefix}-${index}`}>
          {highlightQuery(segment, query, `${keyPrefix}-${index}`)}
        </Fragment>
      ),
    );
}

export function Highlighted({ text, query = '', spans, activeKeys }: HighlightedProps) {
  const trimmed = query.trim();
  const source = String(text ?? '');
  const marks = spans === undefined ? [] : visibleSpans(source, spans, activeKeys);

  if (marks.length === 0) return <span>{plain(source, trimmed, 's')}</span>;

  const parts: ReactNode[] = [];
  let cursor = 0;
  marks.forEach((span, index) => {
    // Überlappungen sind in `mergeSpans` schon ausgeräumt; ein doch noch
    // überlappender Span wird übersprungen, statt Text zu verdoppeln.
    if (span.start < cursor) return;
    if (span.start > cursor)
      parts.push(...plain(source.slice(cursor, span.start), trimmed, `t${index}`));
    parts.push(
      <SpanMark key={`span-${index}`} span={span}>
        {plain(source.slice(span.start, span.end), trimmed, `m${index}`)}
      </SpanMark>,
    );
    cursor = span.end;
  });
  if (cursor < source.length) parts.push(...plain(source.slice(cursor), trimmed, 'tail'));

  return <span>{parts}</span>;
}
