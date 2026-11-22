// Merker der Tour je Teil (Entscheidung neu-tour-in-kapiteln). `true` (ohne Teile)
// und muss weiter lesbar bleiben (0117).

import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { beforeEach, describe, expect, it } from 'vitest';
import { readTourSeen, saveTourSeen, toTourSeen } from '../../src/lib/persist/lastLv';

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
});

describe('toTourSeen', () => {
  it('liest die alte Form „true“ als gesehenes LV-Kapitel', () => {
    expect(toTourSeen(true)).toEqual({ lv: true, unterlagen: false });
  });

  it('liest beide Teile und verwirft Unbekanntes', () => {
    expect(toTourSeen({ lv: true, unterlagen: true })).toEqual({ lv: true, unterlagen: true });
    expect(toTourSeen({ unterlagen: 'ja' })).toEqual({ lv: false, unterlagen: false });
    expect(toTourSeen(undefined)).toEqual({ lv: false, unterlagen: false });
  });
});

describe('saveTourSeen', () => {
  it('merkt die Teile einzeln und behält den anderen', async () => {
    expect(await readTourSeen()).toEqual({ lv: false, unterlagen: false });
    await saveTourSeen('unterlagen');
    expect(await readTourSeen()).toEqual({ lv: false, unterlagen: true });
    await saveTourSeen('lv');
    expect(await readTourSeen()).toEqual({ lv: true, unterlagen: true });
  });
});
