// Umzug auf doc.conocto.app (Entscheidung neu-doc-eigene-adresse).

import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  deleteAllStored,
  importAllStored,
  readAllStored,
  readLastLv,
  readOwnRules,
  readPaintNames,
  saveAnnotations,
  saveLastLv,
  savePaintNames,
  saveTourSeen,
} from '../../src/lib/persist/lastLv';
import { moveTarget, receiveMove } from '../../src/lib/persist/umzug';
import { addComment, commentsOf, EMPTY_ANNOTATIONS, PAINTS } from '../../src/lib/annotations';

const meta = {
  fileName: 'rohbau.x83',
  positionCount: 12,
  savedAt: 1_760_000_000_000,
  id: 'projekt-1',
  files: [{ key: 'LV1', fileName: 'rohbau.x83', positionCount: 12 }],
};

function bytesOf(text: string): ArrayBuffer {
  return new TextEncoder().encode(text).buffer as ArrayBuffer;
}

/** Liest alles unter der „alten Adresse“ und gibt eine frische, leere „neue Adresse“ zurück. */
async function moveToFreshBrowser(): Promise<Awaited<ReturnType<typeof readAllStored>>> {
  const entries = await readAllStored();
  globalThis.indexedDB = new IDBFactory();
  return entries;
}

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
});

describe('moveTarget', () => {
  const at = (origin: string, search = '', hash = '') => ({ origin, search, hash });

  it('leitet von der alten Adresse auf die Wurzel der neuen, Fragment und Suche bleiben', () => {
    expect(moveTarget(at('https://conocto.app', '', '#lv=LV1~pos=abc'), false)).toBe(
      'https://doc.conocto.app/#lv=LV1~pos=abc',
    );
    expect(moveTarget(at('https://www.conocto.app', '?demo=projekt'), false)).toBe(
      'https://doc.conocto.app/?demo=projekt',
    );
  });

  it('bleibt auf anderen Adressen, außer der Build soll nur weiterleiten', () => {
    expect(moveTarget(at('https://doc.conocto.app'), false)).toBeNull();
    expect(moveTarget(at('https://dev.conocto.app'), false)).toBeNull();
    expect(moveTarget(at('http://localhost:5173'), false)).toBeNull();
    expect(moveTarget(at('https://conocto-start.pages.dev'), true)).toBe(
      'https://doc.conocto.app/',
    );
  });
});

describe('Daten umziehen', () => {
  it('ohne gespeicherte Daten gibt es nichts zu übergeben', async () => {
    expect(await readAllStored()).toEqual([]);
  });

  it('übernimmt Projekt, Notizen und Einstellungen in einen leeren Speicher', async () => {
    await saveLastLv(meta, bytesOf('<GAEB/>'));
    await saveAnnotations(meta.id, addComment(EMPTY_ANNOTATIONS, 'abc123', 'Notiz', 1));
    await savePaintNames({ [PAINTS[0]]: 'Klären' });
    const entries = await moveToFreshBrowser();
    expect(entries).not.toBeNull();

    expect(await importAllStored(entries!)).toBe('uebernommen');
    const last = await readLastLv();
    expect(last?.meta.id).toBe('projekt-1');
    expect(new TextDecoder().decode(last!.bytes)).toBe('<GAEB/>');
    expect(commentsOf(last?.annotations ?? EMPTY_ANNOTATIONS, 'abc123')).toEqual(['Notiz']);
    expect((await readPaintNames())?.[PAINTS[0]]).toBe('Klären');
  });

  it('überschreibt ein vorhandenes Projekt und vorhandene Einstellungen nicht', async () => {
    await saveLastLv(meta, bytesOf('alt'));
    await saveTourSeen();
    const entries = await moveToFreshBrowser();

    await saveLastLv({ ...meta, id: 'projekt-neu' }, bytesOf('neu'));
    expect(await importAllStored(entries!)).toBe('teilweise');
    const last = await readLastLv();
    expect(last?.meta.id).toBe('projekt-neu');
    expect(new TextDecoder().decode(last!.bytes)).toBe('neu');
  });

  it('nimmt nur bekannte Schlüssel an', async () => {
    const result = await importAllStored([
      { key: 'fremd', value: 'x' },
      { key: 'regeln', value: [] },
    ]);
    expect(result).toBe('uebernommen');
    expect(await readOwnRules()).toEqual([]);
    const entries = await readAllStored();
    expect(entries?.map((entry) => entry.key)).toEqual(['regeln']);
  });

  it('löscht nach dem Umzug alles unter der alten Adresse', async () => {
    await saveLastLv(meta, bytesOf('<GAEB/>'));
    expect(await deleteAllStored()).toBe(true);
    expect(await readAllStored()).toEqual([]);
  });
});

describe('receiveMove', () => {
  function send(origin: string, data: unknown) {
    const source = { postMessage: vi.fn() };
    window.dispatchEvent(
      new MessageEvent('message', { origin, data, source: source as unknown as Window }),
    );
    return source;
  }

  it('nimmt nur Nachrichten der alten Adresse an und meldet das Ergebnis', async () => {
    receiveMove();
    const fremd = send('https://boese.example', {
      art: 'conocto-umzug',
      eintraege: [{ key: 'regeln', value: [] }],
    });
    const alt = send('https://conocto.app', {
      art: 'conocto-umzug',
      eintraege: [{ key: 'tour', value: true }],
    });
    await vi.waitFor(() => expect(alt.postMessage).toHaveBeenCalled());
    expect(alt.postMessage).toHaveBeenCalledWith(
      { art: 'conocto-umzug', ergebnis: 'uebernommen' },
      { targetOrigin: 'https://conocto.app' },
    );
    expect(fremd.postMessage).not.toHaveBeenCalled();
    expect((await readAllStored())?.map((entry) => entry.key)).toEqual(['tour']);
  });
});
