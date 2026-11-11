// Gemeinsame Prüfung für Kurzbefehle auf dem ganzen Fenster (Issue #191: Taste T, ← → in der
// Vorschlagsleiste): Wo der Fokus die Taste selbst braucht, bleibt sie dort.

/** Felder, in die man tippt: dort sind Buchstaben und Pfeile Text. */
const TYPING = 'input, textarea, select, [contenteditable=""], [contenteditable="true"]';

/** Bedienelemente, die zusätzlich die Pfeile selbst nutzen (Regler, Liste, Raster, Reiter). */
const ARROW_OWNERS =
  `${TYPING}, [role="slider"], [role="listbox"], [role="menu"], [role="menubar"], ` +
  '[role="tablist"], [role="radiogroup"], [role="grid"], [role="tree"]';

/**
 * Die Taste gehört dem Element mit dem Fokus oder ist schon erledigt. `letters`: nur Tippen
 * sperrt (Taste T wirkt also auch in Tabelle und Reitern); `arrows`: auch Regler, Listen usw.
 */
export function keyIsTaken(event: KeyboardEvent, kind: 'letters' | 'arrows'): boolean {
  if (event.defaultPrevented) return true;
  const target = event.target;
  if (!(target instanceof Element)) return false;
  if (target instanceof HTMLElement && target.isContentEditable) return true;
  return target.closest(kind === 'letters' ? TYPING : ARROW_OWNERS) !== null;
}

/**
 * Ein Fenster, Menü oder die Tour ist offen: Kurzbefehle für den Hintergrund ruhen. Leisten,
 * die neben der Arbeit offen bleiben (Vorschlagsleiste), tragen `data-nonmodal` und zählen nicht.
 */
export function overlayOpen(doc: Document): boolean {
  return doc.querySelector('[role="dialog"]:not([data-nonmodal]), [role="menu"]') !== null;
}
