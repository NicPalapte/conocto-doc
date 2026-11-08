// Seitenbild zeichnen, ohne dass es schwarz wird (Entscheidung 0095). Browser zeichnen
// eine Zeichenfläche über ihrer Größengrenze schwarz (Safari am iPad schon ab 16 Mio.
// Bildpunkten). Große Pläne bekommen deshalb ein gröberes Gesamtbild und darüber ein
// scharfes Bild nur vom sichtbaren Ausschnitt. Gezeichnet wird immer auf eine neue
// Fläche; erst das fertige Bild ersetzt das alte — kein leeres Bild beim Zoomen.

import type { PDFPageProxy } from 'pdfjs-dist';

/** Höchstens so viele Bildpunkte je Zeichenfläche. */
export const MAX_PIXELS = 8_000_000;

/** Ausschnitt einer Seite in CSS-Pixeln beim aktuellen Maßstab. */
export interface Region {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** Bildpunkte je CSS-Pixel: so scharf wie der Bildschirm, aber unter `MAX_PIXELS`. */
export function pixelRatio(width: number, height: number, wanted: number): number {
  const area = Math.max(1, width * height);
  return Math.max(0.05, Math.min(wanted, Math.sqrt(MAX_PIXELS / area)));
}

export interface PageDrawing {
  readonly promise: Promise<HTMLCanvasElement>;
  readonly cancel: () => void;
}

/**
 * Höchstens so viele Bilder gleichzeitig. Alle Seiten auf einmal (großes Fenster, Vollbild)
 * lassen die sichtbare Seite warten, und zu viele große Flächen bleiben im Browser weiß.
 */
const MAX_RUNNING = 2;

interface Job {
  /** Kleiner = früher; 0 = sichtbar. Erst beim Start gefragt, die Lage ändert sich. */
  readonly rank: () => number;
  readonly start: () => void;
}

const waiting: Job[] = [];
let running = 0;

function pump(): void {
  while (running < MAX_RUNNING && waiting.length > 0) {
    let best = 0;
    let bestRank = waiting[0].rank();
    for (let i = 1; i < waiting.length; i += 1) {
      const rank = waiting[i].rank();
      if (rank < bestRank) {
        best = i;
        bestRank = rank;
      }
    }
    const [job] = waiting.splice(best, 1);
    running += 1;
    job.start();
  }
}

/**
 * Ausschnitt `region` der Seite bei Maßstab `scale` auf eine neue Fläche zeichnen.
 * Wartet in einer Schlange; `rank` (Abstand zum sichtbaren Bereich) bestimmt die Reihenfolge.
 */
export function drawRegion(
  proxy: PDFPageProxy,
  scale: number,
  ratio: number,
  region: Region,
  rank: () => number = () => 0,
): PageDrawing {
  let cancelled = false;
  let stop: (() => void) | null = null;
  let job: Job | null = null;
  let fail: (error: Error) => void = () => undefined;
  const promise = new Promise<HTMLCanvasElement>((resolve, reject) => {
    fail = reject;
    job = {
      rank,
      start: () => {
        const viewport = proxy.getViewport({ scale });
        // Immer im Hauptfenster zeichnen: im zweiten Fenster (Entscheidung 0039) fehlen die
        // Schriften, die PDF.js hier anmeldet. Fläche erst jetzt anlegen: spart Speicher.
        const work = document.createElement('canvas');
        work.width = Math.max(1, Math.floor(region.width * ratio));
        work.height = Math.max(1, Math.floor(region.height * ratio));
        const task = proxy.render({
          canvas: work,
          viewport,
          transform: [ratio, 0, 0, ratio, -region.x * ratio, -region.y * ratio],
        });
        stop = () => {
          task.cancel();
          work.width = 0;
          work.height = 0;
        };
        task.promise
          .then(
            () => (cancelled ? reject(new Error('abgebrochen')) : resolve(work)),
            (error: unknown) => reject(error),
          )
          .finally(() => {
            running -= 1;
            pump();
          });
      },
    };
    waiting.push(job);
  });
  pump();
  return {
    promise,
    cancel: () => {
      if (cancelled) return;
      cancelled = true;
      const index = job === null ? -1 : waiting.indexOf(job);
      if (index >= 0) {
        // Wartete noch: nie gestartet, also nur absagen.
        waiting.splice(index, 1);
        fail(new Error('abgebrochen'));
      }
      stop?.();
    },
  };
}

/** Fertiges Bild in die sichtbare Fläche kopieren und die Arbeitsfläche freigeben. */
export function showDrawing(target: HTMLCanvasElement, drawn: HTMLCanvasElement): void {
  target.width = drawn.width;
  target.height = drawn.height;
  target.getContext('2d')?.drawImage(drawn, 0, 0);
  drawn.width = 0;
  drawn.height = 0;
}
