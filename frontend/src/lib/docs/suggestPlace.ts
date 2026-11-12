// Platz der Vorschlagsleiste an der markierten Stelle im PDF (Entscheidung 0108).

export const SUGGEST_GAP = 8;
const GAP = SUGGEST_GAP;

export interface Box {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
}

/**
 * Platz der Leiste an der markierten Stelle (Nico, 12.11.2026): rechts daneben, sonst
 * darunter, sonst darüber, sonst links. Immer ganz in `view`, der PDF-Ansicht: Scrollt die
 * Stelle hinaus, bleibt die Leiste an deren Rand stehen.
 */
export function placeNextTo(
  spot: Box,
  size: { width: number; height: number },
  view: Box,
): { left: number; top: number } {
  const clamp = (value: number, low: number, high: number) =>
    Math.max(low, Math.min(value, Math.max(low, high)));
  const clampX = (x: number) => clamp(x, view.left + GAP, view.right - size.width - GAP);
  const clampY = (y: number) => clamp(y, view.top + GAP, view.bottom - size.height - GAP);
  if (spot.right + GAP + size.width <= view.right - GAP) {
    return { left: clampX(spot.right + GAP), top: clampY(spot.top - GAP) };
  }
  if (spot.bottom + GAP + size.height <= view.bottom - GAP) {
    return { left: clampX(spot.left), top: clampY(spot.bottom + GAP) };
  }
  if (spot.top - GAP - size.height >= view.top + GAP) {
    return { left: clampX(spot.left), top: clampY(spot.top - GAP - size.height) };
  }
  return { left: clampX(spot.left - GAP - size.width), top: clampY(spot.top) };
}
