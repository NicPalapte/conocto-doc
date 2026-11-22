// Ziel der Tour ins Bild holen (components/tour/scrollTarget.ts).

import { afterEach, describe, expect, it, vi } from 'vitest';
import { scrollToFirst } from '../../src/components/tour/scrollTarget';

function box(id: string, width: number): HTMLElement {
  const element = document.createElement('div');
  element.dataset.tour = 'ziel';
  element.id = id;
  element.getBoundingClientRect = () => new DOMRect(0, 2000, width, width);
  element.scrollIntoView = vi.fn();
  document.body.append(element);
  return element;
}

afterEach(() => {
  document.body.replaceChildren();
});

describe('scrollToFirst', () => {
  it('scrollt den ersten Treffer mit Fläche, nicht einen zugeklappten davor', () => {
    const folded = box('zu', 0);
    const open = box('offen', 40);
    expect(scrollToFirst('[data-tour="ziel"]')).toBe(true);
    expect(folded.scrollIntoView).not.toHaveBeenCalled();
    expect(open.scrollIntoView).toHaveBeenCalledWith({ block: 'nearest' });
  });

  it('ohne Treffer mit Fläche scrollt nichts', () => {
    const folded = box('zu', 0);
    expect(scrollToFirst('[data-tour="ziel"]')).toBe(false);
    expect(scrollToFirst('[data-tour="fehlt"]')).toBe(false);
    expect(folded.scrollIntoView).not.toHaveBeenCalled();
  });
});
