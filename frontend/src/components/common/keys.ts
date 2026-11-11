// Gemeinsame Prüfung für Kurzbefehle auf dem ganzen Fenster (Issue #191: Taste T, ← → in der
// Vorschlagsleiste): Wo der Fokus die Taste selbst braucht, bleibt sie dort.

/** Bedienelemente, die Pfeile oder Buchstaben selbst nutzen. */
const OWN_KEYS =
  'input, textarea, select, [contenteditable=""], [contenteditable="true"], ' +
  '[role="slider"], [role="listbox"], [role="menu"], [role="menubar"], [role="tablist"], ' +
  '[role="radiogroup"], [role="grid"], [role="tree"]';

/** Die Taste gehört dem Element mit dem Fokus (Tippen, Regler, Liste, Menü) oder ist erledigt. */
export function keyIsTaken(event: KeyboardEvent): boolean {
  if (event.defaultPrevented) return true;
  const target = event.target;
  if (!(target instanceof Element)) return false;
  if (target instanceof HTMLElement && target.isContentEditable) return true;
  return target.closest(OWN_KEYS) !== null;
}

/** Ein Fenster, Menü oder die Tour ist offen: Kurzbefehle für den Hintergrund ruhen. */
export function overlayOpen(doc: Document): boolean {
  return doc.querySelector('[role="dialog"], [role="menu"]') !== null;
}
