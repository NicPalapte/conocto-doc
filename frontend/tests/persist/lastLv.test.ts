// Speicher für die zuletzt geöffnete Datei (Entscheidung 0046).

import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { addComment, commentsOf, EMPTY_ANNOTATIONS, setImportant } from '../../src/lib/annotations';
import {
  clearLastLv,
  newPersistId,
  readLastLv,
  readLastLvMeta,
  readWorkspace,
  saveAnnotations,
  saveLastLv,
  saveLastLvFiles,
  storedSources,
  saveWorkspace,
  touchLastLv,
} from '../../src/lib/persist/lastLv';
import { INITIAL_WORKSPACE } from '../../src/state/viewState';
import { edgePane, toStoredWorkspace } from '../../src/lib/workspace/split';

const meta = {
  fileName: 'rohbau.x83',
  positionCount: 12,
  savedAt: 1_760_000_000_000,
  id: 'projekt-1',
  files: [{ key: 'LV1', fileName: 'rohbau.x83', positionCount: 12 }],
};
/** Angaben für die Startseite: ohne Notizen zählen beide Zähler 0. */
const info = { ...meta, marked: 0, comments: 0, painted: 0, docMarks: 0 };

function bytesOf(text: string): ArrayBuffer {
  return new TextEncoder().encode(text).buffer as ArrayBuffer;
}

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
});

describe('letzte Datei', () => {
  it('ist anfangs leer', async () => {
    expect(await readLastLvMeta()).toBeNull();
    expect(await readLastLv()).toBeNull();
  });

  it('speichert Angaben und Bytes und liest sie zurück', async () => {
    expect(await saveLastLv(meta, bytesOf('<GAEB/>'))).toBe(true);
    expect(await readLastLvMeta()).toEqual(info);
    const last = await readLastLv();
    expect(last?.meta).toEqual(meta);
    expect(new TextDecoder().decode(last?.bytes)).toBe('<GAEB/>');
  });

  it('ersetzt beim zweiten Speichern das erste Projekt', async () => {
    await saveLastLv(meta, bytesOf('alt'));
    await saveLastLv({ ...meta, fileName: 'neu.x84' }, bytesOf('neu'));
    const last = await readLastLv();
    expect(last?.meta.fileName).toBe('neu.x84');
    expect(new TextDecoder().decode(last?.bytes)).toBe('neu');
  });

  it('löscht alles', async () => {
    await saveLastLv(meta, bytesOf('x'));
    await clearLastLv();
    expect(await readLastLvMeta()).toBeNull();
    expect(await readLastLv()).toBeNull();
  });

  it('läuft ohne IndexedDB still weiter', async () => {
    // @ts-expect-error -- privates Fenster / gesperrte Website-Daten nachstellen
    delete globalThis.indexedDB;
    expect(await saveLastLv(meta, bytesOf('x'))).toBe(false);
    expect(await readLastLvMeta()).toBeNull();
    await expect(clearLastLv()).resolves.toBe(true);
  });
});

describe('letzte Datei — Randfälle', () => {
  it('aktualisiert beim Antippen nur den Zeitpunkt', async () => {
    await saveLastLv(meta, bytesOf('inhalt'));
    await touchLastLv(meta.savedAt + 1000);
    const last = await readLastLv();
    expect(last?.meta).toEqual({ ...meta, savedAt: meta.savedAt + 1000 });
    expect(new TextDecoder().decode(last?.bytes)).toBe('inhalt');
  });

  it('legt beim Antippen ohne gespeichertes Projekt nichts an', async () => {
    await touchLastLv(1);
    expect(await readLastLvMeta()).toBeNull();
  });

  it('meldet false, wenn das Speichern scheitert', async () => {
    // Eine Funktion lässt sich nicht klonen: `put` wirft DataCloneError.
    const kaputt = { ...meta, extra: () => undefined } as unknown as typeof meta;
    expect(await saveLastLv(kaputt, bytesOf('x'))).toBe(false);
    expect(await readLastLvMeta()).toBeNull();
  });

  it('liefert null, wenn zu den Angaben die Bytes fehlen', async () => {
    await saveLastLv(meta, bytesOf('x'));
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('conocto');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    await new Promise<void>((resolve) => {
      const tx = db.transaction('letztesLv', 'readwrite');
      tx.objectStore('letztesLv').delete('bytes');
      tx.oncomplete = () => resolve();
    });
    db.close();
    expect(await readLastLvMeta()).toEqual(info);
    expect(await readLastLv()).toBeNull();
  });

  it('meldet false, wenn das Löschen scheitert', async () => {
    await saveLastLv(meta, bytesOf('x'));
    const echt = globalThis.indexedDB;
    globalThis.indexedDB = {
      open: () => {
        throw new Error('gesperrt');
      },
    } as unknown as IDBFactory;
    expect(await clearLastLv()).toBe(false);
    globalThis.indexedDB = echt;
    expect(await readLastLvMeta()).toEqual(info);
  });
});

describe('letzte Datei — Markierungen und Kommentare', () => {
  const notizen = addComment(
    setImportant(EMPTY_ANNOTATIONS, 'p:1', true, 1),
    'p:2',
    'Boden prüfen',
    2,
  );

  it('speichert Notizen zur Datei und zählt sie für die Startseite', async () => {
    const id = newPersistId();
    await saveLastLv({ ...meta, id }, bytesOf('x'));
    expect(await saveAnnotations(id, notizen)).toBe(true);

    expect(await readLastLvMeta()).toEqual({
      ...meta,
      id,
      marked: 1,
      comments: 1,
      painted: 0,
      docMarks: 0,
    });
    const last = await readLastLv();
    expect([...(last?.annotations.important ?? [])]).toEqual(['p:1']);
    expect(commentsOf(last?.annotations ?? EMPTY_ANNOTATIONS, 'p:2')).toEqual(['Boden prüfen']);
  });

  it('schreibt nichts, wenn inzwischen eine andere Datei gespeichert ist', async () => {
    const alt = newPersistId();
    await saveLastLv({ ...meta, id: alt }, bytesOf('x'));
    await saveLastLv({ ...meta, fileName: 'neu.x83', id: newPersistId() }, bytesOf('y'));

    expect(await saveAnnotations(alt, notizen)).toBe(false);
    expect((await readLastLv())?.annotations).toEqual(EMPTY_ANNOTATIONS);
  });

  it('beginnt mit einer neuen Datei ohne Notizen', async () => {
    const id = newPersistId();
    await saveLastLv({ ...meta, id }, bytesOf('x'));
    await saveAnnotations(id, notizen);
    await saveLastLv({ ...meta, id: newPersistId() }, bytesOf('y'));

    expect(await readLastLvMeta()).toMatchObject({ marked: 0, comments: 0 });
  });

  it('übergeht Einträge von vor 0.66 ohne Kennung und LV-Liste', async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('conocto', 1);
      request.onupgradeneeded = () => request.result.createObjectStore('letztesLv');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const tx = db.transaction('letztesLv', 'readwrite');
    const alt = {
      fileName: meta.fileName,
      positionCount: meta.positionCount,
      savedAt: meta.savedAt,
    };
    tx.objectStore('letztesLv').put(alt, 'meta');
    tx.objectStore('letztesLv').put(bytesOf('x'), 'bytes');
    await new Promise((resolve) => (tx.oncomplete = resolve));
    db.close();
    expect(await readLastLvMeta()).toBeNull();
    expect(await readLastLv()).toBeNull();
  });

  it('behält die Kennung beim Antippen', async () => {
    const id = newPersistId();
    await saveLastLv({ ...meta, id }, bytesOf('x'));
    await touchLastLv(meta.savedAt + 1);
    expect(await saveAnnotations(id, notizen)).toBe(true);
  });
});

describe('Anordnung im Splitscreen (Entscheidung 0073)', () => {
  it('liest die gespeicherte Anordnung zurück und übersteht „Letzte Datei löschen"', async () => {
    expect(await readWorkspace()).toBeUndefined();
    const moved = { ...INITIAL_WORKSPACE, ...edgePane(INITIAL_WORKSPACE, 'table', 'bottom') };
    expect(await saveWorkspace(moved)).toBe(true);
    await clearLastLv();
    const back = toStoredWorkspace(await readWorkspace(), INITIAL_WORKSPACE.closed);
    expect(back?.root).toEqual(moved.root);
    expect(back?.closed).toEqual(moved.closed);
  });
});

describe('alter Speicher vor Entscheidung 0091', () => {
  it('löscht die Datenbank „bubble“ beim ersten Zugriff', async () => {
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open('bubble');
      request.onsuccess = () => {
        request.result.close();
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
    vi.resetModules();
    const frisch = await import('../../src/lib/persist/lastLv');
    await frisch.readLastLvMeta();
    await new Promise((resolve) => setTimeout(resolve, 0));
    const namen = (await indexedDB.databases()).map((db) => db.name);
    expect(namen).not.toContain('bubble');
    expect(namen).toContain('conocto');
  });
});

describe('mehrere LVs in einem Projekt (Entscheidung 0110)', () => {
  const files = [
    { key: 'LV1', fileName: 'rohbau.x83', positionCount: 12 },
    { key: 'LV2', fileName: 'ausbau.x83', positionCount: 5 },
  ];
  const more = [{ key: 'LV2', fileName: 'ausbau.x83', bytes: bytesOf('<ausbau/>') }];

  it('merkt alle LVs und gibt sie in Ladereihenfolge zurück', async () => {
    const id = newPersistId();
    expect(await saveLastLv({ ...meta, id, files }, bytesOf('<rohbau/>'), more)).toBe(true);
    const last = await readLastLv();
    expect(last?.meta.files).toEqual(files);
    expect(last === null ? [] : storedSources(last).map((source) => source.key)).toEqual([
      'LV1',
      'LV2',
    ]);
    expect(new TextDecoder().decode(last?.more[0]?.bytes)).toBe('<ausbau/>');
  });

  it('nimmt ein LV dazu, ohne die Notizen zu verlieren', async () => {
    const id = newPersistId();
    await saveLastLv({ ...meta, id }, bytesOf('<rohbau/>'));
    await saveAnnotations(id, addComment(EMPTY_ANNOTATIONS, 'abc123', 'Notiz', 1));
    expect(await saveLastLvFiles({ ...meta, id, files }, bytesOf('<rohbau/>'), more)).toBe(true);
    const last = await readLastLv();
    expect(last?.more).toHaveLength(1);
    expect(commentsOf(last?.annotations ?? EMPTY_ANNOTATIONS, 'abc123')).toEqual(['Notiz']);
  });

  it('schreibt nicht über ein anderes Projekt', async () => {
    await saveLastLv({ ...meta, id: 'anderes' }, bytesOf('<anderes/>'));
    expect(await saveLastLvFiles({ ...meta, id: 'meins', files }, bytesOf('<x/>'), more)).toBe(
      false,
    );
    expect((await readLastLv())?.more).toEqual([]);
  });

  it('löscht beim Löschen auch die weiteren LVs', async () => {
    await saveLastLv({ ...meta, files }, bytesOf('<rohbau/>'), more);
    await clearLastLv();
    await saveLastLv(meta, bytesOf('<neu/>'));
    expect((await readLastLv())?.more).toEqual([]);
  });
});
