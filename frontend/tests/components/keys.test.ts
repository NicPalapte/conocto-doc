// Kurzbefehle auf dem ganzen Fenster lassen Bedienelemente mit eigenen Tasten in Ruhe
// (Issue #191, Review zu Taste T und ← → in der Vorschlagsleiste).
import { describe, expect, it } from 'vitest';
import { keyIsTaken, overlayOpen } from '../../src/components/common/keys';

function press(target: Element, init: KeyboardEventInit = {}): KeyboardEvent {
  let seen: KeyboardEvent | null = null;
  target.addEventListener('keydown', (event) => {
    seen = event as KeyboardEvent;
  });
  target.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, ...init }));
  if (seen === null) throw new Error('kein Ereignis');
  return seen;
}

describe('keyIsTaken', () => {
  it('Regler, Liste und Eingabefeld behalten die Pfeile', () => {
    document.body.innerHTML =
      '<div role="slider" tabindex="0"></div><ul role="listbox"><li>a</li></ul>' +
      '<input type="range" /><button>x</button>';
    expect(keyIsTaken(press(document.querySelector('[role="slider"]') as Element))).toBe(true);
    expect(keyIsTaken(press(document.querySelector('li') as Element))).toBe(true);
    expect(keyIsTaken(press(document.querySelector('input') as Element))).toBe(true);
    expect(keyIsTaken(press(document.querySelector('button') as Element))).toBe(false);
  });

  it('erkennt offene Dialoge und Menüs', () => {
    document.body.innerHTML = '<div></div>';
    expect(overlayOpen(document)).toBe(false);
    document.body.innerHTML = '<div role="menu"></div>';
    expect(overlayOpen(document)).toBe(true);
  });
});
