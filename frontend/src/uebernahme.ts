// Seite `uebernahme.html` der neuen Adresse: nimmt beim Umzug die Daten der alten an
// (Entscheidung neu-doc-eigene-adresse). Läuft unsichtbar in einem iframe.
import { receiveMove } from './lib/persist/umzug';

receiveMove();
