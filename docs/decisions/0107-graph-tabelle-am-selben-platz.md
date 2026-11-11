# 0107 – Graph und Tabelle am selben Platz wechseln (Taste T)

- **Status:** akzeptiert
- **Datum:** 2026-11-10
- **Betrifft:** `frontend/src/state/viewState.ts` (`switchGraphTable`, Aktion
  `switchGraphTable`), `components/layout/TopBar.tsx` (Taste T),
  `components/common/PositionMenu.tsx`, `lib/graph/layoutMap.ts` (`hideEmpty`)
- **Ergänzt:** 0064, 0070, 0074 (Splitscreen), 0035 / 0059 (Matrix)
- **Anlass:** Issue #191, Praxistest Runde 3; Ausnahme vom Feature-Freeze (Nico, 10.11.2026)

## Worum geht's

- Nico will schnell zwischen Graph und Tabelle wechseln, ohne dass ein zweiter Bereich aufgeht.
  Die gewählte Position soll gewählt bleiben.
- In der Matrix stören Positionen „ohne Angabe“, wenn man nur die mit Wert sehen will.

## Entscheidung

- **Taste T** wechselt am Platz des Graphen zur Tabelle, noch einmal T zurück.
  - Ist die Tabelle zu, legt sie sich als Reiter auf den Platz des Graphen.
  - Liegen beide im selben Stapel, kommt der andere Reiter nach vorn.
  - Sind beide an verschiedenen Plätzen offen, tauschen sie die Plätze.
  - Nur im Hauptfenster, nicht beim Tippen in ein Feld, nicht mit Strg/Alt/⌘.
- **Rechtsklick:** je Richtung ein Eintrag (Nico, 11.11.: zwei Einträge machten dasselbe).
  - Im Graphen „In der Tabelle zeigen“: Ist die Tabelle schon zu sehen, wählt er nur aus.
    Sonst tritt die Tabelle an den Platz des Graphen, wie mit T.
  - In der Tabelle „Im Graph zeigen“: entsprechend.
  - Verworfen: eigene Einträge „Zur Tabelle wechseln“ / „Zum Graphen wechseln“.
- Kein zweiter Fenster-Modus: Der Wechsel ist nur eine Änderung der Anordnung
  (`view.workspace`). Filter, Suche und Auswahl bleiben unberührt.
- **Matrix:** Schalter „Ohne Angabe: zeigen / ausblenden“ in der Darstellung, ein Schalter für
  Zeile und Spalte zusammen. Er ändert nur das Bild im Graphen, nie den Filter. Tabelle und
  Überblick zählen weiter alle Positionen. Nicht gespeichert.

## Verworfen

- Strg/⌘-Kombination für den Wechsel: meist vom Browser belegt.
- „ohne Angabe“ als Filter: würde Tabelle und Überblick mitändern (ein Filterzustand für alle).

## Folgen

- Neues Kürzel in „Tastenkürzel“ (Logo-Menü oder „?“).
- Die Anordnung nach dem Wechsel wird wie jede Anordnung gemerkt (0073).
