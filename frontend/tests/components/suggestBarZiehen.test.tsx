// Vorschlagsleiste von Hand verschieben (Nico, 12.11.2026: sie verdeckt sonst Text).

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SuggestBar } from '../../src/components/docs/SuggestBar';
import type { DocSuggestion } from '../../src/lib/docs/docSuggest';

const VORSCHLAG: DocSuggestion = { page: 1, start: 0, text: 'x', id: 'a', source: 'oz' };

function leiste(suggestion = VORSCHLAG) {
  return (
    <SuggestBar
      suggestion={suggestion}
      oz="01.02.0010"
      shortText="Baugrube ausheben"
      left={100}
      top={100}
      onLink={vi.fn()}
      onReject={vi.fn()}
      onShow={vi.fn()}
      onClose={vi.fn()}
    />
  );
}

describe('Vorschlagsleiste ziehen', () => {
  it('folgt dem Zeiger am Kopf und springt beim nächsten Vorschlag zurück', () => {
    const { rerender } = render(leiste());
    const bar = screen.getByRole('dialog', { name: 'Vorschlag verknüpfen' });
    const start = { left: bar.style.left, top: bar.style.top };
    const kopf = screen.getByTitle('Zum Verschieben ziehen');
    fireEvent.pointerDown(kopf, { button: 0, clientX: 200, clientY: 200 });
    fireEvent.pointerMove(document, { clientX: 260, clientY: 230 });
    fireEvent.pointerUp(document);
    expect(parseFloat(bar.style.left)).toBe(parseFloat(start.left) + 60);
    expect(parseFloat(bar.style.top)).toBe(parseFloat(start.top) + 30);
    fireEvent.pointerMove(document, { clientX: 400, clientY: 400 });
    expect(parseFloat(bar.style.left)).toBe(parseFloat(start.left) + 60);
    rerender(leiste({ ...VORSCHLAG, start: 5 }));
    expect(bar.style.left).toBe(start.left);
  });
});
