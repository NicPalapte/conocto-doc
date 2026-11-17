# DOC-0116 – Tour als Willkommenskarte beim ersten Besuch

- **Status:** akzeptiert
- **Datum:** 2026-11-17
- **Betrifft:** `frontend/src/components/tour/Tour.tsx`
- **Baut auf:** 0098 (Tour gesehen merken)

## Worum geht's

- Das Angebot „Neu hier? Kurze Tour" war eine kleine Zeile unten links und wurde übersehen.
- Im Firmentest (ab 30.11.2026) sollen neue Nutzer ohne Schulung zurechtkommen.

## Entscheidung

- Beim ersten Besuch (Merker aus 0098 fehlt) erscheint nach dem ersten LV eine
  Willkommenskarte in der Mitte. Der Rest ist abgedunkelt wie bei der Tour selbst.
- Zwei Knöpfe, 44 px hoch (Touch): „Tour starten" und „Später".
- „Später", Escape oder ein Tipp neben die Karte schließen sie. Danach bleibt die Tour im
  Logo-Menü unter „Hilfe & Feedback".
- Gemerkt wird wie bisher (0098), sie kommt also nur einmal je Browser.

## Verworfen

- Größere Leiste unten Mitte ohne Abdunkeln plus Puls am Logo (Mockup-Variante B): stört
  weniger, wird aber leichter übersehen.

## Folgen

- Beim ersten Laden sind Graph und Tasten bis zur Antwort auf die Karte gesperrt.
- Nichts für den Owner zu tun.
