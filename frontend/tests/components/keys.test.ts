// Kurzbefehle auf dem ganzen Fenster lassen Bedienelemente mit eigenen Tasten in Ruhe
// (Issue #191, Review zu Taste T und ← → in der Vorschlagsleiste).
import { describe, expect, it } from 'vitest';
import { keyIsTaken, overlayOpen } from '../../src/components/common/keys';

function press(target: Element, key = 'ArrowRight'): KeyboardEvent {
  let seen: KeyboardEvent | null = null;
  target.addEventListener('keydown', (event) => {
    seen = event as KeyboardEvent;
  });
  target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
  if (seen === null) throw new Error('kein Ereignis');
  return seen;
}

const el = (selector: string): Element => document.querySelector(selector) as Element;

describe('keyIsTaken', () => {
  it('Pfeile: Regler, Liste, Raster und Eingabefeld behalten sie', () => {
    document.body.innerHTML =
      '<div role="slider" tabindex="0"></div><ul role="listbox"><li>a</li></ul>' +
      '<div role="grid" tabindex="0"></div><input type="range" /><button>x</button>';
    expect(keyIsTaken(press(el('[role="slider"]')), 'arrows')).toBe(true);
    expect(keyIsTaken(press(el('li')), 'arrows')).toBe(true);
    expect(keyIsTaken(press(el('[role="grid"]')), 'arrows')).toBe(true);
    expect(keyIsTaken(press(el('input')), 'arrows')).toBe(true);
    expect(keyIsTaken(press(el('button')), 'arrows')).toBe(false);
  });

  it('Buchstaben: nur Tippen sperrt, Tabelle und Reiter nicht', () => {
    document.body.innerHTML =
      '<div role="grid" tabindex="0"></div><div role="tablist"><button>Graph</button></div>' +
      '<textarea></textarea>';
    expect(keyIsTaken(press(el('[role="grid"]'), 't'), 'letters')).toBe(false);
    expect(keyIsTaken(press(el('[role="tablist"] button'), 't'), 'letters')).toBe(false);
    expect(keyIsTaken(press(el('textarea'), 't'), 'letters')).toBe(true);
  });
});

describe('overlayOpen', () => {
  it('Fenster, Menü und Tour zählen, die Vorschlagsleiste nicht', () => {
    document.body.innerHTML = '<div role="dialog" data-nonmodal=""></div>';
    expect(overlayOpen(document)).toBe(false);
    document.body.innerHTML = '<div role="menu"></div>';
    expect(overlayOpen(document)).toBe(true);
    document.body.innerHTML = '<div role="dialog" data-tour-card=""></div>';
    expect(overlayOpen(document)).toBe(true);
  });
});
