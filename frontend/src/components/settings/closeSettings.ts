// Schließt die Einstellungen (Entscheidung 0109). Ein Sprung zu einer Position aus der
// Treffer-Vorschau schließt das Overlay, sonst läge es über der gewählten Position.
// Außerhalb des Overlays (Tests einzelner Reiter) tut es nichts.

import { createContext, useContext } from 'react';

export const CloseSettingsContext = createContext<() => void>(() => undefined);

export function useCloseSettings(): () => void {
  return useContext(CloseSettingsContext);
}
