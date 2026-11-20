// Knöpfe der Startseite führen unter conocto.app direkt nach doc.conocto.app (Entscheidung 0121).

import { describe, expect, it } from 'vitest';
import { pointLinksToViewer, viewerHref } from '../../src/landing/viewerLink';

describe('viewerHref', () => {
  it('führt unter conocto.app direkt zum Viewer, Suche bleibt', () => {
    expect(viewerHref('https://conocto.app', 'doc/')).toBe('https://doc.conocto.app/');
    expect(viewerHref('https://www.conocto.app', 'doc/?demo=projekt')).toBe(
      'https://doc.conocto.app/?demo=projekt',
    );
  });

  it('bleibt relativ auf anderen Adressen und bei anderen Links', () => {
    expect(viewerHref('https://dev.conocto.app', 'doc/')).toBe('doc/');
    expect(viewerHref('http://localhost:5173', 'doc/?demo=projekt')).toBe('doc/?demo=projekt');
    expect(viewerHref('https://conocto.app', '#funktionen')).toBe('#funktionen');
  });
});

describe('pointLinksToViewer', () => {
  it('schreibt die Knöpfe der Seite um', () => {
    document.body.innerHTML =
      '<a id="a" href="doc/">LV</a><a id="b" href="doc/?demo=projekt">Demo</a>';
    pointLinksToViewer('https://conocto.app');
    expect(document.getElementById('a')?.getAttribute('href')).toBe('https://doc.conocto.app/');
    expect(document.getElementById('b')?.getAttribute('href')).toBe(
      'https://doc.conocto.app/?demo=projekt',
    );
  });
});
