// Warteschlange beim Zeichnen der PDF-Seiten (Issue #191, Vollbild): höchstens zwei
// Bilder gleichzeitig, die sichtbare Seite zuerst, Abgesagtes startet nie.
import { describe, expect, it } from 'vitest';
import type { PDFPageProxy } from 'pdfjs-dist';
import { drawRegion } from '../../src/components/docs/pageCanvas';

interface Render {
  readonly name: string;
  readonly done: () => void;
}

function fakePage(name: string, log: Render[]): PDFPageProxy {
  const page = {
    getViewport: () => ({ width: 10, height: 10 }),
    render: () => {
      let done = (): void => undefined;
      const promise = new Promise<void>((resolve) => {
        done = resolve;
      });
      log.push({ name, done });
      return { promise, cancel: () => undefined };
    },
  };
  return page as unknown as PDFPageProxy;
}

const REGION = { x: 0, y: 0, width: 10, height: 10 };
const flush = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

describe('drawRegion · Warteschlange', () => {
  it('zeichnet höchstens zwei Seiten gleichzeitig, die nächste zuerst', async () => {
    const log: Render[] = [];
    const a = drawRegion(fakePage('a', log), 1, 1, REGION, () => 0);
    const b = drawRegion(fakePage('b', log), 1, 1, REGION, () => 0);
    const fern = drawRegion(fakePage('fern', log), 1, 1, REGION, () => 900);
    const sichtbar = drawRegion(fakePage('sichtbar', log), 1, 1, REGION, () => 0);
    expect(log.map((entry) => entry.name)).toEqual(['a', 'b']);

    log[0].done();
    await a.promise;
    await flush();
    expect(log.map((entry) => entry.name)).toEqual(['a', 'b', 'sichtbar']);

    log[1].done();
    log[2].done();
    await Promise.all([b.promise, sichtbar.promise]);
    await flush();
    expect(log.map((entry) => entry.name)).toEqual(['a', 'b', 'sichtbar', 'fern']);
    log[3].done();
    await fern.promise;
  });

  it('startet eine abgesagte Seite nie und meldet die Absage', async () => {
    const log: Render[] = [];
    const a = drawRegion(fakePage('a', log), 1, 1, REGION);
    const b = drawRegion(fakePage('b', log), 1, 1, REGION);
    const weg = drawRegion(fakePage('weg', log), 1, 1, REGION);
    weg.cancel();
    await expect(weg.promise).rejects.toThrow('abgebrochen');

    log[0].done();
    log[1].done();
    await Promise.all([a.promise, b.promise]);
    await flush();
    expect(log.map((entry) => entry.name)).toEqual(['a', 'b']);
  });
});
