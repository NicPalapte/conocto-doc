// Demo-Projekt (Entscheidung 0100): Passen Notiz-Datei, PDFs und LV zusammen? Liest die
// PDFs mit PDF.js wie die App und rechnet die Vorschläge wie der Bereich „Dokument“.
// Fällt auf, wenn jemand LV, PDFs oder Notizen ändert, ohne `npm run demo-projekt`.

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { getGaebParser, mapToLvDraft, ratiosInText, unitFromRatio } from '@core';
import { EMPTY_ANNOTATIONS } from '../../src/lib/annotations';
import { pendingSuggestions, locateOnPage } from '../../src/lib/docs/docNotes';
import { suggestIndexOf, suggestionsInPage } from '../../src/lib/docs/docSuggest';
import { matchNotes, mergeNotes, parseNotesFile } from '../../src/lib/notesFile';
import { buildTree, indexNodes } from '../../src/lib/tree/buildTree';
import type { LVNode } from '../../src/types/lvNode';

const DEMO = resolve(process.cwd(), 'src/assets/demo');
const FILES: Readonly<Record<string, string>> = {
  'Baubeschreibung Verwaltungsgebäude.pdf': 'baubeschreibung.pdf',
  'Vorbemerkungen LV.pdf': 'vorbemerkungen.pdf',
  'Grundriss EG.pdf': 'grundriss-eg.pdf',
};

type PdfJs = typeof import('pdfjs-dist');

async function pageTexts(bytes: Uint8Array): Promise<string[]> {
  const lib = (await import('pdfjs-dist/legacy/build/pdf.mjs')) as unknown as PdfJs;
  const task = lib.getDocument({
    data: bytes,
    standardFontDataUrl: `${resolve(process.cwd(), 'node_modules/pdfjs-dist/standard_fonts')}/`,
  });
  const pdf = await task.promise;
  const out: string[] = [];
  for (let page = 1; page <= pdf.numPages; page += 1) {
    const content = await (await pdf.getPage(page)).getTextContent();
    out.push(content.items.map((item) => ('str' in item ? item.str : '')).join(''));
  }
  await task.destroy();
  return out;
}

let nodes: LVNode[] = [];
const notes = parseNotesFile(
  readFileSync(resolve(DEMO, 'projekt/conocto-demo-notizen.json'), 'utf8'),
);
/** Seitentexte je Dokument-Kennung. */
const texts = new Map<string, string[]>();

beforeAll(async () => {
  const bytes = new Uint8Array(readFileSync(resolve(DEMO, 'conocto-demo-angebot.x84')));
  const draft = mapToLvDraft(getGaebParser().parse(bytes, 'conocto-demo-angebot.x84'));
  nodes = [...indexNodes(buildTree(draft)).values()];
  for (const [id, info] of notes.dokumente.docs) {
    const pdf = new Uint8Array(readFileSync(resolve(DEMO, 'projekt', FILES[info.name] ?? '')));
    expect(createHash('sha256').update(pdf).digest('hex').slice(0, 12)).toBe(id);
    texts.set(id, await pageTexts(pdf));
  }
}, 30_000);

describe('Demo-Projekt', () => {
  it('jede Notiz findet ihre Position über den Positions-Hash', () => {
    const matching = matchNotes(notes, nodes);
    expect(matching.missing).toEqual([]);
    expect(matching.moved.length + matching.changed.length).toBe(0);
    expect(matching.same.length).toBe(notes.positionen.length);
  });

  it('jede Stelle steht genau so im Seitentext der PDFs', () => {
    const { same } = matchNotes(notes, nodes);
    const merged = mergeNotes(EMPTY_ANNOTATIONS, same, notes.dokumente, notes.plaene);
    expect(merged.documents.marks.length).toBeGreaterThanOrEqual(8);
    for (const mark of merged.documents.marks) {
      const page = texts.get(mark.doc)?.[mark.page - 1] ?? '';
      expect(locateOnPage(page, mark)).toBe(mark.start);
    }
  });

  it('Grundriss: Maßstab steht im Plankopf, Messung auf dem Plan', () => {
    const [scale] = notes.plaene.scales;
    expect(scale?.unit).toBeCloseTo(unitFromRatio(100), 12);
    const plan = texts.get(scale?.doc ?? '')?.[0] ?? '';
    expect(ratiosInText(plan)).toEqual([100]);
    expect(notes.plaene.measures.every((measure) => measure.doc === scale?.doc)).toBe(true);
  });

  it('lässt OZ- und Mengen-Vorschläge offen, übernommene nicht doppelt', () => {
    const { same } = matchNotes(notes, nodes);
    const merged = mergeNotes(EMPTY_ANNOTATIONS, same, notes.dokumente, notes.plaene);
    const index = suggestIndexOf(
      nodes.flatMap((node) =>
        node.position === null
          ? []
          : [
              {
                id: node.id,
                oz: node.position.oz,
                quantity: node.position.quantity,
                unit: node.position.unit,
                shortText: node.position.shortText,
              },
            ],
      ),
    );
    const all = { oz: true, menge: true, beton: true };
    const offen = [...texts].flatMap(([doc, pages]) =>
      pendingSuggestions(
        merged.documents,
        doc,
        pages.flatMap((text, i) => suggestionsInPage(text, index, i + 1)),
        all,
      ),
    );
    expect(offen.filter((item) => item.source === 'oz').length).toBeGreaterThanOrEqual(3);
    expect(offen.filter((item) => item.source === 'menge').length).toBeGreaterThanOrEqual(3);
    const accepted = merged.documents.marks.filter((mark) => mark.sources !== undefined);
    for (const mark of accepted) {
      for (const id of Object.keys(mark.sources ?? {})) {
        expect(offen.some((item) => item.id === id && item.text === mark.text)).toBe(false);
      }
    }
  });
});
