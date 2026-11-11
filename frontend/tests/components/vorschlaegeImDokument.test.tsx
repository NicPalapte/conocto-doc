// Vorschläge im Begleitdokument (Entscheidung 0080): OZ und Mengen aus dem LV
// erscheinen gestrichelt; verknüpft wird erst nach „Verknüpfen“, „Nein“ merkt sich
// die Ablehnung. Seitentext erfunden, LV aus den öffentlichen Fixtures.
//
// PDF.js läuft in jsdom nicht: `openPdf` liefert ein Schein-PDF mit festem Seitentext,
// und die Seite zeigt statt Bild und Textebene nur Knöpfe für ihre Vorschläge.

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import App from '../../src/App';
import type { DocSuggestion } from '../../src/lib/docs/docSuggest';
import type { OpenedPdf } from '../../src/lib/docs/pdf';

const SEITEN = [
  'Nach Pos. 1.2.20 sind 7.200 m³ Boden zu lösen.',
  'Zusätzlich 783,03 m³ Beton für die Bodenplatte.',
];

const openPdf = vi.hoisted(() => vi.fn());

vi.mock('../../src/lib/docs/pdf', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../src/lib/docs/pdf')>();
  return { ...original, openPdf };
});
vi.mock('../../src/components/docs/PdfPage', () => ({
  PdfPage: ({
    suggestions,
    onSuggestion,
  }: {
    suggestions: readonly DocSuggestion[];
    onSuggestion: (item: DocSuggestion, at: { left: number; top: number }) => void;
  }) =>
    suggestions.map((item) => (
      <button
        key={`${item.start}-${item.id}`}
        type="button"
        onClick={() => onSuggestion(item, { left: 10, top: 10 })}
      >
        {`Vorschlag ${item.text}`}
      </button>
    )),
}));

function scheinPdf(seiten: readonly string[]): OpenedPdf {
  const pdf = {
    numPages: seiten.length,
    loadingTask: { destroy: () => Promise.resolve() },
    getPage: (page: number) =>
      Promise.resolve({
        getViewport: () => ({ width: 600, height: 800 }),
        getTextContent: () => Promise.resolve({ items: [{ str: seiten[page - 1] }] }),
      }),
  };
  return { id: 'abc123def456', name: 'baubeschreibung.pdf', pdf } as unknown as OpenedPdf;
}

/** So lange dürfen PDF und Vorschläge auf langsamen CI-Rechnern brauchen. */
const PDF_MS = 5_000;

const FIXTURE_DIR = resolve(process.cwd(), '../packages/core/tests/fixtures');

async function ladeAppMitPdf(seiten: readonly string[] = SEITEN): Promise<void> {
  render(<App />);
  const name = 'gaeb-xml-beispiel.x83';
  fireEvent.change(screen.getByLabelText('GAEB-Datei auswählen'), {
    target: { files: [new File([readFileSync(resolve(FIXTURE_DIR, name))], name)] },
  });
  await screen.findByRole('main', { name: 'Bubble-Graph' }, { timeout: 5000 });
  openPdf.mockResolvedValue(scheinPdf(seiten));
  fireEvent.change(screen.getByLabelText('PDF auswählen'), {
    target: { files: [new File(['%PDF'], 'baubeschreibung.pdf', { type: 'application/pdf' })] },
  });
  // Lokal ~1 s. Frühere Ausreißer über 15 s waren kein Zeitproblem: Ein PDF direkt nach
  // dem LV-Laden wurde verworfen (behoben in `DocumentsProvider`, Layout-Effekt).
  await screen.findByRole('group', { name: 'Durchgehen' }, { timeout: PDF_MS });
}

/** Öffnet das Menü des Blätterers mit den Schaltern je Art (Issue #191, Runde 3). */
function arten(): ReturnType<typeof within> {
  const knopf = within(screen.getByRole('group', { name: 'Durchgehen' })).getByRole('button', {
    name: /▾/,
  });
  if (knopf.getAttribute('aria-expanded') !== 'true') fireEvent.click(knopf);
  return within(screen.getByRole('menu', { name: 'Durchgehen' }));
}

describe('Vorschläge im Dokument', { timeout: 15_000 }, () => {
  it('OZ mit Menge zum Vergleich, verknüpft erst nach Klick', async () => {
    await ladeAppMitPdf();
    await waitFor(() =>
      expect(arten().getByRole('menuitemcheckbox', { name: /OZ\s*1/ })).toBeInTheDocument(),
    );
    expect(arten().getByRole('menuitemcheckbox', { name: /Mengen\s*1/ })).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });

    fireEvent.click(screen.getByRole('button', { name: 'Vorschlag 1.2.20' }));
    const leiste = screen.getByRole('dialog', { name: 'Vorschlag verknüpfen' });
    expect(within(leiste).getByText('001.002.0020')).toBeInTheDocument();
    expect(within(leiste).getByText('PDF 7.200 m³ · LV 7.200 m3')).toBeInTheDocument();

    // „Position zeigen“ wählt die Position, die Leiste bleibt zum Entscheiden offen.
    expect(screen.getByText('Keine Auswahl')).toBeInTheDocument();
    fireEvent.click(within(leiste).getByRole('button', { name: 'Position zeigen ›' }));
    await waitFor(() => expect(screen.queryByText('Keine Auswahl')).toBeNull());
    expect(screen.getByRole('dialog', { name: 'Vorschlag verknüpfen' })).toBeInTheDocument();

    fireEvent.click(within(leiste).getByRole('button', { name: 'Verknüpfen' }));
    // Die Leiste geht gleich zum nächsten offenen Vorschlag (Issue #191).
    const weiter = screen.getByRole('dialog', { name: 'Vorschlag verknüpfen' });
    expect(within(weiter).getByText('001.003.0040')).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: 'Vorschlag verknüpfen' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Vorschlag 1.2.20' })).toBeNull();
    // Alle OZ-Vorschläge erledigt: ihr Schalter verschwindet, der für Mengen bleibt.
    expect(arten().queryByRole('menuitemcheckbox', { name: /OZ/ })).toBeNull();
    expect(arten().getByRole('menuitemcheckbox', { name: /Mengen\s*1/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Vorschlag 783,03 m³' }));
    fireEvent.click(screen.getByRole('button', { name: 'Nein' }));
    // Keine offenen Vorschläge mehr: der Blätterer geht nur noch die Verknüpfungen durch.
    expect(screen.getByRole('button', { name: 'Verknüpfungen ▾' })).toBeInTheDocument();
    expect(arten().queryByRole('menuitemcheckbox')).toBeNull();
  });

  it('Betonsorte im Text: Vorschlag über Beton (0106)', async () => {
    await ladeAppMitPdf(['Für die Außenwand gilt Beton C35/45, XM1, XA1.']);
    await waitFor(() =>
      expect(arten().getByRole('menuitemcheckbox', { name: /Beton\s*1/ })).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Vorschlag C35/45, XM1, XA1' }));
    const leiste = screen.getByRole('dialog', { name: 'Vorschlag verknüpfen' });
    expect(within(leiste).getByText('Betonsorte passt zu')).toBeInTheDocument();
    expect(within(leiste).getByText('C35/45 · XA1, XM1')).toBeInTheDocument();
    fireEvent.click(within(leiste).getByRole('button', { name: 'Verknüpfen' }));
    expect(screen.queryByRole('button', { name: 'Vorschlag C35/45, XM1, XA1' })).toBeNull();
  });

  it('„Nein“ blendet den Vorschlag aus, der Schalter blendet eine Art aus', async () => {
    await ladeAppMitPdf();
    const menge = await screen.findByRole('button', { name: 'Vorschlag 783,03 m³' });
    fireEvent.click(menge);
    const leiste = screen.getByRole('dialog', { name: 'Vorschlag verknüpfen' });
    expect(within(leiste).getByText('Menge passt zu')).toBeInTheDocument();
    expect(within(leiste).getByText('001.003.0040')).toBeInTheDocument();
    fireEvent.click(within(leiste).getByRole('button', { name: 'Nein' }));
    expect(screen.queryByRole('button', { name: 'Vorschlag 783,03 m³' })).toBeNull();

    const oz = arten().getByRole('menuitemcheckbox', { name: /OZ/ });
    fireEvent.click(oz);
    expect(oz).toHaveAttribute('aria-checked', 'false');
    expect(screen.queryByRole('button', { name: 'Vorschlag 1.2.20' })).toBeNull();
    fireEvent.click(oz);
    expect(await screen.findByRole('button', { name: 'Vorschlag 1.2.20' })).toBeInTheDocument();
  });

  it('beide Arten aus: die Schalter bleiben da und blenden wieder ein (0087)', async () => {
    await ladeAppMitPdf();
    await waitFor(() =>
      expect(arten().getByRole('menuitemcheckbox', { name: /Mengen\s*1/ })).toBeInTheDocument(),
    );
    fireEvent.click(arten().getByRole('menuitemcheckbox', { name: /OZ/ }));
    fireEvent.click(arten().getByRole('menuitemcheckbox', { name: /Mengen/ }));
    expect(screen.queryByRole('button', { name: 'Vorschlag 1.2.20' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Vorschlag 783,03 m³' })).toBeNull();
    const menge = arten().getByRole('menuitemcheckbox', { name: /Mengen/ });
    expect(menge).toHaveAttribute('aria-checked', 'false');
    fireEvent.click(menge);
    expect(await screen.findByRole('button', { name: 'Vorschlag 783,03 m³' })).toBeInTheDocument();
  });

  it('‹ › in der Kopfleiste blättert durch die Vorschläge, auch mit Pfeil (#191)', async () => {
    await ladeAppMitPdf();
    const schalter = screen.getByRole('group', { name: 'Durchgehen' });
    await waitFor(() => expect(within(schalter).getByText('– / 2')).toBeInTheDocument());
    fireEvent.click(within(schalter).getByRole('button', { name: 'Nächster Vorschlag' }));
    expect(within(schalter).getByText('1 / 2')).toBeInTheDocument();
    let leiste = screen.getByRole('dialog', { name: 'Vorschlag verknüpfen' });
    expect(within(leiste).getByText('1 / 2')).toBeInTheDocument();
    expect(within(leiste).getByText('001.002.0020')).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'ArrowRight' });
    leiste = screen.getByRole('dialog', { name: 'Vorschlag verknüpfen' });
    expect(within(leiste).getByText('2 / 2')).toBeInTheDocument();
    expect(within(leiste).getByText('001.003.0040')).toBeInTheDocument();
    fireEvent.click(within(leiste).getByRole('button', { name: 'Nächster Vorschlag' }));
    expect(within(leiste).getByText('1 / 2')).toBeInTheDocument();

    // „Nein“ geht von selbst zum nächsten; beim letzten schließt die Leiste.
    fireEvent.click(within(leiste).getByRole('button', { name: 'Nein' }));
    leiste = screen.getByRole('dialog', { name: 'Vorschlag verknüpfen' });
    expect(within(leiste).getByText('001.003.0040')).toBeInTheDocument();
    expect(within(leiste).queryByText('1 / 1')).toBeNull();
    fireEvent.click(within(leiste).getByRole('button', { name: 'Verknüpfen' }));
    expect(screen.queryByRole('dialog', { name: 'Vorschlag verknüpfen' })).toBeNull();
  });

  it('ein Blätterer: im Menü auf Verknüpfungen umschalten (Variante A, 11.11.)', async () => {
    await ladeAppMitPdf();
    fireEvent.click(await screen.findByRole('button', { name: 'Vorschlag 1.2.20' }));
    fireEvent.click(screen.getByRole('button', { name: 'Verknüpfen' }));
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.getByRole('button', { name: 'Vorschläge ▾' })).toBeInTheDocument();
    fireEvent.click(arten().getByRole('menuitemradio', { name: /Verknüpfungen/ }));
    expect(screen.getByRole('button', { name: 'Verknüpfungen ▾' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Nächste Verknüpfung' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Nächster Vorschlag' })).toBeNull();
  });
});
