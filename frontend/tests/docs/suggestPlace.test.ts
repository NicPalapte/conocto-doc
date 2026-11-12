// Vorschlagsleiste an der markierten Stelle (Entscheidung 0108).

import { describe, expect, it } from 'vitest';
import { placeNextTo } from '../../src/lib/docs/suggestPlace';

const size = { width: 290, height: 180 };
const view = { left: 0, top: 0, right: 1200, bottom: 800 };
const spot = (left: number, top: number, width = 100, height = 16) => ({
  left,
  top,
  right: left + width,
  bottom: top + height,
});

describe('placeNextTo', () => {
  it('rechts neben der Stelle, wenn Platz ist', () => {
    expect(placeNextTo(spot(100, 300), size, view)).toEqual({ left: 208, top: 292 });
  });

  it('sonst darunter, sonst darüber', () => {
    expect(placeNextTo(spot(900, 300), size, view)).toEqual({ left: 900, top: 324 });
    expect(placeNextTo(spot(900, 700), size, view)).toEqual({ left: 900, top: 512 });
  });

  it('bleibt ganz im Fenster', () => {
    const at = placeNextTo(spot(1100, 300), size, view);
    expect(at.left + size.width).toBeLessThanOrEqual(view.right - 8);
  });

  it('Stelle aus der PDF-Ansicht gescrollt: Leiste bleibt an deren Rand', () => {
    const pdf = { left: 400, top: 100, right: 1200, bottom: 700 };
    expect(placeNextTo(spot(500, -200), size, pdf).top).toBe(108);
    expect(placeNextTo(spot(500, 1000), size, pdf).top).toBe(700 - 180 - 8);
    expect(placeNextTo(spot(500, 300), size, pdf).left).toBeGreaterThanOrEqual(408);
  });
});
