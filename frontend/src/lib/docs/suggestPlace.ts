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
 * darunter, sonst darüber, sonst links. Immer ganz im Fenster.
 */
export function placeNextTo(
  spot: Box,
  size: { width: number; height: number },
  view: { width: number; height: number },
): { left: number; top: number } {
  const clampX = (x: number) => Math.max(GAP, Math.min(x, view.width - size.width - GAP));
  const clampY = (y: number) => Math.max(GAP, Math.min(y, view.height - size.height - GAP));
  if (spot.right + GAP + size.width <= view.width - GAP) {
    return { left: spot.right + GAP, top: clampY(spot.top - GAP) };
  }
  if (spot.bottom + GAP + size.height <= view.height - GAP) {
    return { left: clampX(spot.left), top: spot.bottom + GAP };
  }
  if (spot.top - GAP - size.height >= GAP) {
    return { left: clampX(spot.left), top: spot.top - GAP - size.height };
  }
  return { left: clampX(spot.left - GAP - size.width), top: clampY(spot.top) };
}
