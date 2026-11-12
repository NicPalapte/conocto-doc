# 0109 – Einstellungen statt Admin-Werkzeuge: Regeln für alle

- **Status:** akzeptiert
- **Datum:** 2026-11-12
- **Betrifft:** `frontend/src/components/settings/` (vorher `components/admin/` und
  `components/layout/AdminDialog.tsx`), `frontend/src/state/rules.tsx` (vorher
  `state/admin.tsx`, `useAdmin` → `useRules`), `components/layout/AboutMenu.tsx`,
  `components/layout/TopBar.tsx`, `components/common/PositionDetails.tsx`
- **Ersetzt teilweise:** 0053 (Passwort für gelernte Begriffe), Ort des Regeleditors aus 0081
- **Ausnahme vom Feature-Freeze:** von Nico freigegeben am 12.11.2026

## Worum geht's

- Der Regeleditor lag hinter einem Passwort in den „Admin-Werkzeugen“.
- Nico (12.11.2026): Er soll ganz normal in die App. Regeln sind Konfiguration, kein
  Arbeitsbereich: Zugang oben unter dem Logo, als Overlay über der App.
- Plan: https://claude.ai/artifact/7poLEMaYQ2F5zP8Bk6h9YL ·
  Mockup: https://claude.ai/artifact/8NvGVrRYuo9pNHJfjKbBUU (beide freigegeben).

## Entscheidung

- Logo-Menü → **„Einstellungen“** öffnet ein Overlay. Rubriken:
  „Hervorhebung & Regeln“ (Regeleditor), „Wortlisten“, „Markierfarben“ (die sechs Namen).
- **Kein Passwort** mehr, keine Admin-Plakette neben dem Logo.
- „Begriff lernen…“ und „Als Regel…“ im Menü zur Textauswahl für alle.
  „Als Regel…“ öffnet die Einstellungen bei der neuen Regel.
- Ein Klick auf einen Treffer schließt das Overlay und wählt die Position.
- Das Treffer-Protokoll (CSV) bleibt ein kleiner Knopf in „Hervorhebung & Regeln“.
- Speicher, Regelformat `conocto-rule-v1`, Grundstock und Import/Export bleiben wie in 0081,
  0089, 0090. Bestehende eigene Regeln und Wortlisten bleiben erhalten.

## Verworfene Alternativen

- **Eigener Bereich „Regeln“ im Splitscreen:** Treffer stünden neben dem Graphen. Verworfen
  (Nico): Konfiguration gehört nicht zwischen die Arbeitsbereiche.
- **Passwort behalten:** Es war nur Sichtschutz (0053) und versteckte eine Funktion, die
  jeder Kalkulator braucht.

## Folgen

- Jeder Nutzer kann eigene Regeln anlegen und Grundstock-Regeln abschalten, nur im eigenen
  Browser.
- Owner: nichts zu tun. Das Passwort ist weg, `ADMIN_PASSWORD_SHA256` gibt es nicht mehr.
- Anleitung: [`../setup/regeln.md`](../setup/regeln.md) (vorher `admin-werkzeuge.md`).
- Bedienung mit Finger am Tablet (Knopf an der Textauswahl, größere Tippflächen) folgt in einem
  zweiten Schritt.
