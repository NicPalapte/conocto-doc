# DOC-0115 – Zählung und Kurzumfrage für den Firmentest aus

- **Status:** akzeptiert
- **Datum:** 2026-11-17
- **Betrifft:** `frontend/.env.production`, `frontend/src/lib/survey.ts` (`surveyOn`),
  `frontend/src/state/survey.tsx`, `frontend/src/components/layout/TopBar.tsx`
- **Baut auf:** 0056 (Nutzungszählung), 0071 (Kurzumfrage)

## Worum geht's

- Erster Test läuft intern in einer Baufirma (30.11.–18.12.2026). Nutzungszahlen und
  Umfrage-Antworten braucht der Owner dafür nicht. Rückmeldung kommt direkt.

## Entscheidung

- GoatCounter aus: `VITE_USAGE_COUNT=0` in `frontend/.env.production`. Kein Zähl-Aufruf mehr.
- Kurzumfrage aus: neuer Schalter `VITE_UMFRAGE=0`. Sie erscheint nicht nach 4 Minuten,
  „Feedback geben" fehlt im Logo-Menü.
- Code bleibt. Wieder an: beide Zeilen auf `1` setzen (bei `VITE_UMFRAGE` reicht auch Löschen).
- „Fehler melden" bleibt: es schickt nichts von selbst.

## Verworfen

- Code löschen: später wäre die Wiederaufnahme ein großer PR statt zwei Zeilen.

## Folgen

- Die Datenschutzerklärung (Issue #76) muss GoatCounter nicht nennen, solange die Zählung aus
  ist. Vor dem Wiedereinschalten muss sie es tun (0056).
- Owner: vor dem öffentlichen Start entscheiden, ob beides wieder an soll.
