// Demo-Projekt erzeugen: drei erfundene Begleit-PDFs und eine Notiz-Datei zum Demo-LV mit
// Preisen. Aufruf: npm run demo-projekt
//
// Ergebnis liegt unter src/assets/demo/projekt/ und wird mit eingecheckt; die App lädt es
// beim Klick auf „Demo-Projekt öffnen" (lib/pipeline/loadDemoLv.ts). Alle Texte und Pläne
// sind erfunden (Datenschutz: keine echten Ausschreibungen).
//
// Die Notiz-Datei braucht Positions-Hashes (Kern) und die Lage jeder Stelle im Seitentext,
// genau wie PDF.js ihn in der App liefert. Deshalb schreibt das Skript die PDFs selbst
// (feste Bytes ⇒ feste Kennung) und liest sie danach mit PDF.js wieder.

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';
import { runnerImport } from 'vite';

type Core = typeof import('../../packages/core/src/index.ts');

const HERE = new URL('.', import.meta.url);
const LV_FILE = fileURLToPath(new URL('../src/assets/demo/conocto-demo-angebot.x84', HERE));
const OUT = fileURLToPath(new URL('../src/assets/demo/projekt/', HERE));
const NOTES_FILE = 'conocto-demo-notizen.json';
const FONTS = fileURLToPath(new URL('../node_modules/pdfjs-dist/standard_fonts/', HERE));
/** Fester Zeitpunkt, damit ein neuer Lauf dieselbe Datei schreibt. */
const ZEIT = '2026-11-08T09:00:00.000Z';
const AT = Date.parse(ZEIT);

// --- Ein kleines PDF schreiben -----------------------------------------------------------

interface TextRun {
  readonly x: number;
  readonly y: number;
  readonly size: number;
  readonly bold?: boolean;
  readonly text: string;
}

interface PageSpec {
  readonly width: number;
  readonly height: number;
  readonly texts: readonly TextRun[];
  /** Zeichenbefehle in PDF-Syntax (Linien, Rechtecke). */
  readonly draw: string;
}

// WinAnsi (Windows-1252): deckt Umlaute, ß, ², ³ und die deutschen Anführungszeichen ab.
const WIN_ANSI_EXTRA: Readonly<Record<string, number>> = {
  '€': 0x80,
  '„': 0x84,
  '’': 0x92,
  '“': 0x93,
  '”': 0x94,
  '–': 0x96,
  '—': 0x97,
};

function winAnsi(text: string): number[] {
  return [...text].map((char) => {
    const extra = WIN_ANSI_EXTRA[char];
    if (extra !== undefined) return extra;
    const code = char.codePointAt(0) ?? 63;
    if (code < 256 && (code < 0x80 || code > 0x9f)) return code;
    throw new Error(`Zeichen nicht in WinAnsi: ${char}`);
  });
}

function pdfString(text: string): number[] {
  const out: number[] = [0x28];
  for (const byte of winAnsi(text)) {
    if (byte === 0x28 || byte === 0x29 || byte === 0x5c) out.push(0x5c);
    out.push(byte);
  }
  out.push(0x29);
  return out;
}

const ascii = (text: string): number[] => [...text].map((char) => char.charCodeAt(0));
const num = (value: number): string => String(Math.round(value * 100) / 100);

function contentOf(page: PageSpec): number[] {
  const bytes = ascii(page.draw);
  for (const run of page.texts) {
    bytes.push(
      ...ascii(`BT /${run.bold === true ? 'F2' : 'F1'} ${num(run.size)} Tf `),
      ...ascii(`1 0 0 1 ${num(run.x)} ${num(run.y)} Tm `),
      ...pdfString(run.text),
      ...ascii(' Tj ET\n'),
    );
  }
  return bytes;
}

function pdfBytes(title: string, pages: readonly PageSpec[]): Uint8Array {
  const objects: number[][] = [];
  const pageIds = pages.map((_, i) => 6 + i * 2);
  objects.push(ascii('<< /Type /Catalog /Pages 2 0 R >>'));
  objects.push(ascii(`<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] `));
  objects[1].push(...ascii(`/Count ${pages.length} >>`));
  const font = (name: string): number[] =>
    ascii(`<< /Type /Font /Subtype /Type1 /BaseFont /${name} /Encoding /WinAnsiEncoding >>`);
  objects.push(font('Helvetica'), font('Helvetica-Bold'));
  objects.push([
    ...ascii('<< /Title '),
    ...pdfString(title),
    ...ascii(' /Producer (Conocto Demo) >>'),
  ]);
  pages.forEach((page, i) => {
    const content = contentOf(page);
    objects.push(
      ascii(
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${num(page.width)} ${num(page.height)}] ` +
          `/Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${pageIds[i] + 1} 0 R >>`,
      ),
    );
    objects.push([
      ...ascii(`<< /Length ${content.length} >>\nstream\n`),
      ...content,
      ...ascii('\nendstream'),
    ]);
  });
  const out: number[] = ascii('%PDF-1.4\n');
  out.push(0x25, 0xe2, 0xe3, 0xcf, 0xd3, 0x0a);
  const offsets: number[] = [];
  objects.forEach((body, i) => {
    offsets.push(out.length);
    out.push(...ascii(`${i + 1} 0 obj\n`), ...body, ...ascii('\nendobj\n'));
  });
  const xref = out.length;
  out.push(...ascii(`xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`));
  for (const offset of offsets)
    out.push(...ascii(`${String(offset).padStart(10, '0')} 00000 n \n`));
  out.push(
    ...ascii(`trailer\n<< /Size ${objects.length + 1} /Root 1 0 R /Info 5 0 R >>\n`),
    ...ascii(`startxref\n${xref}\n%%EOF\n`),
  );
  return new Uint8Array(out);
}

// --- Textseiten (A4) ----------------------------------------------------------------------

const A4 = { width: 595.28, height: 841.89 };
const MARGIN = 64;

/** Längste Zeile; grob, Helvetica 10 pt ist im Mittel knapp 5 pt breit je Zeichen. */
const MAX_LINE = 96;

// PDF.js hängt Zeilen ohne Leerzeichen aneinander (wie bei echten PDFs). Damit Sätze im
// Seitentext trotzdem sauber enden, steht jeder Satz ganz in einer Zeile; ein Satz mit
// Menge hat Nachbarsätze in derselben Zeile, sonst fände die App seinen Anfang nicht.
type Block = { readonly heading: string } | { readonly line: string };

function textPage(title: string, subtitle: string, blocks: readonly Block[], foot: string) {
  const texts: TextRun[] = [
    { x: MARGIN, y: A4.height - 90, size: 20, bold: true, text: title },
    { x: MARGIN, y: A4.height - 112, size: 10, text: subtitle },
  ];
  let y = A4.height - 150;
  for (const block of blocks) {
    if ('heading' in block) {
      y -= 8;
      texts.push({ x: MARGIN, y, size: 12, bold: true, text: block.heading });
      y -= 18;
      continue;
    }
    if (block.line.length > MAX_LINE) throw new Error(`Zeile zu lang: ${block.line}`);
    texts.push({ x: MARGIN, y, size: 10, text: block.line });
    y -= 16;
  }
  texts.push({ x: MARGIN, y: 40, size: 8, text: foot });
  const draw = `0.6 w ${MARGIN} ${A4.height - 124} m ${A4.width - MARGIN} ${A4.height - 124} l S\n`;
  return { ...A4, texts, draw };
}

const DEMO_HINT = 'Erfundenes Beispiel für die Conocto-Demo';

const line = (text: string): Block => ({ line: text });
const heading = (text: string): Block => ({ heading: text });

const BAUBESCHREIBUNG: PageSpec[] = [
  textPage(
    'Baubeschreibung',
    `Neubau Verwaltungsgebäude · ${DEMO_HINT}`,
    [
      heading('Allgemeines'),
      line('Das Bauvorhaben umfasst einen Verwaltungsbau mit drei Geschossen und Untergeschoss.'),
      line('Alle Angaben sind frei erfunden und dienen nur zum Ausprobieren der App.'),
      heading('Baustelleneinrichtung'),
      line('Die Baustelleneinrichtung ist nach OZ 001.001.0010 für 12 Wochen vorzuhalten.'),
      line('Lager- und Containerflächen liegen auf der Nordseite des Grundstücks.'),
      line('Die Wasserhaltung ist während der Gründungsarbeiten ohne Unterbrechung zu betreiben.'),
      heading('Erdarbeiten'),
      line('Der Oberboden ist im gesamten Baufeld 30 cm stark abzutragen und seitlich zu lagern.'),
      line(
        'Aushub nach Gutachten. Für die Baugrube sind rund 450 m³ ' +
          'Boden zu lösen. Abfuhr inklusive.',
      ),
      heading('Rohbau'),
      line(
        'Die Deckenplatten werden in Ortbeton C20/25 mit 20 cm Dicke ' +
          'hergestellt (OZ 001.004.0020).',
      ),
      line('Die Außenwände im Untergeschoss erhalten Ortbeton C35/45 (OZ 001.004.0030, 267 m³).'),
      line('Die Bodenplatte ist gegen aufsteigende Feuchte abzudichten, siehe OZ 001.006.0040.'),
    ],
    'Seite 1 von 2',
  ),
  textPage(
    'Baubeschreibung',
    `Neubau Verwaltungsgebäude · ${DEMO_HINT}`,
    [
      heading('Stahlbau'),
      line(
        'Im Foyer stehen Stahlstützen. Ausführung als HEB 200 mit ' +
          'zusammen 6,4 t. Statik folgt.',
      ),
      heading('Fassade und Gerüst'),
      line('Die Fassade wird verputzt. Dafür ist ein Arbeitsgerüst mit rund 1.850 m² vorzuhalten.'),
      heading('Ausbau'),
      line(
        'Die Büros erhalten Estrich. Zementestrich CT-C25-F4, 60 mm, ' +
          'auf 1.240 m². Darauf Belag.',
      ),
      line('Als Bodenbelag ist Kautschuk 2,0 mm vorgesehen, siehe OZ 003.006.0010.'),
      heading('Technik'),
      line('Der Brennwertkessel mit 120 kW steht im Technikraum des Untergeschosses.'),
      line(
        'Kabel liegen auf Trassen. Die Kabeltrassen sind ' +
          'feuerverzinkt, zusammen 380 m. Mit Deckel.',
      ),
    ],
    'Seite 2 von 2',
  ),
];

const VORBEMERKUNGEN: PageSpec[] = [
  textPage(
    'Vorbemerkungen',
    `zum Leistungsverzeichnis · Neubau Verwaltungsgebäude · ${DEMO_HINT}`,
    [
      heading('Ausführungszeit'),
      line('Ausführungsbeginn ist die 10. Kalenderwoche, die Bauzeit beträgt 14 Monate.'),
      heading('Gerüste'),
      line('Gerüstvorhaltung über die Grundvorhaltezeit hinaus je Woche nach OZ 001.005.0020.'),
      heading('Stundenlohnarbeiten'),
      line('Stundenlohnarbeiten nur nach vorheriger Anordnung, siehe OZ 999.999.9999.'),
      heading('Estrich und Beläge'),
      line('Estrichflächen sind vor dem Verlegen der Beläge auf Belegreife zu prüfen.'),
      line('Das Ergebnis ist schriftlich festzuhalten.'),
    ],
    'Seite 1 von 1',
  ),
];

// --- Plan (A3 quer, M 1:100) --------------------------------------------------------------

const A3 = { width: 1190.55, height: 841.89 };
/** Seiten-Einheiten je Meter bei 1:100: 10 mm auf dem Papier. */
const S = (72 / 25.4) * 10;
const OX = 150;
const OY = 230;
const px = (meter: number): number => OX + meter * S;
const py = (meter: number): number => OY + meter * S;

interface Room {
  readonly name: string;
  readonly x: readonly [number, number];
  readonly y: readonly [number, number];
}

const ROOMS: readonly Room[] = [
  { name: 'Büro 1.01', x: [0, 6], y: [6, 12] },
  { name: 'Büro 1.02', x: [6, 12], y: [6, 12] },
  { name: 'Besprechung 1.03', x: [12, 20], y: [6, 12] },
  { name: 'WC 1.04', x: [20, 24], y: [6, 12] },
  { name: 'Foyer 1.05', x: [0, 12], y: [0, 6] },
  { name: 'Technik 1.06', x: [12, 18], y: [0, 6] },
  { name: 'Lager 1.07', x: [18, 24], y: [0, 6] },
];

const fmt = (value: number): string => value.toFixed(2).replace('.', ',');

function planPage(): PageSpec {
  const lines: string[] = ['0 0 0 RG'];
  lines.push(`3 w ${num(px(0))} ${num(py(0))} ${num(24 * S)} ${num(12 * S)} re S`);
  const wall = (x1: number, y1: number, x2: number, y2: number): void => {
    lines.push(`1.5 w ${num(px(x1))} ${num(py(y1))} m ${num(px(x2))} ${num(py(y2))} l S`);
  };
  wall(0, 6, 24, 6);
  wall(6, 6, 6, 12);
  wall(12, 0, 12, 12);
  wall(20, 6, 20, 12);
  wall(18, 0, 18, 6);
  const texts: TextRun[] = [];
  for (const room of ROOMS) {
    const cx = px((room.x[0] + room.x[1]) / 2);
    const cy = py((room.y[0] + room.y[1]) / 2);
    const area = (room.x[1] - room.x[0]) * (room.y[1] - room.y[0]);
    texts.push({ x: cx - room.name.length * 2.6, y: cy + 4, size: 9, bold: true, text: room.name });
    texts.push({ x: cx - 16, y: cy - 9, size: 8, text: `${fmt(area)} m²` });
  }
  // Maßkette oben: einzelne Räume, darüber die Gesamtlänge.
  const chain = (marks: readonly number[], at: number): void => {
    const y = py(at);
    lines.push(
      `0.5 w ${num(px(marks[0]))} ${num(y)} m ${num(px(marks[marks.length - 1]))} ${num(y)} l S`,
    );
    for (const mark of marks) {
      lines.push(
        `0.5 w ${num(px(mark) - 3)} ${num(y - 3)} m ${num(px(mark) + 3)} ${num(y + 3)} l S`,
      );
    }
    for (let i = 1; i < marks.length; i += 1) {
      const mid = px((marks[i - 1] + marks[i]) / 2);
      texts.push({ x: mid - 9, y: y + 4, size: 8, text: fmt(marks[i] - marks[i - 1]) });
    }
  };
  chain([0, 6, 12, 20, 24], 13.2);
  chain([0, 24], 14.4);
  // Plankopf unten rechts.
  const hx = 850;
  lines.push(`1 w ${hx} 40 300 150 re S`, `0.5 w ${hx} 150 m ${hx + 300} 150 l S`);
  texts.push(
    { x: hx + 12, y: 168, size: 11, bold: true, text: 'Neubau Verwaltungsgebäude' },
    { x: hx + 12, y: 124, size: 16, bold: true, text: 'Grundriss Erdgeschoss' },
    { x: hx + 12, y: 100, size: 11, text: 'M 1:100' },
    { x: hx + 12, y: 80, size: 9, text: 'Plan-Nr. 101 · Index A' },
    { x: hx + 12, y: 56, size: 8, text: DEMO_HINT },
  );
  return { ...A3, texts, draw: `${lines.join('\n')}\n` };
}

// --- PDF lesen wie die App ----------------------------------------------------------------

type PdfJs = typeof import('pdfjs-dist');

async function pageTexts(lib: PdfJs, bytes: Uint8Array): Promise<string[]> {
  const task = lib.getDocument({
    data: bytes.slice(),
    standardFontDataUrl: FONTS,
  });
  const pdf = await task.promise;
  const out: string[] = [];
  for (let page = 1; page <= pdf.numPages; page += 1) {
    const content = await (await pdf.getPage(page)).getTextContent();
    // Wie `pageText` in components/docs/DocumentsProvider.tsx.
    out.push(content.items.map((item) => ('str' in item ? item.str : '')).join(''));
  }
  await task.destroy();
  return out;
}

// --- Notiz-Datei --------------------------------------------------------------------------

interface ExportPosition {
  readonly oz: string;
  readonly shortText: string;
  readonly unit: string | null;
  readonly quantity: number | null;
  readonly hashes: { readonly id: string; readonly text: string };
}

function positionsOf(value: unknown, out: ExportPosition[] = []): ExportPosition[] {
  if (Array.isArray(value)) for (const item of value) positionsOf(item, out);
  else if (typeof value === 'object' && value !== null) {
    const raw = value as Record<string, unknown>;
    if (typeof raw.oz === 'string' && typeof raw.shortText === 'string') {
      out.push(raw as unknown as ExportPosition);
    } else for (const child of Object.values(raw)) positionsOf(child, out);
  }
  return out;
}

type DocKey = 'bb' | 'vb' | 'plan';
type Paint = 'gelb' | 'orange' | 'gruen' | 'blau' | 'rosa' | 'lila';

interface Spot {
  readonly doc: DocKey;
  readonly page: number;
  readonly text: string;
  /** OZ der verknüpften Positionen; leer: nur angestrichen. */
  readonly links: readonly string[];
  /** Aus einem Vorschlag übernommen; fehlt: von Hand verknüpft. */
  readonly quelle?: 'oz' | 'menge';
  readonly farbe?: Paint;
}

// Verknüpft (von Hand oder als übernommener Vorschlag) und angestrichen. Alle übrigen OZ und
// Mengen in den Texten bleiben offene Vorschläge.
const SPOTS: readonly Spot[] = [
  { doc: 'bb', page: 1, text: '001.001.0010', links: ['001.001.0010'], quelle: 'oz' },
  {
    doc: 'bb',
    page: 1,
    text: 'Die Wasserhaltung ist während der Gründungsarbeiten ohne Unterbrechung zu betreiben.',
    links: [],
    farbe: 'gelb',
  },
  {
    doc: 'bb',
    page: 1,
    text: 'Der Oberboden ist im gesamten Baufeld 30 cm stark abzutragen und seitlich zu lagern.',
    links: ['001.002.0030'],
  },
  { doc: 'bb', page: 1, text: '001.006.0040', links: ['001.006.0040'], quelle: 'oz' },
  {
    doc: 'bb',
    page: 2,
    text: '003.006.0010',
    links: ['003.006.0010'],
    quelle: 'oz',
    farbe: 'blau',
  },
  {
    doc: 'bb',
    page: 2,
    text: 'Der Brennwertkessel mit 120 kW steht im Technikraum des Untergeschosses.',
    links: ['004.001.0010'],
  },
  {
    doc: 'vb',
    page: 1,
    text: 'die Bauzeit beträgt 14 Monate.',
    links: [],
    farbe: 'orange',
  },
  { doc: 'vb', page: 1, text: '001.005.0020', links: ['001.005.0020'], quelle: 'oz' },
  {
    doc: 'vb',
    page: 1,
    text: 'Estrichflächen sind vor dem Verlegen der Beläge auf Belegreife zu prüfen.',
    links: ['003.002.0010', '003.006.0010'],
  },
];

interface DocSpec {
  /** Dateiname im Repo (ohne Umlaute und Leerzeichen). */
  readonly file: string;
  /** Name in der App; steht genauso in `DEMO_PROJEKT.docs` (lib/pipeline/loadDemoLv.ts). */
  readonly name: string;
  readonly pages: readonly PageSpec[];
}

const DOCS: Readonly<Record<DocKey, DocSpec>> = {
  bb: {
    file: 'baubeschreibung.pdf',
    name: 'Baubeschreibung Verwaltungsgebäude.pdf',
    pages: BAUBESCHREIBUNG,
  },
  vb: { file: 'vorbemerkungen.pdf', name: 'Vorbemerkungen LV.pdf', pages: VORBEMERKUNGEN },
  plan: { file: 'grundriss-eg.pdf', name: 'Grundriss EG.pdf', pages: [planPage()] },
};

/** Ecken eines Raums in Seiten-Einheiten der App: Ursprung oben links, y nach unten. */
function corners(room: Room): [number, number][] {
  const top = A3.height - py(room.y[1]);
  const bottom = A3.height - py(room.y[0]);
  return [
    [px(room.x[0]), top],
    [px(room.x[1]), top],
    [px(room.x[1]), bottom],
    [px(room.x[0]), bottom],
  ];
}

async function main(): Promise<void> {
  globalThis.DOMParser = new JSDOM('').window.DOMParser;
  const corePath = fileURLToPath(new URL('../../packages/core/src/index.ts', HERE));
  const { module: core } = await runnerImport<Core>(corePath, {
    configFile: false,
    logLevel: 'error',
  });
  const lib = (await import('pdfjs-dist/legacy/build/pdf.mjs')) as unknown as PdfJs;

  const lvBytes = new Uint8Array(readFileSync(LV_FILE));
  const draft = core.mapToLvDraft(core.getGaebParser().parse(lvBytes, LV_FILE));
  const positions = positionsOf(core.toLvExport(draft, core.fileIdOf(lvBytes)));
  const byOz = new Map(positions.map((position) => [position.oz, position]));
  const position = (oz: string): ExportPosition => {
    const found = byOz.get(oz);
    if (found === undefined) throw new Error(`OZ nicht im Demo-LV: ${oz}`);
    return found;
  };

  mkdirSync(OUT, { recursive: true });
  const ids = new Map<DocKey, string>();
  const texts = new Map<DocKey, string[]>();
  for (const [key, doc] of Object.entries(DOCS) as [DocKey, DocSpec][]) {
    const bytes = pdfBytes(doc.name.replace(/\.pdf$/, ''), doc.pages);
    writeFileSync(`${OUT}${doc.file}`, bytes);
    // Wie `docIdOf` in lib/docs/pdf.ts: die ersten 12 Zeichen des SHA-256.
    ids.set(key, createHash('sha256').update(bytes).digest('hex').slice(0, 12));
    texts.set(key, await pageTexts(lib, bytes));
  }
  const idOf = (key: DocKey): string => ids.get(key) ?? '';

  interface FileSpot {
    dokument: string;
    seite: number;
    start: number;
    text: string;
    farbe: Paint | null;
    zeit: string;
    quelle?: 'oz' | 'menge';
  }
  const linked = new Map<string, FileSpot[]>();
  const painted: FileSpot[] = [];
  for (const spot of SPOTS) {
    const page = texts.get(spot.doc)?.[spot.page - 1] ?? '';
    const start = page.indexOf(spot.text);
    if (start < 0 || page.indexOf(spot.text, start + 1) >= 0) {
      throw new Error(`Stelle nicht eindeutig im Seitentext: ${spot.text}`);
    }
    const entry: FileSpot = {
      dokument: idOf(spot.doc),
      seite: spot.page,
      start,
      text: spot.text,
      farbe: spot.farbe ?? null,
      zeit: ZEIT,
      ...(spot.quelle === undefined ? {} : { quelle: spot.quelle }),
    };
    if (spot.links.length === 0) painted.push(entry);
    for (const oz of spot.links) linked.set(oz, [...(linked.get(oz) ?? []), entry]);
  }

  const room = ROOMS.find((entry) => entry.name === 'Besprechung 1.03');
  if (room === undefined) throw new Error('Raum fehlt');
  const ecken = corners(room);
  const measures = [
    {
      doc: idOf('plan'),
      page: 1,
      id: 'demo-besprechung-flaeche',
      kind: 'flaeche',
      shape: 'rechteck',
      points: ecken,
      name: 'Besprechung 1.03',
      links: [position('003.002.0010').hashes.id, position('003.006.0010').hashes.id],
      at: AT,
    },
    {
      doc: idOf('plan'),
      page: 1,
      id: 'demo-besprechung-sockel',
      kind: 'kette',
      points: [...ecken, ecken[0]],
      name: 'Sockel Besprechung 1.03',
      links: [position('003.006.0030').hashes.id],
      at: AT,
    },
  ];
  const planned = new Set(measures.flatMap((measure) => measure.links));
  const notedOz = new Set([
    ...linked.keys(),
    ...positions.filter((entry) => planned.has(entry.hashes.id)).map((entry) => entry.oz),
  ]);

  const file = {
    art: 'conocto-notizen',
    version: 4,
    datei: 'conocto-demo-angebot.x84',
    dateiId: core.fileIdOf(lvBytes),
    gesichert: ZEIT,
    farben: {},
    positionen: [...notedOz].sort().map((oz) => {
      const entry = position(oz);
      return {
        hash: entry.hashes.id,
        text: entry.hashes.text,
        oz: entry.oz,
        kurztext: entry.shortText,
        menge: entry.quantity,
        einheit: entry.unit,
        fortschritt: null,
        wichtig: false,
        anstreichungen: [],
        dokumentstellen: linked.get(oz) ?? [],
        verlauf: [],
      };
    }),
    dokumente: (Object.keys(DOCS) as DocKey[]).map((key) => ({
      id: idOf(key),
      name: DOCS[key].name,
      seiten: DOCS[key].pages.length,
    })),
    dokumentstellen: painted,
    plaene: {
      scales: [
        { doc: idOf('plan'), page: 1, unit: core.unitFromRatio(100), source: 'plankopf', at: AT },
      ],
      measures,
    },
  };
  writeFileSync(`${OUT}${NOTES_FILE}`, `${JSON.stringify(file, null, 2)}\n`);
  for (const key of Object.keys(DOCS) as DocKey[]) {
    console.log(`${DOCS[key].file}  ${idOf(key)}`);
  }
  console.log(`${NOTES_FILE}  ${file.positionen.length} Positionen`);
}

await main();
