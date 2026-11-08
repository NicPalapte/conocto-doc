// „Demo starten" auf der Startseite verlinkt `doc/?demo=projekt` (Entscheidung 0092, 0100):
// Der Viewer öffnet das Demo-Projekt direkt und nimmt den Parameter aus der Adresse.

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from '../../src/App';

function demoBytes(fileName: string): ArrayBuffer {
  const buffer = readFileSync(resolve(process.cwd(), 'src/assets/demo', fileName));
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
}

afterEach(() => {
  vi.unstubAllGlobals();
  window.history.replaceState(null, '', '/');
});

describe('Demo aus der Adresse', { timeout: 30_000 }, () => {
  it('?demo=projekt öffnet das Demo-Projekt', async () => {
    // Nur das LV: Notizen und PDFs fehlen hier, die Demo öffnet trotzdem (mit Hinweis).
    const bytes = demoBytes('conocto-demo-angebot.x84');
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => ({
        ok: url.includes('.x84'),
        status: url.includes('.x84') ? 200 : 404,
        arrayBuffer: async () => bytes,
      })),
    );
    window.history.replaceState(null, '', '/doc/?demo=projekt');
    render(<App />);
    await screen.findByRole('main', { name: 'Bubble-Graph' }, { timeout: 10_000 });
    expect(screen.getAllByText('Conocto Demo-LV 3.3 · Angebot mit Preisen').length).toBeGreaterThan(
      0,
    );
    expect(window.location.search).toBe('');
  });
});
