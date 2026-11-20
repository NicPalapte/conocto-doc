import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// Conocto-Designsystem (Entscheidung 0076): Schriften selbst gehostet statt Google Fonts,
// Tokens als CSS-Variablen (hell/dunkel), Grundstil der Bausteine. Vor index.css,
// damit App-eigene Regeln gewinnen.
import '@conocto/design/fonts';
import '@conocto/design/tokens.css';
import '@conocto/design/styles.css';
import './index.css';
import App from './App.tsx';
import { countPageview } from './lib/usage/count';
import { moveAndRedirect, moveTarget } from './lib/persist/umzug';

// Unter der alten Adresse startet der Viewer nicht, er zieht um (Entscheidung
// 0121).
const target = moveTarget(window.location, import.meta.env.VITE_NUR_UMZUG === '1');
if (target !== null) {
  document.getElementById('root')!.textContent = 'Conocto zieht um nach doc.conocto.app …';
  void moveAndRedirect(target);
} else {
  countPageview();
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
