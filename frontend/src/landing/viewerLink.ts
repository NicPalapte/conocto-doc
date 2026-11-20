// Unter conocto.app führen die Knöpfe direkt zum Viewer auf doc.conocto.app (Entscheidung
// 0121), ohne Umweg über die Weiterleitung unter /doc/. Überall sonst (dev.conocto.app,
// PR-Vorschau, lokal) bleibt der relative Link `doc/…`. Eigene Konstanten statt Import aus
// der App: die Startseite lädt keinen App-Code (Entscheidung 0092).

const VIEWER = 'https://doc.conocto.app/';
const START_ORIGINS: readonly string[] = ['https://conocto.app', 'https://www.conocto.app'];

/** Ziel eines Startseiten-Links `doc/…` für die Seite unter `origin`. */
export function viewerHref(origin: string, href: string): string {
  if (!START_ORIGINS.includes(origin) || !href.startsWith('doc/')) return href;
  return VIEWER + href.slice('doc/'.length);
}

/** Schreibt alle Links `doc/…` der Seite um. */
export function pointLinksToViewer(origin: string): void {
  for (const link of document.querySelectorAll<HTMLAnchorElement>('a[href^="doc/"]')) {
    link.setAttribute('href', viewerHref(origin, link.getAttribute('href') ?? ''));
  }
}
