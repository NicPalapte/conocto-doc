// Schritte der geführten Tour in drei Kapiteln (Entscheidung 0122). Jeder
// Schritt zeigt auf ein echtes Bedienelement; manche warten, bis man es selbst anklickt.
// Ziele sind `data-tour`-Attribute, damit Umbauten an Klassen die Tour nicht
// stillschweigend brechen. Fehlt ein Ziel (z. B. „Betonsorten“ ohne Beton, ein PDF-Schritt
// ohne PDF), überspringt die Tour den Schritt.

import type { ViewerState } from '../../state/viewer';

export type TourChapter = 'lv' | 'unterlagen' | 'kalkulieren';

export const TOUR_CHAPTERS: readonly { id: TourChapter; title: string }[] = [
  { id: 'lv', title: 'LV lesen' },
  { id: 'unterlagen', title: 'Unterlagen verknüpfen' },
  { id: 'kalkulieren', title: 'Kalkulieren und abarbeiten' },
];

export interface TourStep {
  chapter: TourChapter;
  /** CSS-Selektor des Ziels; der erste sichtbare Treffer zählt. */
  target: string;
  title: string;
  text: string;
  /** Aufforderung, solange `done` noch nicht erfüllt ist. */
  todo?: string;
  /** Erfüllt → die Tour geht von selbst einen Schritt weiter. */
  done?: (state: ViewerState) => boolean;
  /** Vorbereitung beim Betreten, z. B. ein Fenster schließen. */
  prepare?: readonly TourPrepare[];
  /** Ziel ist ein Punkt im Graphen: Spotlight rund und mindestens so groß. */
  round?: boolean;
}

/** Was ein Schritt vor dem Anzeigen am Zustand ändert. */
export type TourPrepare =
  | 'closeFilter'
  | 'closeSelection'
  | 'ensureSelection'
  | 'showTable'
  | 'showOverview'
  | 'showDocOverview'
  | 'showDocText'
  | 'showDocPlan';

/**
 * Punkt im Graphen; als Fläche gezeichnete Kreise haben keinen. `data-slot` allein trifft
 * auch die Köpfe der Bereiche im Splitscreen.
 */
export const POINT_TARGET = '[data-slot][data-tier="position"]';
export const CARD_TARGET = '[data-selection-card]';

const DOC_PAGE = '[data-tour="doc-page"]';

export const TOUR_STEPS: readonly TourStep[] = [
  {
    chapter: 'lv',
    target: POINT_TARGET,
    title: 'Positionen sind Punkte',
    text: 'Jeder Kreis ist ein Abschnitt, jeder Punkt eine Position.',
    todo: 'Tipp auf den markierten Punkt',
    done: (state) => state.selection.positionId !== null,
    prepare: ['closeFilter', 'closeSelection'],
    round: true,
  },
  {
    chapter: 'lv',
    target: CARD_TARGET,
    title: 'Positionskarte',
    text: 'Geld/Menge, Risiko, Norm und Frist sind markiert. Oben rechts: Fortschritt und „!“ für Wichtig. „Vergleichen“ legt bis zu vier Positionen nebeneinander.',
    prepare: ['ensureSelection'],
  },
  {
    chapter: 'lv',
    target: '[data-tour="search"]',
    title: 'Eine Suche für alles',
    text: 'OZ, Kurztext, Langtext und jedes PDF. ▲ ▼ springt von Treffer zu Treffer. Taste /',
    prepare: ['closeSelection'],
  },
  {
    chapter: 'lv',
    target: '[data-tour="filter"]',
    title: 'Filter',
    text: 'Nach Abschnitt, Einheit, Menge, LV und mehr. Nicht-Treffer werden blass.',
    todo: 'Tipp auf „+ Filter“',
    done: (state) => state.view.filterBar,
    prepare: ['closeFilter'],
  },
  {
    chapter: 'lv',
    target: '[data-tour="workspace"]',
    title: 'Ansicht',
    text: 'Bereiche wie Überblick, Tabelle und Dokument ein- und ausblenden. Am Kopf ziehen: stapeln oder tauschen. ↗ holt einen Bereich auf einen zweiten Bildschirm.',
  },
  {
    chapter: 'unterlagen',
    target: '[data-tour="menu"]',
    title: 'Dokument hinzufügen',
    text: 'Im Logo-Menü: „Dokument hinzufügen…“ für PDFs und weitere LVs. Oder die Datei einfach auf die Seite ziehen.',
  },
  {
    chapter: 'unterlagen',
    target: '[data-tour="doc-overview"]',
    title: 'Alle Unterlagen',
    text: 'Die Übersicht sortiert nach Dokumentart: LV, Baubeschreibung, Plan. Die Art lässt sich per Tipp ändern.',
    prepare: ['showDocOverview'],
  },
  {
    chapter: 'unterlagen',
    target: '[data-tour="doc-cards"]',
    title: 'Verknüpfungen im Graphen',
    text: 'Jede Linie verbindet eine PDF-Stelle mit einer Position. Tipp auf eine Zeile öffnet die Stelle.',
  },
  {
    chapter: 'unterlagen',
    target: DOC_PAGE,
    title: 'Stelle verknüpfen',
    text: 'Text im PDF markieren, dann Rechtsklick oder lange drücken: mit einer Position verknüpfen. Die Marke am Rand zeigt die OZ.',
    prepare: ['showDocText'],
  },
  {
    chapter: 'unterlagen',
    target: '[data-tour="suggest"]',
    title: 'Vorschläge',
    text: 'Nur bei exakter OZ oder Menge mit Einheit. Erst dein Tipp macht daraus eine Verknüpfung, „Nein“ wird gemerkt.',
    prepare: ['showDocText'],
  },
  {
    chapter: 'unterlagen',
    target: DOC_PAGE,
    title: 'Notiz mit @',
    text: 'Text markieren, Rechtsklick oder lange drücken, „Notiz…“. Mit @ verweist du auf eine Position, die Notiz steht dann auch auf ihrer Karte.',
    prepare: ['showDocText'],
  },
  {
    chapter: 'kalkulieren',
    target: '[data-tour="units"]',
    title: 'Mengen je Einheit',
    text: 'Der Überblick über das ganze LV. Tipp auf eine Einheit filtert.',
    prepare: ['showOverview'],
  },
  {
    chapter: 'kalkulieren',
    target: '[data-tour="beton"]',
    title: 'Betonsorten',
    text: 'Alle Sorten aus dem LV, fehlende Pflichtangaben als Hinweis. Tipp auf eine Sorte filtert.',
    prepare: ['showOverview'],
  },
  {
    chapter: 'kalkulieren',
    target: '[data-tour="measure"]',
    title: 'Im Plan messen',
    text: 'Maßstab übernehmen, Fläche oder Länge abgreifen und an die Position hängen. Das ergibt die VA-Menge mit Herkunft „Plan“.',
    prepare: ['showDocPlan'],
  },
  {
    chapter: 'kalkulieren',
    target: '[data-tour="hints"]',
    title: 'Hinweise',
    text: 'Prüfhinweise mit Fundstelle als Ring am Punkt. Hinweise, keine Urteile.',
  },
  {
    chapter: 'kalkulieren',
    target: '[data-tour="table"]',
    title: 'Arbeitsliste',
    text: 'Die Tabelle zeigt Fortschritt, VA-Menge und Herkunft. Offen, in Bearbeitung, fertig: direkt in der Zeile ändern.',
    prepare: ['showTable'],
  },
  {
    chapter: 'kalkulieren',
    target: '[data-tour="menu"]',
    title: 'Sichern und weitergeben',
    text: 'Im Logo-Menü: Arbeitsstand als Datei sichern, Export, Druck, Hell/Dunkel und diese Tour.',
  },
];

/** Erster Schritt eines Kapitels. */
export function chapterStart(chapter: TourChapter): number {
  return TOUR_STEPS.findIndex((step) => step.chapter === chapter);
}

/** Erster Schritt nach dem Kapitel von `index`; `null`, wenn es das letzte ist. */
export function nextChapterStart(index: number): number | null {
  const chapter = TOUR_STEPS[index]?.chapter;
  const next = TOUR_STEPS.findIndex((step, at) => at > index && step.chapter !== chapter);
  return chapter === undefined || next < 0 ? null : next;
}
