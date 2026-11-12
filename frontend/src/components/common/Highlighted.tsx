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
  /** Was zum offenen Vorschlag im Dokument passt: gestrichelt umrandet (Entscheidung 0108). */
  dashed?: readonly string[];
}

const NO_TERMS: readonly string[] = [];

function Mark({ children }: { children: ReactNode }) {
  return (
    <mark className="rounded-none border-b border-accent bg-accent-soft px-[3px] font-medium text-accent-ink">
      {children}
    </mark>
  );
}

/**
 * Suchtreffer: dazu ein Rahmen im Akzent. Eigene Anstreichungen (CSS Highlight API) malen
 * Fläche und Schrift über das `<mark>` — der Rahmen bleibt darüber sichtbar.
 */
function QueryMark({ children }: { children: ReactNode }) {
  return (
    <mark className="rounded-[2px] bg-accent-soft px-[1px] font-medium text-accent-ink outline outline-[1.5px] outline-accent">
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

/** Passt zum offenen Vorschlag: gestrichelter Rahmen, Fläche bleibt frei für Anstriche. */
function DashedMark({ children }: { children: ReactNode }) {
  return (
    <mark
      data-suggest-match=""
      title="Passt zum Vorschlag im Dokument"
      className="rounded-[2px] bg-transparent px-[1px] text-inherit outline-dashed outline-[1.5px] outline-greenD"
    >
      {children}
    </mark>
  );
}

function highlightQuery(
  text: string,
  query: string,
  dashed: readonly string[],
  keyPrefix: string,
): ReactNode[] {
  // Gleiche Regel wie die Suche (Entscheidung 0103): ohne Groß/klein, Leerraum und
  // Trennstrich am Zeilenende — sonst stünde ein Treffer ohne Hervorhebung da.
  const key = searchKeyOf(text);
  const ranges = [
    ...findInKey(key, searchNeedleOf(query)).map((range) => ({ ...range, dashed: false })),
    ...dashed.flatMap((term) =>
      findInKey(key, searchNeedleOf(term)).map((range) => ({ ...range, dashed: true })),
    ),
  ].sort((a, b) => a.start - b.start || b.end - a.end);
  if (ranges.length === 0) return [<Fragment key={`${keyPrefix}-0`}>{text}</Fragment>];
  const parts: ReactNode[] = [];
  let cursor = 0;
  ranges.forEach(({ start, end, dashed: isDashed }, index) => {
    // Überlappende Vorkommen („aa“ in „aaa“): nur das erste markieren.
    if (start < cursor) return;
    if (start > cursor)
      parts.push(<Fragment key={`${keyPrefix}-t${index}`}>{text.slice(cursor, start)}</Fragment>);
    const Wrap = isDashed ? DashedMark : QueryMark;
    parts.push(<Wrap key={`${keyPrefix}-m${index}`}>{text.slice(start, end)}</Wrap>);
    cursor = end;
  });
  if (cursor < text.length)
    parts.push(<Fragment key={`${keyPrefix}-tail`}>{text.slice(cursor)}</Fragment>);
  return parts;
}

/** Ein Stück Text zwischen zwei Fundstellen: `**…**` und Suchbegriff wie bisher. */
function plain(
  text: string,
  query: string,
  keyPrefix: string,
  dashed: readonly string[] = NO_TERMS,
): ReactNode[] {
  return text
    .split(/(\*\*[^*]+\*\*)/g)
    .map((segment, index) =>
      segment.startsWith('**') && segment.endsWith('**') ? (
        <Mark key={`${keyPrefix}-${index}`}>{segment.slice(2, -2)}</Mark>
      ) : (
        <Fragment key={`${keyPrefix}-${index}`}>
          {highlightQuery(segment, query, dashed, `${keyPrefix}-${index}`)}
        </Fragment>
      ),
    );
}

export function Highlighted({
  text,
  query = '',
  spans,
  activeKeys,
  dashed = NO_TERMS,
}: HighlightedProps) {
  const trimmed = query.trim();
  const source = String(text ?? '');
  const marks = spans === undefined ? [] : visibleSpans(source, spans, activeKeys);

  if (marks.length === 0) return <span>{plain(source, trimmed, 's', dashed)}</span>;

  const parts: ReactNode[] = [];
  let cursor = 0;
  marks.forEach((span, index) => {
    // Überlappungen sind in `mergeSpans` schon ausgeräumt; ein doch noch
    // überlappender Span wird übersprungen, statt Text zu verdoppeln.
    if (span.start < cursor) return;
    if (span.start > cursor)
      parts.push(...plain(source.slice(cursor, span.start), trimmed, `t${index}`, dashed));
    parts.push(
      <SpanMark key={`span-${index}`} span={span}>
        {plain(source.slice(span.start, span.end), trimmed, `m${index}`, dashed)}
      </SpanMark>,
    );
    cursor = span.end;
  });
  if (cursor < source.length) {
    parts.push(...plain(source.slice(cursor), trimmed, 'tail', dashed));
  }

  return <span>{parts}</span>;
}
