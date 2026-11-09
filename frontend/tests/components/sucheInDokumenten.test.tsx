// Eine Suche für LV und PDFs (Entscheidung 0103, ersetzt 0084): Die Suchleiste sucht im LV
// und in allen offenen PDFs; der Navigator springt in der Quelle, in der zuletzt gearbeitet
// wurde, die Quellen klappen unter der Suchleiste aus.
//
// PDF.js läuft in jsdom nicht: `openPdf` liefert ein Schein-PDF mit festem Seitentext,
// und die Seiten selbst werden nicht gezeichnet.

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import App from '../../src/App';
import type { OpenedPdf } from '../../src/lib/docs/pdf';

const SEITEN = [
  'Abdichtung der Kellerwände mit Bitumendickbeschichtung.',
  'Bodenplatte aus WU-Beton.',
  'Übergang Bitumendickbeschichtung zu WU-Beton mit Fugenblech.',
];

const openPdf = vi.hoisted(() => vi.fn());

vi.mock('../../src/lib/docs/pdf', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../src/lib/docs/pdf')>();
  return { ...original, openPdf };
});
vi.mock('../../src/components/docs/PdfPage', () => ({ PdfPage: () => null }));

function scheinPdf(name: string, id = 'abc123def456'): OpenedPdf {
  const pdf = {
    numPages: SEITEN.length,
    loadingTask: { destroy: () => Promise.resolve() },
    getPage: (page: number) =>
      Promise.resolve({
        getViewport: () => ({ width: 600, height: 800 }),
        getTextContent: () => Promise.resolve({ items: [{ str: SEITEN[page - 1] }] }),
      }),
  };
  return { id, name, pdf } as unknown as OpenedPdf;
}

const FIXTURE_DIR = resolve(process.cwd(), '../packages/core/tests/fixtures');

async function ladeApp(): Promise<void> {
  render(<App />);
  const name = 'gaeb-xml-beispiel.x83';
  fireEvent.change(screen.getByLabelText('GAEB-Datei auswählen'), {
    target: { files: [new File([readFileSync(resolve(FIXTURE_DIR, name))], name)] },
  });
  await waitFor(() => expect(screen.getByRole('button', { name: '+ Filter' })).toBeInTheDocument());
  // Die Arbeitsfläche steht erst mit dem Baum, in langsamen Umgebungen etwas später.
  await screen.findByRole('main', { name: 'Bubble-Graph' }, { timeout: 5000 });
}

async function oeffnePdf(name: string, id?: string): Promise<void> {
  openPdf.mockResolvedValue(scheinPdf(name, id));
  fireEvent.change(screen.getByLabelText('PDF auswählen'), {
    target: { files: [new File(['%PDF'], name, { type: 'application/pdf' })] },
  });
  await waitFor(() => expect(screen.getAllByTitle(name).length).toBeGreaterThan(0), {
    timeout: 3000,
  });
}

async function suche(begriff: string): Promise<HTMLElement> {
  const feld = screen.getByRole('textbox', { name: 'Suche' });
  fireEvent.focus(feld);
  fireEvent.change(feld, { target: { value: begriff } });
  return screen.findByRole('group', { name: 'Treffer je Quelle' }, { timeout: 3000 });
}

/** Klick ins Dokument: dort sucht der Navigator ab jetzt. */
function insDokument(): void {
  const bereich = document.querySelector('[data-search-source="doc"]');
  if (bereich === null) throw new Error('Bereich „Dokument“ fehlt');
  fireEvent.pointerDown(bereich);
}

describe('Eine Suche für LV und PDFs', () => {
  it('zählt Treffer im LV und in jedem offenen PDF', async () => {
    await ladeApp();
    await oeffnePdf('baubeschreibung.pdf');
    await oeffnePdf('vorbemerkungen.pdf', 'fff000fff000');

    const liste = await suche('WU-Beton');
    const zeile = (name: RegExp) => within(liste).getByRole('button', { name });
    expect(zeile(/^LV/)).toBeInTheDocument();
    await waitFor(() => expect(zeile(/baubeschreibung\.pdf/)).toHaveTextContent(/2/));
    await waitFor(() => expect(zeile(/vorbemerkungen\.pdf/)).toHaveTextContent(/2/));
    expect(zeile(/vorbemerkungen\.pdf/)).toHaveTextContent('S. 2 · Bodenplatte aus WU-Beton.');
  });

  it('springt im aktiven Dokument und weist am Ende aufs nächste hin', async () => {
    await ladeApp();
    await oeffnePdf('baubeschreibung.pdf');
    await oeffnePdf('vorbemerkungen.pdf', 'fff000fff000');
    await suche('WU-Beton');
    insDokument();

    const zaehler = () => screen.getByRole('button', { name: /^Treffer in / });
    await waitFor(() => expect(zaehler()).toHaveAccessibleName(/vorbemerkungen\.pdf: 1 \/ 2/));
    fireEvent.click(screen.getByRole('button', { name: 'Nächster Treffer' }));
    expect(zaehler()).toHaveAccessibleName(/2 \/ 2/);
    expect(screen.queryByRole('status', { name: '' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Nächster Treffer' }));
    expect(zaehler()).toHaveAccessibleName(/1 \/ 2/);
    const weiter = screen.getByRole('button', { name: /Weiter in: / });
    expect(screen.getByText('Ende von vorbemerkungen.pdf')).toBeInTheDocument();

    fireEvent.click(weiter);
    await waitFor(() => expect(zaehler()).not.toHaveAccessibleName(/vorbemerkungen/));
  });

  it('wechselt per Klick in der Liste das Dokument', async () => {
    await ladeApp();
    await oeffnePdf('baubeschreibung.pdf');
    await oeffnePdf('vorbemerkungen.pdf', 'fff000fff000');
    const liste = await suche('WU-Beton');
    fireEvent.click(within(liste).getByRole('button', { name: /baubeschreibung\.pdf/ }));
    expect(
      screen.getByRole('button', { name: 'Dokument wählen: baubeschreibung.pdf' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Treffer in baubeschreibung\.pdf/ })).toBeVisible();
  });

  it('springt im LV von Position zu Position', async () => {
    await ladeApp();
    await suche('a');
    const zaehler = screen.getByRole('button', { name: /^Treffer in LV/ });
    expect(zaehler).toHaveAccessibleName(/– \//);
    fireEvent.click(screen.getByRole('button', { name: 'Nächster Treffer' }));
    expect(zaehler).toHaveAccessibleName(/LV: 1 \//);
    // Die Zählung folgt der Auswahl: Position 1 der Treffer ist gewählt.

    // ↓ und ↑ im Suchfeld springen ebenso.
    const feld = screen.getByRole('textbox', { name: 'Suche' });
    fireEvent.keyDown(feld, { key: 'ArrowDown' });
    expect(zaehler).toHaveAccessibleName(/LV: 2 \//);
    fireEvent.keyDown(feld, { key: 'ArrowUp' });
    expect(zaehler).toHaveAccessibleName(/LV: 1 \//);
  });

  it('holt die Suchleiste mit Strg F, wenn zuletzt ins Dokument geklickt wurde', async () => {
    await ladeApp();
    await oeffnePdf('baubeschreibung.pdf');
    const feld = screen.getByRole('textbox', { name: 'Suche' });

    // Zuletzt im LV gearbeitet: Strg F bleibt beim Browser.
    fireEvent.pointerDown(document.querySelector('[data-search-source="lv"]') as Element);
    fireEvent.keyDown(document.body, { key: 'f', ctrlKey: true });
    expect(feld).not.toHaveFocus();

    insDokument();
    fireEvent.keyDown(document.body, { key: 'f', ctrlKey: true });
    expect(feld).toHaveFocus();
  });
});
