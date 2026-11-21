// Pläne im PDF messen (Entscheidung 0095): Oberfläche in `usePlanMeasuring` und
// `PlanControls`. Die Rechenlogik prüft `tests/lib/planNotes.test.ts`.
//
// PDF.js läuft in jsdom nicht: `openPdf` liefert ein Schein-PDF, `PdfPage` zeichnet nur die
// Mess-Ebene (`overlay`) im Maßstab 1. jsdom liefert leere Rechtecke, ein Klick bei
// `clientX`/`clientY` landet so genau auf diesem Punkt der Seite.

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../../src/App';
import type { OpenedPdf } from '../../src/lib/docs/pdf';
import { schliesseTourAngebot } from '../helpers/tourAngebot';

const openPdf = vi.hoisted(() => vi.fn());

vi.mock('../../src/lib/docs/pdf', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../src/lib/docs/pdf')>();
  return { ...original, openPdf };
});

/** A3 quer: größer als A4 ⇒ Conocto schätzt die Seite als Plan. */
const PLAN = { width: 1190, height: 842 };
/** A4 hoch ohne Text ⇒ Textseite. */
const TEXT = { width: 595, height: 842 };

vi.mock('../../src/components/docs/PdfPage', () => ({
  PdfPage: ({
    page,
    overlay,
  }: {
    page: number;
    overlay?: (page: number, size: { width: number; height: number }, scale: number) => ReactNode;
  }) => (
    <div data-page={page} className="relative">
      {overlay?.(page, page === 1 ? { width: 1190, height: 842 } : { width: 595, height: 842 }, 1)}
    </div>
  ),
}));

function scheinPdf(file: File): OpenedPdf {
  const pdf = {
    numPages: 2,
    loadingTask: { destroy: () => Promise.resolve() },
    getPage: (page: number) =>
      Promise.resolve({
        getViewport: () => (page === 1 ? PLAN : TEXT),
        getTextContent: () => Promise.resolve({ items: [] }),
      }),
  };
  return { id: 'grundriss-01', name: file.name, pdf } as unknown as OpenedPdf;
}

const FIXTURE_DIR = resolve(process.cwd(), '../packages/core/tests/fixtures');

/** 10 m bei 1:100 in Seiten-Einheiten (1 pt = 1/72 Zoll). */
const ZEHN_METER = (10 / 100 / 0.0254) * 72;

async function ladeAppMitPlan(): Promise<void> {
  render(<App />);
  const name = 'gaeb-xml-beispiel.x83';
  fireEvent.change(screen.getByLabelText('GAEB-Datei auswählen'), {
    target: { files: [new File([readFileSync(resolve(FIXTURE_DIR, name))], name)] },
  });
  await screen.findByRole('main', { name: 'Bubble-Graph' }, { timeout: 5000 });
  // Die Willkommenskarte der Tour fängt sonst das erste Esc ab.
  await schliesseTourAngebot();
  fireEvent.change(screen.getByLabelText('Dokument auswählen'), {
    target: { files: [new File(['%PDF'], 'grundriss.pdf', { type: 'application/pdf' })] },
  });
  // Die Seitenart wird im Hintergrund geschätzt; danach erscheint der Seitenfilter.
  await screen.findByRole('radiogroup', { name: 'Seiten' }, { timeout: 5000 });
  // Das erste PDF bringt die Karte für die PDF-Kapitel der Tour.
  await schliesseTourAngebot();
}

const seiten = (): number[] =>
  [...document.querySelectorAll<HTMLElement>('[data-page]')].map((el) => Number(el.dataset.page));

function taste(key: string): void {
  act(() => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
  });
}

/** Antippen im Plan: drücken und an derselben Stelle loslassen. */
function tippe(x: number, y: number): void {
  const ebene = screen.getByRole('application', { name: 'Plan: Punkt setzen' });
  fireEvent.pointerDown(ebene, { button: 0, clientX: x, clientY: y, pointerType: 'mouse' });
  fireEvent.pointerUp(ebene, { button: 0, clientX: x, clientY: y, pointerType: 'mouse' });
}

/** Maßstab 1:100 von Hand für die Planseite. */
async function setzeMassstab(): Promise<void> {
  fireEvent.click(screen.getByRole('button', { name: 'Maßstab fehlt' }));
  const dialog = await screen.findByRole('dialog', { name: 'Maßstab' });
  fireEvent.change(within(dialog).getByLabelText('Maßstab 1 zu'), { target: { value: '100' } });
  fireEvent.click(within(dialog).getByRole('button', { name: 'Übernehmen' }));
  await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Maßstab' })).toBeNull());
}

/** Eine Strecke von 10 m zeichnen; `y` trennt mehrere Strecken. */
function zeichneStrecke(y: number): void {
  tippe(100, y);
  tippe(100 + ZEHN_METER, y);
}

describe('Plan-Messung', () => {
  beforeEach(() => {
    openPdf.mockReset();
    openPdf.mockImplementation((file: File) => Promise.resolve(scheinPdf(file)));
  });

  it('erkennt die Planseite und filtert nach Text und Plänen', async () => {
    await ladeAppMitPlan();
    const filter = screen.getByRole('radiogroup', { name: 'Seiten' });
    expect(within(filter).getByRole('radio', { name: 'Pläne 1' })).toBeInTheDocument();
    expect(within(filter).getByRole('radio', { name: 'Text 1' })).toBeInTheDocument();
    expect(seiten()).toEqual([1, 2]);

    fireEvent.click(within(filter).getByRole('radio', { name: 'Pläne 1' }));
    await waitFor(() => expect(seiten()).toEqual([1]));
    fireEvent.click(within(filter).getByRole('radio', { name: 'Text 1' }));
    await waitFor(() => expect(seiten()).toEqual([2]));
    fireEvent.click(within(filter).getByRole('radio', { name: 'Alle 2' }));
    await waitFor(() => expect(seiten()).toEqual([1, 2]));
  });

  it('stellt eine Seite von Hand auf Text um', async () => {
    await ladeAppMitPlan();
    fireEvent.click(screen.getByRole('button', { name: 'Seite 1 ist Plan — umstellen' }));
    await waitFor(() => expect(screen.queryByRole('radiogroup', { name: 'Seiten' })).toBeNull());
    expect(screen.queryByRole('button', { name: 'Messen' })).toBeNull();
  });

  it('übernimmt einen Maßstab von Hand', async () => {
    await ladeAppMitPlan();
    await setzeMassstab();
    expect(screen.queryByRole('button', { name: 'Maßstab fehlt' })).toBeNull();
  });

  it('zeichnet eine Strecke und zeigt ihren Wert', async () => {
    await ladeAppMitPlan();
    await setzeMassstab();
    const messen = screen.getByRole('button', { name: 'Messen' });
    fireEvent.click(messen);
    expect(messen).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('toolbar', { name: 'Messen' })).toBeInTheDocument();

    zeichneStrecke(100);
    const leiste = await screen.findByRole('group', { name: 'Messung' });
    expect(within(leiste).getByLabelText('Name der Messung')).toHaveValue('Länge 1');
    expect(leiste).toHaveTextContent('10,00 m');
  });

  it('zeigt ohne Maßstab keinen Wert, sondern den Hinweis', async () => {
    await ladeAppMitPlan();
    fireEvent.click(screen.getByRole('button', { name: 'Messen' }));
    zeichneStrecke(100);
    const leiste = await screen.findByRole('group', { name: 'Messung' });
    expect(leiste).toHaveTextContent('—');
    expect(leiste).toHaveTextContent('Maßstab fehlt');
  });

  it('Esc beendet erst das Werkzeug, dann die Auswahl', async () => {
    await ladeAppMitPlan();
    fireEvent.click(screen.getByRole('button', { name: 'Messen' }));
    zeichneStrecke(100);
    await screen.findByRole('group', { name: 'Messung' });

    taste('Escape');
    expect(screen.queryByRole('toolbar', { name: 'Messen' })).toBeNull();
    expect(screen.getByRole('group', { name: 'Messung' })).toBeInTheDocument();

    taste('Escape');
    expect(screen.queryByRole('group', { name: 'Messung' })).toBeNull();
  });

  it('verwirft einen angefangenen Entwurf mit Esc, ohne Messung', async () => {
    await ladeAppMitPlan();
    fireEvent.click(screen.getByRole('button', { name: 'Messen' }));
    tippe(100, 100);
    taste('Escape');
    expect(screen.queryByRole('group', { name: 'Messung' })).toBeNull();
    expect(screen.queryByTitle('Messung zeigen')).toBeNull();
    // Das Werkzeug bleibt aktiv; erst der nächste Esc beendet es.
    expect(screen.getByRole('toolbar', { name: 'Messen' })).toBeInTheDocument();
  });

  it('wählt eine Messung im Plan und löscht sie mit Entf', async () => {
    await ladeAppMitPlan();
    fireEvent.click(screen.getByRole('button', { name: 'Messen' }));
    zeichneStrecke(100);
    taste('Escape');
    taste('Escape');

    fireEvent.click(screen.getByTitle('Messung zeigen'));
    expect(await screen.findByRole('group', { name: 'Messung' })).toBeInTheDocument();
    taste('Delete');
    expect(screen.queryByRole('group', { name: 'Messung' })).toBeNull();
    expect(screen.queryByTitle('Messung zeigen')).toBeNull();
  });

  it('summiert mehrere mit Shift gewählte Messungen gleicher Art', async () => {
    await ladeAppMitPlan();
    await setzeMassstab();
    fireEvent.click(screen.getByRole('button', { name: 'Messen' }));
    zeichneStrecke(100);
    zeichneStrecke(300);
    taste('Escape');
    taste('Escape');

    const [erste, zweite] = screen.getAllByTitle('Messung zeigen');
    fireEvent.click(erste);
    fireEvent.click(zweite, { shiftKey: true });
    const auswahl = await screen.findByRole('group', { name: 'Gewählte Messungen' });
    expect(auswahl).toHaveTextContent('2 gewählt');
    expect(auswahl).toHaveTextContent('Σ 20,00 m');

    fireEvent.click(within(auswahl).getByRole('button', { name: 'Löschen' }));
    expect(screen.queryAllByTitle('Messung zeigen')).toHaveLength(0);
  });

  it('benennt eine Messung um', async () => {
    await ladeAppMitPlan();
    fireEvent.click(screen.getByRole('button', { name: 'Messen' }));
    zeichneStrecke(100);
    const feld = within(await screen.findByRole('group', { name: 'Messung' })).getByLabelText(
      'Name der Messung',
    );
    fireEvent.change(feld, { target: { value: 'Sockel Flur' } });
    expect(screen.getByTitle('Messung zeigen')).toHaveTextContent('Sockel Flur');
  });

  it('nimmt eine Messung in den Rechenansatz einer Position, Esc beendet ihn', async () => {
    await ladeAppMitPlan();
    await setzeMassstab();
    fireEvent.click(screen.getByRole('button', { name: 'Messen' }));
    zeichneStrecke(100);
    taste('Escape');
    taste('Escape');

    // Erste Position im Graphen wählen, deren Karte einen Ansatz anbietet.
    let starten: HTMLElement | null = null;
    for (const punkt of document.querySelectorAll('[data-slot]')) {
      fireEvent.click(punkt);
      starten = screen.queryByRole('button', { name: 'Ansatz im Plan bilden' });
      if (starten !== null) break;
    }
    if (starten === null) throw new Error('Keine Position mit „Ansatz im Plan bilden“');
    fireEvent.click(starten);

    expect(
      await screen.findByText(/Ansatz für .+: Maß oder Messung im Plan antippen/),
    ).toBeInTheDocument();
    // Beim Start eines Ansatzes zeigt das Dokument nur die Pläne.
    expect(screen.getByRole('radio', { name: 'Pläne 1' })).toHaveAttribute('aria-checked', 'true');

    fireEvent.click(screen.getByTitle('In den Ansatz übernehmen'));
    const menge = screen.getByRole('region', { name: 'VA-Menge' });
    await waitFor(() => expect(menge).toHaveTextContent('Länge 1'));

    taste('Escape');
    expect(screen.queryByText(/Ansatz für .+: Maß oder Messung im Plan antippen/)).toBeNull();
    expect(screen.getByTitle('Messung zeigen')).toBeInTheDocument();
  });
});
