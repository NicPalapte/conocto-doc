# DOC-0114 – PDF-Linien nur im Fokus, Matrix nach Dokument

- **Status:** akzeptiert
- **Datum:** 2026-11-17
- **Betrifft:** `frontend/src/components/graph/BubbleGraph.tsx` (Linien, Zahl am Kreis,
  Kartenauswahl), `frontend/src/lib/docs/docGraph.ts` (`docLinksOf`, `cardsTouching`),
  `frontend/src/lib/graph/layoutMap.ts` (`DOC_AXIS`, `DOC_KIND_AXIS`, `DocLinks`),
  `frontend/src/components/filter/DisplayControls.tsx`
- **Ersetzt teilweise:** 0097 (dort liefen in Ruhe Linien von jeder verknüpften Position)
- **Ergänzt:** 0059 (Matrix als Kacheln), 0075 (Abschnitt hervorheben), 0096 (Dokumentart)
- **Ausnahme vom Feature-Freeze:** von Nico beauftragt am 17.11.2026

## Worum geht's

- Mit vielen PDFs wird der Graph unübersichtlich. Im Demo-Projekt (3 LVs, 26 PDFs,
  203 Verknüpfungen) liefen über 200 Linien; die Kartenspalte scrollt, viele Linien liefen
  aus dem Bild.
- Mockup mit vier Varianten: https://claude.ai/artifact/AjRKEsER9Cq4rNHnYH5f3h
- Nico (17.11.2026): Variante B „Fokus“ als Standard, die Matrix um Dokumente erweitern.
  Den Nähe-Modus (PDFs als Knoten neben den Inseln) später, Issue #246.

## Entscheidung

- **In Ruhe keine Linien.** Linien laufen nur für
  - das hervorgehobene PDF (Kopf der Karte antippen),
  - die gewählte Position,
  - den hervorgehobenen Abschnitt (0075).
- **Zahl am Kreis:** Jeder Abschnitt (in der Matrix jede Gruppe) mit verknüpften Positionen
  trägt oben rechts eine cyanfarbene Zahl: wie viele seiner Positionen verknüpft sind. Die
  Zahl am einzelnen Punkt (0097) bleibt.
- **Abschnitt hervorgehoben:** Die Kartenspalte zeigt nur die PDFs mit Bezug zu ihm.
- **Matrix nach Dokument:** zwei neue Achsen, als Zeile oder Spalte wählbar, sobald eine
  Stelle verknüpft ist:
  - „Dokument“: je PDF ein Wert, in Kartenreihenfolge.
  - „Dokumentart“: Art nach 0096 (von Hand gewählt vor erkannt), sonst „nicht erkannt“.
- **Jeder Punkt genau einmal:** Eine Position mit mehreren PDFs steht unter „mehrere PDFs“,
  mit mehreren Arten unter „mehrere Arten“. Ohne Verknüpfung: „ohne Angabe“. So bleibt die
  Regel der Matrix (ein Wert je Position, `AXIS_FACETS`) erhalten und jede Zahl stimmt.
- Die Lage des Graphen hängt nur dann an den Verknüpfungen, wenn eine Dokument-Achse gewählt
  ist. Sonst passt eine neue Verknüpfung den Graphen nicht neu ein.

## Verworfene Alternativen

- **Bündeln (Mockup A):** eine dicke Linie je LV und Dokumentart mit Zahl. Ruhiger als
  heute, aber immer noch Linien quer über den Graphen.
- **Nähe (Mockup C):** PDFs als Knoten an den Inseln. Gewollt, aber eher für Pläne mit
  klarem Abschnittsbezug; ab ca. 50 PDFs eng. Vorgemerkt in Issue #246.
- **Position beim ersten PDF einsortieren:** Spalten wirkten voller, aber eine Position mit
  zwei PDFs fehlte beim zweiten. Zahlen wären zu niedrig.

## Folgen

- Wer den Zusammenhang sehen will, tippt an: PDF, Position oder Abschnitt.
- Lücken („Abschnitt ohne Gutachten“) zeigt die Matrix Abschnitt × Dokumentart ohne Linien.
- Bei sehr vielen PDFs werden die Spalten „Dokument“ breit; dann hilft „Dokumentart“.
