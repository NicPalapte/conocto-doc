// Geführte Tour (components/tour/): Angebot nach dem ersten LV, Schritte mit
// Spotlight auf echten Zielen, wartende Schritte und Überspringen fehlender Ziele.

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Tour } from '../../src/components/tour/Tour';
import { chapterStart, TOUR_STEPS } from '../../src/components/tour/tourSteps';
import { classifyAndBuild } from '../../src/lib/pipeline/runPipeline';
import { ViewerProvider } from '../../src/state/ViewerProvider';
import { useViewer, useViewerDispatch } from '../../src/state/viewer';
import type { LVDraft } from '@core';

// Geladene PDFs je Test; ohne Provider gäbe es keine (wie in einer App ohne Dokumente).
const pdfs = vi.hoisted(() => ({ count: 0, unreadable: false }));
const openFiles = vi.hoisted(() => async (): Promise<number> => {
  await Promise.resolve();
  if (pdfs.unreadable) return 0;
  pdfs.count = 1;
  return 1;
});
vi.mock('../../src/components/docs/DocumentsProvider', () => ({
  useOptionalDocuments: () => ({
    docs: Array.from({ length: pdfs.count }, (_, at) => ({ id: `pdf-${at}` })),
    active: null,
    kindOf: () => ({ kind: null, manual: false, guess: null }),
    activate: () => undefined,
    setOverview: () => undefined,
    openFiles,
  }),
}));

const DRAFT: LVDraft = {
  projectName: 'Tour',
  client: null,
  lots: [
    {
      number: '01',
      label: 'Los 1',
      sections: [
        {
          number: '01.01',
          label: 'Wände',
          sections: [],
          positions: [
            {
              oz: '01.01.0010',
              shortText: 'Wand',
              longText: 'Wand aus Beton',
              unit: 'm2',
              quantity: 10,
              unitPrice: null,
              positionType: 'NORMAL',
              attributes: {},
            },
          ],
        },
      ],
    },
  ],
};
const LV = classifyAndBuild(DRAFT, 'tour.x83');

/** Stellt die Ziele der Tour als einfache Elemente bereit — ohne Graph und Kopfleiste. */
function Harness({ without = [] }: { without?: readonly string[] }) {
  const dispatch = useViewerDispatch();
  const { selection, view } = useViewer();
  const has = (name: string): boolean => !without.includes(name);
  return (
    <>
      <button type="button" onClick={() => dispatch({ type: 'loaded', lv: LV })}>
        laden
      </button>
      <button type="button" onClick={() => dispatch({ type: 'tour', step: 0 })}>
        tour aus dem menü
      </button>
      <button
        type="button"
        data-slot="0"
        data-tier="position"
        onClick={() => dispatch({ type: 'selectPosition', nodeId: null, positionId: 'p' })}
      >
        punkt
      </button>
      {selection.positionId !== null && <div data-selection-card="">karte</div>}
      <output aria-label="auswahl">{selection.positionId ?? 'keine'}</output>
      <button
        type="button"
        onClick={() => dispatch({ type: 'selectPosition', nodeId: null, positionId: 'eigene' })}
      >
        eigene wählen
      </button>
      <div data-tour="search">suche</div>
      <button
        type="button"
        data-tour="filter"
        onClick={() => dispatch({ type: 'filterBar', open: true })}
      >
        + Filter
      </button>
      {has('hints') && <div data-tour="hints">hinweise</div>}
      {['doc-overview', 'doc-cards', 'doc-page', 'suggest', 'units', 'beton', 'measure'].map(
        (name) => (
          <div key={name} data-tour={name}>
            {name}
          </div>
        ),
      )}
      <div data-tour="workspace">anordnung</div>
      {!view.workspace.closed.table && <div data-tour="table">tabelle</div>}
      <div data-tour="menu">menü</div>
      <Tour />
    </>
  );
}

async function setup(without?: readonly string[], withPdfs = 0): Promise<void> {
  pdfs.count = withPdfs;
  pdfs.unreadable = false;
  render(
    <ViewerProvider>
      <Harness without={without} />
    </ViewerProvider>,
  );
  fireEvent.click(screen.getByText('laden'));
  // Das Angebot wartet, bis der Merker „schon gesehen“ gelesen ist.
  await act(async () => {
    await Promise.resolve();
  });
}

/** Alle Frames der Tour einmal laufen lassen. */
async function frames(ms = 50): Promise<void> {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

const tourTitle = (index: number): string => `Tour: ${TOUR_STEPS[index].title}`;
const DOCS = chapterStart('unterlagen');

/** Mit Weiter bis kurz vor `to` klicken. */
async function nextUntil(to: number): Promise<void> {
  for (let index = 0; index < to; index++) {
    await frames();
    fireEvent.click(screen.getByRole('button', { name: /Weiter|Überspringen|Fertig/ }));
  }
}

beforeEach(() => {
  vi.useFakeTimers();
  // jsdom rechnet kein Layout; ohne Fläche gälte jedes Ziel als unsichtbar.
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue(
    new DOMRect(100, 100, 40, 20),
  );
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('Tour', () => {
  it('bietet sich nach dem ersten LV an und startet beim Punkt', async () => {
    await setup();
    fireEvent.click(screen.getByRole('button', { name: 'Tour starten' }));
    await frames();
    expect(screen.getByRole('dialog', { name: tourTitle(0) })).toBeTruthy();
    expect(screen.getByText(/Tipp auf den markierten Punkt/)).toBeTruthy();
  });

  it('geht weiter, sobald man den verlangten Klick selbst macht', async () => {
    await setup();
    fireEvent.click(screen.getByRole('button', { name: 'Tour starten' }));
    await frames();
    fireEvent.click(screen.getByText('punkt'));
    await frames();
    expect(screen.getByRole('dialog', { name: tourTitle(1) })).toBeTruthy();
  });

  it('ohne PDF endet das Angebot nach dem Kapitel „LV lesen“', async () => {
    await setup();
    expect(screen.getByText(`${DOCS} Schritte · ca. 1 Minute`)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Tour starten' }));
    for (let index = 0; index < DOCS; index++) {
      await frames();
      expect(screen.getByRole('dialog', { name: tourTitle(index) })).toBeTruthy();
      fireEvent.click(screen.getByRole('button', { name: /Weiter|Überspringen|Fertig/ }));
    }
    await frames();
    expect(screen.getByRole('dialog', { name: 'Unterlagen dazu?' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Später' }));
    await frames();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('am Ende von Kapitel 1 führt „PDF hinzufügen“ direkt in Kapitel 2', async () => {
    await setup();
    fireEvent.click(screen.getByRole('button', { name: 'Tour starten' }));
    await nextUntil(DOCS);
    await frames();
    const file = new File(['%PDF'], 'bb.pdf', { type: 'application/pdf' });
    fireEvent.change(screen.getByLabelText('PDF hinzufügen…'), { target: { files: [file] } });
    await frames();
    fireEvent.click(screen.getByText('eigene wählen'));
    await frames();
    await frames();
    expect(screen.getByRole('dialog', { name: tourTitle(DOCS + 1) })).toBeTruthy();
  });

  it('Escape schließt die Karte „Unterlagen dazu?“', async () => {
    await setup();
    fireEvent.click(screen.getByRole('button', { name: 'Tour starten' }));
    await nextUntil(DOCS);
    await frames();
    expect(screen.getByRole('dialog', { name: 'Unterlagen dazu?' })).toBeTruthy();
    fireEvent.keyDown(window, { key: 'Escape' });
    await frames();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('ist das PDF der Karte nicht lesbar, kommt beim nächsten PDF die Karte „PDFs sind da“', async () => {
    await setup();
    fireEvent.click(screen.getByRole('button', { name: 'Tour starten' }));
    await nextUntil(DOCS);
    await frames();
    pdfs.unreadable = true;
    const file = new File(['kaputt'], 'bb.pdf', { type: 'application/pdf' });
    fireEvent.change(screen.getByLabelText('PDF hinzufügen…'), { target: { files: [file] } });
    await frames();
    expect(screen.queryByRole('dialog')).toBeNull();
    pdfs.count = 1;
    fireEvent.click(screen.getByText('eigene wählen'));
    await frames();
    expect(screen.getByRole('dialog', { name: 'PDFs sind da' })).toBeTruthy();
  });

  it('aus dem Logo-Menü läuft sie über alle Kapitel bis zum Ende', async () => {
    await setup();
    fireEvent.click(screen.getByRole('button', { name: 'Später' }));
    fireEvent.click(screen.getByText('tour aus dem menü'));
    for (let index = 0; index < TOUR_STEPS.length; index++) {
      await frames();
      expect(screen.getByRole('dialog', { name: tourTitle(index) })).toBeTruthy();
      fireEvent.click(screen.getByRole('button', { name: /Weiter|Überspringen|Fertig/ }));
    }
    await frames();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('öffnet für ihren Schritt die Tabelle, die beim Start zu ist', async () => {
    await setup();
    expect(screen.queryByText('tabelle')).toBeNull();
    const table = TOUR_STEPS.findIndex((step) => step.target === '[data-tour="table"]');
    fireEvent.click(screen.getByText('tour aus dem menü'));
    await nextUntil(table);
    await frames();
    expect(screen.getByRole('dialog', { name: tourTitle(table) })).toBeTruthy();
    expect(screen.getByText('tabelle')).toBeTruthy();
  });

  it('überspringt einen Schritt, dessen Ziel fehlt', async () => {
    await setup(['hints']);
    const hints = TOUR_STEPS.findIndex((step) => step.target === '[data-tour="hints"]');
    fireEvent.click(screen.getByText('tour aus dem menü'));
    await nextUntil(hints);
    await frames(1000);
    await frames();
    expect(screen.getByRole('dialog', { name: tourTitle(hints + 1) })).toBeTruthy();
  });

  it('Escape beendet die Tour, das Angebot kommt nicht wieder', async () => {
    await setup();
    fireEvent.click(screen.getByRole('button', { name: 'Tour starten' }));
    await frames();
    fireEvent.keyDown(window, { key: 'Escape' });
    await frames();
    expect(screen.queryByRole('dialog')).toBeNull();
    fireEvent.click(screen.getByText('laden'));
    await frames();
    expect(screen.queryByRole('button', { name: 'Tour starten' })).toBeNull();
  });

  it('Escape schließt die Willkommenskarte', async () => {
    await setup();
    fireEvent.keyDown(window, { key: 'Escape' });
    await frames();
    expect(screen.queryByRole('dialog', { name: 'Willkommen bei Conocto' })).toBeNull();
  });

  it('„Später" an der Willkommenskarte blendet sie aus', async () => {
    await setup();
    expect(screen.getByRole('dialog', { name: 'Willkommen bei Conocto' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Später' }));
    await frames();
    expect(screen.queryByRole('dialog', { name: 'Willkommen bei Conocto' })).toBeNull();
  });

  it('überspringt rückwärts, wenn das Ziel beim Zurückgehen fehlt', async () => {
    await setup(['hints']);
    const hints = TOUR_STEPS.findIndex((step) => step.target === '[data-tour="hints"]');
    fireEvent.click(screen.getByText('tour aus dem menü'));
    await nextUntil(hints);
    await frames(1000);
    await frames();
    fireEvent.click(screen.getByRole('button', { name: 'Zurück' }));
    await frames(1000);
    await frames();
    expect(screen.getByRole('dialog', { name: tourTitle(hints - 1) })).toBeTruthy();
  });

  it('zeigt die Positionskarte auch, wenn der Punkt-Schritt übersprungen wurde', async () => {
    await setup();
    fireEvent.click(screen.getByRole('button', { name: 'Tour starten' }));
    await frames();
    fireEvent.click(screen.getByRole('button', { name: 'Überspringen' }));
    await frames();
    await frames();
    expect(screen.getByRole('dialog', { name: tourTitle(1) })).toBeTruthy();
    expect(screen.getByLabelText('auswahl').textContent).toBe('p');
  });

  it('gibt nach dem Ende die eigene Auswahl zurück', async () => {
    await setup();
    fireEvent.click(screen.getByText('eigene wählen'));
    fireEvent.click(screen.getByRole('button', { name: 'Tour starten' }));
    await frames();
    expect(screen.getByLabelText('auswahl').textContent).toBe('keine');
    fireEvent.click(screen.getByText('punkt'));
    await frames();
    fireEvent.keyDown(window, { key: 'Escape' });
    await frames();
    expect(screen.getByLabelText('auswahl').textContent).toBe('eigene');
  });

  it('„Kapitel überspringen“ springt zum ersten Schritt des nächsten Kapitels', async () => {
    await setup();
    fireEvent.click(screen.getByText('tour aus dem menü'));
    await frames();
    fireEvent.click(screen.getByRole('button', { name: /Kapitel überspringen/ }));
    await frames();
    expect(screen.getByRole('dialog', { name: tourTitle(DOCS) })).toBeTruthy();
    expect(screen.getByText(/Kapitel 2 · Unterlagen verknüpfen/)).toBeTruthy();
  });

  it('mit PDFs bietet die Willkommenskarte alle Kapitel an', async () => {
    await setup(undefined, 2);
    expect(screen.getByText(`${TOUR_STEPS.length} Schritte · ca. 3 Minuten`)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Tour starten' }));
    await nextUntil(DOCS);
    await frames();
    expect(screen.getByRole('dialog', { name: tourTitle(DOCS) })).toBeTruthy();
  });

  it('das erste PDF bringt eine zweite Karte für Kapitel 2 und 3', async () => {
    await setup();
    fireEvent.click(screen.getByRole('button', { name: 'Später' }));
    await frames();
    expect(screen.queryByRole('dialog')).toBeNull();
    pdfs.count = 1;
    fireEvent.click(screen.getByText('eigene wählen'));
    await frames();
    expect(screen.getByRole('dialog', { name: 'PDFs sind da' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Tour starten' }));
    await frames();
    expect(screen.getByRole('dialog', { name: tourTitle(DOCS) })).toBeTruthy();
    fireEvent.keyDown(window, { key: 'Escape' });
    await frames();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('„Später“ an der Willkommenskarte mit PDFs bringt keine zweite Karte', async () => {
    await setup(undefined, 1);
    fireEvent.click(screen.getByRole('button', { name: 'Später' }));
    await frames();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('Escape gehört zuerst einem anderen offenen Fenster', async () => {
    await setup();
    fireEvent.click(screen.getByRole('button', { name: 'Tour starten' }));
    await frames();
    const other = document.createElement('div');
    other.setAttribute('role', 'dialog');
    document.body.append(other);
    fireEvent.keyDown(window, { key: 'Escape' });
    await frames();
    expect(screen.getByRole('dialog', { name: tourTitle(0) })).toBeTruthy();
    other.remove();
  });
});

describe('Tour · gemerkt über das Neuladen (Issue #191)', () => {
  beforeEach(async () => {
    // fake-indexeddb antwortet über echte Zeitgeber.
    vi.useRealTimers();
    const { IDBFactory } = await import('fake-indexeddb');
    globalThis.indexedDB = new IDBFactory();
  });
  afterEach(() => {
    // @ts-expect-error — jsdom kennt kein IndexedDB; nach dem Test wieder wie vorher.
    delete globalThis.indexedDB;
  });

  const oeffnen = () =>
    render(
      <ViewerProvider>
        <Harness />
      </ViewerProvider>,
    );

  it('bietet sich beim ersten Öffnen an, nach ✕ beim nächsten Öffnen nicht mehr', async () => {
    const erstes = oeffnen();
    fireEvent.click(screen.getByText('laden'));
    fireEvent.click(await screen.findByRole('button', { name: 'Später' }));
    await waitFor(async () => {
      const { readTourSeen } = await import('../../src/lib/persist/lastLv');
      expect(await readTourSeen()).toEqual({ lv: true, unterlagen: false });
    });
    erstes.unmount();

    oeffnen();
    fireEvent.click(screen.getByText('laden'));
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(screen.queryByRole('dialog', { name: 'Willkommen bei Conocto' })).toBeNull();
  });
});
