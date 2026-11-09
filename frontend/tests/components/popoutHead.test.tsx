// Graph, Tabelle und Dokument im eigenen Browserfenster haben die ganze Kopfleiste
// (PopoutHead, Entscheidung 0102): dieselbe Suche und dieselben Filter wie das
// Hauptfenster, aber eine eigene Filterleiste; sehr schmal nur eine Lupe.

import { readFileSync } from 'node:fs';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PopoutHead } from '../../src/components/shell/PopoutHead';
import { WorkspaceProvider } from '../../src/components/shell/WorkspaceProvider';
import { SearchPill } from '../../src/components/layout/SearchPill';
import { GraphHeader } from '../../src/components/graph/GraphHeader';
import { runPipeline } from '../../src/lib/pipeline/runPipeline';
import { ViewerProvider } from '../../src/state/ViewerProvider';
import { useViewer, useViewerDispatch } from '../../src/state/viewer';

const bytes = readFileSync('../packages/core/tests/fixtures/gaeb-xml-beispiel.x83');
const LV = runPipeline(
  bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer,
  'beispiel.x83',
);

function Steuerung() {
  const dispatch = useViewerDispatch();
  const { filter, view } = useViewer();
  return (
    <>
      <button type="button" onClick={() => dispatch({ type: 'loaded', lv: LV })}>
        laden
      </button>
      <output aria-label="suche">{filter.search}</output>
      <output aria-label="kopfleiste">{view.filterBar ? 'offen' : 'zu'}</output>
    </>
  );
}

describe('Kopfleiste im eigenen Fenster', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('sucht im gemeinsamen Filter und öffnet nur die eigene Filterleiste', () => {
    render(
      <ViewerProvider>
        <WorkspaceProvider>
          <Steuerung />
          <PopoutHead />
        </WorkspaceProvider>
      </ViewerProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'laden' }));

    fireEvent.change(screen.getByRole('textbox', { name: 'Suche' }), {
      target: { value: 'Beton' },
    });
    act(() => {
      vi.runAllTimers();
    });
    expect(screen.getByRole('status', { name: 'suche' })).toHaveTextContent('Beton');

    fireEvent.click(screen.getByRole('button', { name: '+ Filter' }));
    expect(screen.getByRole('region', { name: 'Filterleiste' })).toBeInTheDocument();
    expect(screen.getByRole('status', { name: 'kopfleiste' })).toHaveTextContent('zu');

    fireEvent.click(screen.getByRole('button', { name: 'Filterleiste schließen' }));
    expect(screen.queryByRole('region', { name: 'Filterleiste' })).toBeNull();
  });

  it('nimmt mit "/" den Fokus ins Suchfeld', () => {
    render(
      <ViewerProvider>
        <WorkspaceProvider>
          <Steuerung />
          <PopoutHead />
        </WorkspaceProvider>
      </ViewerProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'laden' }));
    fireEvent.keyDown(window, { key: '/' });
    expect(screen.getByRole('textbox', { name: 'Suche' })).toHaveFocus();
  });

  it('hat Logo-Menü und Suche, aber kein „LV schließen“', () => {
    render(
      <ViewerProvider>
        <WorkspaceProvider>
          <Steuerung />
          <PopoutHead />
        </WorkspaceProvider>
      </ViewerProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'laden' }));
    expect(screen.getByRole('button', { name: 'Über diese App' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Suche' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'LV schließen' })).toBeNull();
    expect(screen.queryByRole('button', { name: /Ansicht/ })).toBeNull();
  });

  describe('sehr schmal', () => {
    const breite = window.innerWidth;
    beforeEach(() => {
      window.innerWidth = 400;
    });
    afterEach(() => {
      window.innerWidth = breite;
    });

    function schmal() {
      render(
        <ViewerProvider>
          <WorkspaceProvider>
            <Steuerung />
            <PopoutHead />
          </WorkspaceProvider>
        </ViewerProvider>,
      );
      fireEvent.click(screen.getByRole('button', { name: 'laden' }));
    }

    it('zeigt nur die Lupe; Antippen fährt die Suche aus und setzt den Fokus', () => {
      schmal();
      expect(screen.queryByRole('textbox', { name: 'Suche' })).toBeNull();
      fireEvent.click(screen.getByRole('button', { name: 'Suche aufklappen' }));
      expect(screen.getByRole('textbox', { name: 'Suche' })).toHaveFocus();
      fireEvent.blur(screen.getByRole('textbox', { name: 'Suche' }));
      expect(screen.getByRole('button', { name: 'Suche aufklappen' })).toBeInTheDocument();
    });

    it('fährt beim Darüberfahren mit der Maus aus und wieder ein', () => {
      schmal();
      fireEvent.pointerEnter(screen.getByRole('button', { name: 'Suche aufklappen' }), {
        pointerType: 'mouse',
      });
      const feld = screen.getByRole('textbox', { name: 'Suche' });
      fireEvent.pointerLeave(feld.parentElement as HTMLElement, { pointerType: 'mouse' });
      expect(screen.queryByRole('textbox', { name: 'Suche' })).toBeNull();
    });

    it('klappt im Hauptfenster nie ein', () => {
      render(
        <ViewerProvider>
          <WorkspaceProvider>
            <Steuerung />
            <SearchPill filterOpen={false} onFilterOpen={() => undefined} />
          </WorkspaceProvider>
        </ViewerProvider>,
      );
      fireEvent.click(screen.getByRole('button', { name: 'laden' }));
      expect(screen.getByRole('textbox', { name: 'Suche' })).toBeInTheDocument();
    });
  });
});

describe('Legende auf schmalem Graphen', () => {
  function Laden() {
    const dispatch = useViewerDispatch();
    return (
      <button type="button" onClick={() => dispatch({ type: 'loaded', lv: LV })}>
        laden
      </button>
    );
  }

  it('ist ein Knopf, der sie aufklappt', () => {
    render(
      <ViewerProvider>
        <Laden />
        <GraphHeader root={LV.tree} width={500} controls={<div>Steuerung</div>} />
      </ViewerProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'laden' }));
    expect(screen.queryByLabelText('Legende')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Legende' }));
    expect(within(screen.getByLabelText('Legende')).getByText('Bedarf')).toBeInTheDocument();
    expect(screen.getByText('Steuerung')).toBeInTheDocument();
  });

  it('steht breit offen da', () => {
    render(
      <ViewerProvider>
        <Laden />
        <GraphHeader root={LV.tree} width={1000} />
      </ViewerProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'laden' }));
    expect(within(screen.getByLabelText('Legende')).getByText('Bedarf')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Legende' })).toBeNull();
  });
});
