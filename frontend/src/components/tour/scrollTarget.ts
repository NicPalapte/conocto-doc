/**
 * Ziel, das nur aus dem Bild gescrollt ist (Karte weiter unten im Überblick), ins Bild holen.
 * Zählt nur ein Treffer mit Fläche; zugeklappte oder nicht gezeichnete bleiben weg, dann
 * überspringt die Tour den Schritt.
 */
export function scrollToFirst(selector: string): boolean {
  for (const element of document.querySelectorAll(selector)) {
    const rect = element.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) continue;
    element.scrollIntoView({ block: 'nearest' });
    return true;
  }
  return false;
}
