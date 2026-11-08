// Das mitgelieferte Demo-Projekt muss genauso durch die Pipeline laufen wie eine
// gewählte Datei. Der Test liest die ausgelieferten Dateien von der Platte und
// hängt sie an ein nachgebautes `fetch` — damit fällt auch auf, wenn jemand ein
// Asset austauscht und dabei Struktur oder Encoding kaputtgehen.

import { readFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEMO_PROJEKT, loadDemoLv, takeDemoFromUrl } from '../../src/lib/pipeline/loadDemoLv';
import { LVLoadError } from '../../src/lib/pipeline/loadLv';
import { EMPTY_PLAN_NOTES, vaOf } from '../../src/lib/docs/planNotes';
import { indexNodes } from '../../src/lib/tree/buildTree';

const DEMO = resolve(process.cwd(), 'src/assets/demo');

function bytesOf(path: string): ArrayBuffer {
  const buffer = readFileSync(path);
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
}

/** Datei zur Asset-Adresse: das LV liegt in `demo/`, Notizen und PDFs in `demo/projekt/`. */
function assetOf(url: string): ArrayBuffer {
  const name = decodeURIComponent(basename(url.split('?')[0]));
  return bytesOf(resolve(DEMO, name.endsWith('.x84') ? name : `projekt/${name}`));
}

/** Minimales `fetch`, das nur das liefert, was `loadDemoLv` davon braucht. */
function stubFetch(ok: (url: string) => boolean = () => true): void {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => ({
      ok: ok(url),
      status: ok(url) ? 200 : 404,
      arrayBuffer: async () => (ok(url) ? assetOf(url) : new ArrayBuffer(0)),
    })) as unknown as typeof fetch,
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('loadDemoLv · Demo-Projekt', () => {
  it('führt Preise und eine plausible Angebotssumme', async () => {
    stubFetch();

    const { lv } = await loadDemoLv();

    expect(lv.fileName).toBe('conocto-demo-angebot.x84');
    expect(lv.projectName).toBe(DEMO_PROJEKT.title);
    expect(lv.tree.positionCount).toBeGreaterThan(70);
    expect(lv.summary.unitPrice).not.toBeNull();
    // Keine Zertifizierungs-Extremwerte mehr: die Summe bleibt in der
    // Größenordnung eines realen Bauvorhabens (docs/decisions/0014).
    expect(lv.summary.totalPrice).toBeGreaterThan(500_000);
    expect(lv.summary.totalPrice).toBeLessThan(20_000_000);
    // Umlaute aus der Datei kommen unversehrt an.
    expect(JSON.stringify(lv.tree)).toContain('Baustelleneinrichtung für sämtliche');
    // Die Klassifizierung läuft mit: Bauteile sind als solche erkannt.
    expect(lv.summary.facets.get('positionsart')?.get('bauteil') ?? 0).toBeGreaterThan(0);
  });

  it('bringt drei PDFs und Notizen mit, verknüpft über die Knoten-IDs', async () => {
    stubFetch();

    const { lv, annotations, docs } = await loadDemoLv();

    expect(docs.map((doc) => doc.name)).toEqual(DEMO_PROJEKT.docs.map((doc) => doc.name));
    expect(annotations.documents.docs.size).toBe(3);
    const nodes = indexNodes(lv.tree);
    const linked = annotations.documents.marks.flatMap((mark) => mark.links);
    expect(linked.length).toBeGreaterThanOrEqual(6);
    for (const id of linked) expect(nodes.get(id)?.position).toBeTruthy();
    // Angestrichen ohne Verknüpfung und übernommene Vorschläge sind beide dabei.
    expect(annotations.documents.marks.some((mark) => mark.links.length === 0)).toBe(true);
    expect(
      annotations.documents.marks.some((mark) => Object.values(mark.sources ?? {}).includes('oz')),
    ).toBe(true);
  });

  it('hat im Grundriss einen Maßstab und eine Fläche als VA-Menge am Estrich', async () => {
    stubFetch();

    const { lv, annotations } = await loadDemoLv();

    const plans = annotations.plans ?? EMPTY_PLAN_NOTES;
    expect(plans.scales).toHaveLength(1);
    const estrich = [...indexNodes(lv.tree).values()].find(
      (node) => node.position?.oz === '003.002.0010',
    );
    expect(estrich).toBeDefined();
    if (estrich === undefined) return;
    const va = vaOf(plans, estrich.id);
    expect(va?.herkunft).toBe('Plan');
    expect(va?.value).toBeCloseTo(48, 6);
  });

  it('meldet eine verständliche Fehlermeldung, wenn das LV fehlt', async () => {
    stubFetch(() => false);

    await expect(loadDemoLv()).rejects.toBeInstanceOf(LVLoadError);
    await expect(loadDemoLv()).rejects.toThrow(/konnte nicht geladen werden/);
  });

  it('öffnet das LV auch ohne Dokumente, mit Hinweis', async () => {
    stubFetch((url) => url.includes('.x84'));
    const notices: string[] = [];

    const { lv, docs } = await loadDemoLv(DEMO_PROJEKT, { onNotice: (m) => notices.push(m) });

    expect(lv.tree.positionCount).toBeGreaterThan(70);
    expect(docs).toEqual([]);
    expect(notices.some((m) => m.includes('Dokumente zum Demo-Projekt fehlen'))).toBe(true);
  });
});

// „Demo starten" auf der Startseite verlinkt `doc/?demo=projekt` (Entscheidung 0092).
describe('takeDemoFromUrl', () => {
  afterEach(() => {
    window.history.replaceState(null, '', '/');
  });

  it('liest die Demo und nimmt den Parameter aus der Adresse', () => {
    window.history.replaceState(null, '', '/doc/?demo=projekt#v=table');
    expect(takeDemoFromUrl()).toBe(DEMO_PROJEKT);
    expect(window.location.pathname).toBe('/doc/');
    expect(window.location.search).toBe('');
    expect(window.location.hash).toBe('#v=table');
    // Ein zweiter Aufruf (StrictMode, Neuladen) öffnet nichts mehr.
    expect(takeDemoFromUrl()).toBeUndefined();
  });

  it('öffnet bei alten Links auf die früheren Demos das Demo-Projekt', () => {
    for (const id of ['muster', 'angebot']) {
      window.history.replaceState(null, '', `/doc/?demo=${id}`);
      expect(takeDemoFromUrl()).toBe(DEMO_PROJEKT);
    }
  });

  it('entfernt unbekannte Werte, ohne etwas zu öffnen', () => {
    window.history.replaceState(null, '', '/doc/?demo=gibtsnicht&x=1');
    expect(takeDemoFromUrl()).toBeUndefined();
    expect(window.location.search).toBe('?x=1');
  });

  it('ohne Parameter bleibt die Adresse unverändert', () => {
    window.history.replaceState(null, '', '/doc/?x=1');
    expect(takeDemoFromUrl()).toBeUndefined();
    expect(window.location.search).toBe('?x=1');
  });
});
