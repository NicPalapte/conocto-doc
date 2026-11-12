// Einstellungen (Entscheidungen 0053, 0109): Begriff im Langtext lernen, ohne Passwort,
// Liste mit Löschen. Gespeichert wird in der IndexedDB dieses Browsers.

import 'fake-indexeddb/auto';
import { readFileSync } from 'node:fs';
import { StrictMode } from 'react';
import { resolve } from 'node:path';
import { IDBFactory } from 'fake-indexeddb';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../../src/App';
import { readLearnedTerms, readOwnRules, saveLearnedTerms } from '../../src/lib/persist/lastLv';

const NAME = 'gaeb-xml-beispiel.x83';
const FIXTURE = readFileSync(resolve(process.cwd(), '../packages/core/tests/fixtures', NAME));
beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
});

afterEach(() => {
  vi.restoreAllMocks();
});

async function ladeDatei(): Promise<void> {
  render(<App />);
  fireEvent.change(screen.getByLabelText('GAEB-Datei auswählen'), {
    target: { files: [new File([FIXTURE], NAME)] },
  });
  await screen.findByRole('button', { name: '+ Filter' });
}

async function oeffneEinstellungen(): Promise<HTMLElement> {
  fireEvent.click(screen.getByRole('button', { name: 'Über diese App' }));
  fireEvent.click(screen.getByRole('button', { name: 'Einstellungen' }));
  return screen.findByRole('dialog', { name: 'Einstellungen' });
}

/** Merkt sich die Dateinamen, die `downloadText` dem Browser übergeben hätte. */
function fangeDownloads(): string[] {
  const namen: string[] = [];
  URL.createObjectURL = vi.fn(() => 'blob:test');
  URL.revokeObjectURL = vi.fn();
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
    this: HTMLAnchorElement,
  ) {
    namen.push(this.download);
  });
  return namen;
}

/** Wählt den ersten Punkt mit Langtext und gibt den Langtext-Block zurück. */
async function langtextBlock(): Promise<HTMLElement> {
  for (const punkt of document.querySelectorAll('[data-slot]')) {
    fireEvent.click(punkt);
    const block = screen.queryByRole('region', { name: 'Langtext' });
    if (block !== null) return block;
  }
  throw new Error('Keine Position mit Langtext in der Musterdatei');
}

/** Markiert das erste Wort aus Buchstaben im Langtext, wie mit der Maus. */
function markiereWort(block: HTMLElement): string {
  // Nur im Text selbst, nicht in den Schaltern darüber.
  const text = block.querySelector('.whitespace-pre-wrap') ?? block;
  const walker = document.createTreeWalker(text, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
    const match = /\p{L}{5,}/u.exec(node.textContent ?? '');
    if (match === null) continue;
    const range = document.createRange();
    range.setStart(node, match.index);
    range.setEnd(node, match.index + match[0].length);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    fireEvent.contextMenu(node.parentElement ?? block);
    return match[0];
  }
  throw new Error('Kein Wort im Langtext');
}

describe('Einstellungen', () => {
  it('bietet das Treffer-Protokoll erst mit geladenem LV', async () => {
    render(<App />);
    const dialog = await oeffneEinstellungen();
    expect(within(dialog).getByRole('navigation', { name: 'Regeln' })).toBeInTheDocument();
    expect(within(dialog).queryByRole('button', { name: 'Treffer-Protokoll (CSV)' })).toBeNull();
  });

  it('benennt Markierfarben', async () => {
    render(<App />);
    const dialog = await oeffneEinstellungen();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Markierfarben' }));
    const feld = within(dialog).getAllByRole('textbox')[0];
    fireEvent.change(feld, { target: { value: 'Nach fragen' } });
    // Der Entwurf behält das Leerzeichen, auch wenn der gespeicherte Name gekürzt wird.
    expect(feld).toHaveValue('Nach fragen');
  });

  it('lernt einen Begriff im Langtext als eigene Regel (0088), ohne Passwort', async () => {
    await ladeDatei();
    const block = await langtextBlock();
    // Der Graph darunter setzt `select-none`; der Langtext muss markierbar bleiben.
    expect(block.querySelector('.whitespace-pre-wrap')).toHaveClass('select-text');
    const wort = markiereWort(block);
    fireEvent.click(await screen.findByRole('button', { name: 'Begriff lernen…' }));
    const lernen = await screen.findByRole('dialog', { name: 'Begriff lernen' });
    fireEvent.click(within(lernen).getByRole('button', { name: 'Wichtig' }));

    await waitFor(() =>
      expect(document.querySelectorAll('[data-span-key="wichtig"]').length).toBeGreaterThan(0),
    );
    await waitFor(async () =>
      expect(await readOwnRules()).toMatchObject([
        { name: wort, wirkung: { hervorheben: 'wichtig' }, status: 'freigegeben' },
      ]),
    );
    expect(await readLearnedTerms()).toEqual([]);

    const dialog = await oeffneEinstellungen();
    const liste = within(dialog).getByRole('navigation', { name: 'Regeln' });
    fireEvent.click(within(liste).getByText(wort));
    // Das Treffer-Protokoll sitzt hier, nicht im Logo-Menü (Entscheidungen 0079, 0109).
    const geladen = fangeDownloads();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Treffer-Protokoll (CSV)' }));
    expect(geladen).toEqual([expect.stringMatching(/treffer.*\.csv$/)]);
    fireEvent.click(within(dialog).getByRole('button', { name: 'Löschen' }));
    await waitFor(async () => expect(await readOwnRules()).toEqual([]));
  });

  it('zieht Begriffe älterer Versionen einmal in eigene Regeln um', async () => {
    await saveLearnedTerms([
      { begriff: 'bauseits', kategorie: 'wichtig' },
      { begriff: 'Kies', kategorie: 'material' },
    ]);
    // StrictMode liest zweimal; der Umzug darf trotzdem nur einmal laufen.
    render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
    await waitFor(async () =>
      expect((await readOwnRules())?.map((rule) => [rule.name, rule.wirkung])).toEqual([
        ['bauseits', { hervorheben: 'wichtig' }],
        ['Kies', { hervorheben: 'material' }],
      ]),
    );
    expect(await readLearnedTerms()).toEqual([]);
    // Nach dem Umzug bleibt der Stand, auch wenn ein späterer Lauf schreibt.
    await new Promise((done) => setTimeout(done, 50));
    expect((await readOwnRules())?.map((rule) => rule.name)).toEqual(['bauseits', 'Kies']);
  });
});
