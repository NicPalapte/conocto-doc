// „Einstellungen“ aus dem Logo-Menü (Entscheidung 0109): Overlay über der App, für alle, ohne
// Passwort. Rubriken: „Hervorhebung & Regeln“ (Regeleditor, Entscheidungen 0081, 0089,
// RulesTab.tsx), „Wortlisten“ (0090, WordListsTab.tsx) und „Markierfarben“ (0063,
// PaintNamesTab.tsx). Konfiguration, kein Arbeitsbereich: darum kein Bereich im Splitscreen.
// Dazu das Treffer-Protokoll der Materialtabellen — ein Prüfwerkzeug, kein Export für
// Kalkulatoren, deshalb nicht im Logo-Menü (Entscheidung 0079).

import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useDismiss } from '../common/useDismiss';
import { useHostWindow } from '../common/hostWindow';
import { RulesTab } from './RulesTab';
import { WordListsTab } from './WordListsTab';
import { PaintNamesTab } from './PaintNamesTab';
import { CloseSettingsContext } from './closeSettings';

export type SettingsSection = 'regeln' | 'listen' | 'farben';

const SECTIONS: readonly { value: SettingsSection; label: string }[] = [
  { value: 'regeln', label: 'Hervorhebung & Regeln' },
  { value: 'listen', label: 'Wortlisten' },
  { value: 'farben', label: 'Markierfarben' },
];

const NAV =
  'flex h-[44px] shrink-0 cursor-pointer items-center whitespace-nowrap rounded-[var(--r-sm)] border-none bg-transparent px-[14px] text-left text-[14px] text-ink hover:bg-sunken aria-[current=page]:bg-accent-soft aria-[current=page]:font-semibold aria-[current=page]:text-accent-ink';

export interface SettingsDialogProps {
  onClose: () => void;
  /** Treffer-Protokoll der Materialtabellen laden. Fehlt, solange kein LV geladen ist. */
  onTrefferProtokoll?: () => void;
}

export function SettingsDialog({ onClose, onTrefferProtokoll }: SettingsDialogProps) {
  const [section, setSection] = useState<SettingsSection>('regeln');
  const dialogRef = useRef<HTMLDivElement>(null);
  // Im ausgelagerten Fenster öffnet der Dialog dort, wo geklickt wurde.
  const host = useHostWindow();
  useDismiss(dialogRef, true, onClose);

  return createPortal(
    <div
      className="nur-bildschirm fixed inset-0 z-[60] flex items-start justify-center bg-[var(--backdrop)] sm:p-[12px] lg:pt-[6vh]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-label="Einstellungen"
        className="ov-window flex h-full w-full flex-col overflow-hidden sm:h-[min(860px,calc(100vh-24px))] lg:h-[min(820px,88vh)] lg:w-[min(1140px,calc(100vw-32px))]"
      >
        <div className="flex h-[56px] shrink-0 items-center border-b border-line pl-[20px] pr-[10px]">
          <b className="flex-1 font-display text-[17px] font-semibold text-ink">Einstellungen</b>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-[40px] cursor-pointer items-center rounded-[var(--r-pill)] border-none bg-accent-fill px-[20px] text-[14px] font-semibold text-white hover:bg-accent-fill-hover"
          >
            Fertig
          </button>
        </div>
        <div className="flex min-h-0 flex-1 flex-col md:flex-row">
          <nav
            aria-label="Rubrik"
            className="flex shrink-0 gap-[2px] overflow-x-auto border-b border-line bg-panel p-[8px] md:w-[220px] md:flex-col md:border-b-0 md:border-r md:p-[10px]"
          >
            {SECTIONS.map((entry) => (
              <button
                key={entry.value}
                type="button"
                aria-current={section === entry.value ? 'page' : undefined}
                onClick={() => setSection(entry.value)}
                className={NAV}
              >
                {entry.label}
              </button>
            ))}
            {section === 'regeln' && onTrefferProtokoll !== undefined && (
              <button
                type="button"
                onClick={onTrefferProtokoll}
                title="Welche Stichworte der Materialtabellen was getroffen haben — gefilterte Positionen"
                className="mt-auto hidden h-[32px] cursor-pointer items-center self-start rounded-[var(--r-pill)] border border-line bg-surface px-[12px] text-[12px] text-dim hover:border-line2 md:inline-flex"
              >
                Treffer-Protokoll (CSV)
              </button>
            )}
          </nav>
          <div className="min-h-0 min-w-0 flex-1 overflow-auto">
            <CloseSettingsContext.Provider value={onClose}>
              {section === 'listen' ? (
                <WordListsTab />
              ) : section === 'farben' ? (
                <PaintNamesTab />
              ) : (
                <RulesTab />
              )}
            </CloseSettingsContext.Provider>
          </div>
        </div>
      </div>
    </div>,
    host.document.body,
  );
}
