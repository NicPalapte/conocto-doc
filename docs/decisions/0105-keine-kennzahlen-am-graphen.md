# 0105 – Keine Kennzahlen-Karte am Graphen

- **Status:** akzeptiert
- **Datum:** 2026-11-10
- **Betrifft:** `frontend/src/components/shell/GraphStage.tsx` (Kapsel `KpiCapsule` entfernt),
  `components/graph/GraphHeader.tsx`, `components/tour/tourSteps.ts`
- **Ersetzt teilweise:** 0034 (Punkt „Kennzahlen oben links“), 0070 (Kennzahlen-Kapsel)

## Worum geht's

- Oben links auf dem Graphen stand eine Karte mit Positionen, Abschnitten und Hinweisen.
- Nico (10.11.2026): Diese Zahlen stehen im Überblick, das reicht. Die Oberfläche soll
  aufgeräumter sein.

## Entscheidung

- Die Karte entfällt. Kennzahlen stehen nur noch im Überblick.
- Überblick und Prüfung öffnet man über „Ansicht“.
- Die Tour hat keinen Schritt „Kennzahlen“ mehr.

## Folgen

- Mehr Platz für den Graphen, ein Bedienweg weniger.
