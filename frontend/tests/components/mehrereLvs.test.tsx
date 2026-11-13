// Mehrere LVs in der App (Entscheidung 0110): zusammen laden, im Bereich „Dokument“
// ein- und ausblenden, dazunehmen, schließen. Nur öffentliche Beispiel-Fixtures.

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import App from '../../src/App';

vi.mock('../../src/components/docs/PdfPage', () => ({ PdfPage: () => null }));

const FIXTURE_DIR = resolve(process.cwd(), '../packages/core/tests/fixtures');

function fixture(name: string): File {
  return new File([readFileSync(resolve(FIXTURE_DIR, name))], name);
}

async function ladeApp(...dateien: File[]): Promise<void> {
  render(<App />);
  fireEvent.change(screen.getByLabelText('GAEB-Datei auswählen'), {
    target: { files: dateien },
  });
  await waitFor(() => expect(screen.getByRole('button', { name: '+ Filter' })).toBeInTheDocument());
  await screen.findByRole('main', { name: 'Bubble-Graph' }, { timeout: 5000 });
}

const hull = (id: string): Element | null => document.querySelector(`[data-hull="${id}"]`);

async function dokumentBereich(): Promise<HTMLElement> {
  fireEvent.click(screen.getByRole('button', { name: /^Ansicht/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Dokument' }));
  return screen.findByRole('region', { name: 'Dokument — Bereich' });
}

describe('Mehrere LVs', () => {
  it('lädt zwei GAEB-Dateien zusammen, mit einer Insel je LV im Graphen', async () => {
    await ladeApp(fixture('gaeb-xml-beispiel.x83'), fixture('sample.X83'));
    await waitFor(() => expect(hull('file:LV1')).not.toBeNull());
    expect(hull('file:LV2')).not.toBeNull();
  });

  it('blendet ein LV im Bereich „Dokument“ aus und wieder ein', async () => {
    await ladeApp(fixture('gaeb-xml-beispiel.x83'), fixture('sample.X83'));
    const bereich = await dokumentBereich();
    // Die LVs stehen als Dokumente unter der Kategorie „LV“ (Nico, 13.11.2026).
    const liste = within(bereich).getByRole('list', { name: 'Offene Dokumente' });
    const lv2 = within(liste).getByRole('button', { name: /^LV2(?! schließen)/ });
    expect(lv2).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(lv2);
    expect(lv2).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(lv2);
    expect(lv2).toHaveAttribute('aria-pressed', 'true');
  });

  it('nimmt über „Dokument hinzufügen…“ ein weiteres LV dazu und schließt es wieder', async () => {
    await ladeApp(fixture('gaeb-xml-beispiel.x83'));
    expect(hull('file:LV1')).toBeNull();
    fireEvent.change(screen.getByLabelText('Dokument auswählen'), {
      target: { files: [fixture('sample.X83')] },
    });
    await waitFor(() => expect(hull('file:LV2')).not.toBeNull(), { timeout: 5000 });

    const bereich = await dokumentBereich();
    fireEvent.click(within(bereich).getByRole('button', { name: 'LV2 schließen' }));
    await waitFor(() => expect(hull('file:LV2')).toBeNull(), { timeout: 5000 });
    // Mit einem LV gibt es keine Insel je LV und nichts mehr zu schließen.
    expect(hull('file:LV1')).toBeNull();
    expect(within(bereich).queryByRole('button', { name: /schließen$/ })).toBeNull();
  });

  it('meldet eine schon geladene Datei, statt sie doppelt zu zeigen', async () => {
    await ladeApp(fixture('gaeb-xml-beispiel.x83'));
    fireEvent.change(screen.getByLabelText('Dokument auswählen'), {
      target: { files: [fixture('gaeb-xml-beispiel.x83')] },
    });
    expect(
      await screen.findByText(/gaeb-xml-beispiel\.x83 ist schon geladen/, {}, { timeout: 5000 }),
    ).toBeInTheDocument();
    expect(hull('file:LV2')).toBeNull();
  });
});
