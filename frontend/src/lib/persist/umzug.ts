// Umzug des Viewers von conocto.app/doc/ auf doc.conocto.app
// (Entscheidung neu-doc-eigene-adresse).
//
// Eine neue Adresse ist für den Browser ein neuer Speicher. Deshalb reicht die alte Adresse
// das Gespeicherte vor der Weiterleitung selbst weiter: sie lädt die Seite `uebernahme.html`
// der neuen Adresse unsichtbar und schickt ihr die Einträge per `postMessage`. Alles bleibt
// in diesem Browser, kein Request mit Daten.

import {
  deleteAllStored,
  importAllStored,
  readAllStored,
  type ImportResult,
  type StoredEntry,
} from './lastLv';

export const NEW_ORIGIN = 'https://doc.conocto.app';
/** Adressen, unter denen der Viewer vorher lag. Nur von dort nimmt die neue Seite Daten an. */
export const OLD_ORIGINS: readonly string[] = ['https://conocto.app', 'https://www.conocto.app'];
const KIND = 'conocto-umzug';
/** So lange wartet die alte Adresse auf die neue, dann leitet sie trotzdem weiter. */
const TIMEOUT_MS = 10_000;

interface MoveRequest {
  readonly art: typeof KIND;
  readonly eintraege: readonly StoredEntry[];
}

interface MoveAnswer {
  readonly art: typeof KIND;
  readonly ergebnis: ImportResult;
}

/**
 * Ziel der Weiterleitung oder `null`, wenn diese Seite bleibt. `onlyMove` ist gesetzt, wenn
 * der Build nur noch weiterleiten soll (Startseiten-Projekt, `VITE_NUR_UMZUG=1`); sonst zieht
 * nur um, wer unter einer alten Adresse liegt. Suche und Fragment (`#lv=…~pos=…`) bleiben.
 */
export function moveTarget(
  location: Pick<Location, 'origin' | 'search' | 'hash'>,
  onlyMove: boolean,
): string | null {
  if (!onlyMove && !OLD_ORIGINS.includes(location.origin)) return null;
  return `${NEW_ORIGIN}/${location.search}${location.hash}`;
}

function isAnswer(data: unknown): data is MoveAnswer {
  if (typeof data !== 'object' || data === null) return false;
  const answer = data as Record<string, unknown>;
  return (
    answer.art === KIND &&
    (answer.ergebnis === 'uebernommen' ||
      answer.ergebnis === 'teilweise' ||
      answer.ergebnis === 'fehler')
  );
}

function isRequest(data: unknown): data is MoveRequest {
  if (typeof data !== 'object' || data === null) return false;
  const request = data as Record<string, unknown>;
  return (
    request.art === KIND &&
    Array.isArray(request.eintraege) &&
    request.eintraege.every(
      (entry: unknown) =>
        typeof entry === 'object' &&
        entry !== null &&
        typeof (entry as Record<string, unknown>).key === 'string',
    )
  );
}

/** Schickt die Einträge an die neue Adresse; `null` ohne Antwort in der Wartezeit. */
function handOver(entries: readonly StoredEntry[]): Promise<ImportResult | null> {
  return new Promise((resolve) => {
    const frame = document.createElement('iframe');
    frame.src = `${NEW_ORIGIN}/uebernahme.html`;
    frame.hidden = true;
    const done = (result: ImportResult | null): void => {
      window.clearTimeout(timer);
      window.removeEventListener('message', onMessage);
      frame.remove();
      resolve(result);
    };
    const onMessage = (event: MessageEvent): void => {
      if (event.origin !== NEW_ORIGIN || event.source !== frame.contentWindow) return;
      if (isAnswer(event.data)) done(event.data.ergebnis);
    };
    const timer = window.setTimeout(() => done(null), TIMEOUT_MS);
    window.addEventListener('message', onMessage);
    frame.addEventListener('load', () => {
      const request: MoveRequest = { art: KIND, eintraege: entries };
      frame.contentWindow?.postMessage(request, NEW_ORIGIN);
    });
    document.body.append(frame);
  });
}

/**
 * Alte Adresse: Gespeichertes weiterreichen, dann weiterleiten. Gelöscht wird hier nur, wenn
 * die neue Adresse alles übernommen hat; sonst bleibt es für den nächsten Versuch.
 */
export async function moveAndRedirect(target: string): Promise<void> {
  try {
    const entries = await readAllStored();
    if (entries !== null && entries.length > 0) {
      const result = await handOver(entries);
      // Löschen kann hängen, wenn ein anderer Tab die Datenbank offen hält.
      if (result === 'uebernommen') {
        await Promise.race([
          deleteAllStored(),
          new Promise((resolve) => window.setTimeout(resolve, 2_000)),
        ]);
      }
    }
  } finally {
    // Auch nach einem Fehler weiter: die Daten bleiben dann für den nächsten Versuch hier.
    window.location.replace(target);
  }
}

/** Neue Adresse, Seite `uebernahme.html`: Einträge annehmen und das Ergebnis melden. */
export function receiveMove(): void {
  window.addEventListener('message', (event: MessageEvent) => {
    if (!OLD_ORIGINS.includes(event.origin) || !isRequest(event.data)) return;
    const source = event.source;
    if (source === null) return;
    void importAllStored(event.data.eintraege).then((ergebnis) => {
      const answer: MoveAnswer = { art: KIND, ergebnis };
      source.postMessage(answer, { targetOrigin: event.origin });
    });
  });
}
