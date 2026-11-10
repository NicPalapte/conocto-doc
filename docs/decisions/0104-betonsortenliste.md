# 0104 – Betonsortenliste im Überblick

- **Status:** akzeptiert
- **Datum:** 2026-11-10
- **Betrifft:** `frontend/src/lib/beton/sorten.ts`, `components/overview/BetonSortenCard.tsx`,
  `lib/export/betonSorten.ts`, `lib/classify/rulesets/normklassen.ts`, `lib/facets.ts`
  (Facette `betonsorte`), `docs/domain/reference/material/beton.csv` (Merkmal „Stahl/Fasern“)

## Worum geht's

- Nico will Beton besser auswerten (10.11.2026): eine Betonsortenliste, die nicht streng nach
  Norm sein muss, aber die Angaben nach DIN 1045-2 prüft. Mockup am 10.11. freigegeben.
- Neue Funktion trotz Feature-Freeze: Ausnahme von Nico am 10.11. freigegeben.
- Zweiter Schritt (eigener PR): Vorschläge im Dokument über Betonklassen, Angaben nur im
  Dokument in der Liste als „fehlt im LV“.

## Entscheidung

- **Sorte = Druckfestigkeitsklasse + Expositionsklassen + Feuchtigkeitsklasse**, so wie sie im
  Text stehen. Betonpositionen in m³ ohne Festigkeitsklasse bilden „Ohne Festigkeitsklasse“;
  andere ohne Klasse (Schalung, Fugen) zählen nicht.
- **Geprüfte Angaben** (DIN EN 206 / DIN 1045-2, Festlegung des Betons): Festigkeits-,
  Expositions-, Feuchtigkeits- und Chloridgehaltsklasse, Größtkorn, Konsistenz.
  Fehlt eine, ist das ein Hinweis in amber, kein Urteil. Keine Prüfregel, weil eine Angabe
  oft in Vorbemerkungen oder der Baubeschreibung steht.
- **Nichts ableiten.** Überwachungsklasse und Bewehrung („enthalten“, „gesondert“) zeigt die
  Liste nicht. Nur eine Angabe Stahl / Matten / Fasern aus der Materialtabelle (Nico, 10.11.).
- **Chlorid, Konsistenz, Größtkorn** werden nur gelesen, wenn eine Betonklasse daneben steht:
  „F3“ oder „GK 16“ allein meinen in anderen Gewerken etwas anderes. Setzmaß (S1–S5) und
  Verdichtungsmaß (C0–C4) nur direkt nach „Konsistenz“.
- **Klick auf eine Sorte filtert** über die neue Facette `betonsorte`. Aufgeklappt ist die
  Sorte, nach der gefiltert wird; kein eigener Zustand. Ein Filterzustand für alle Bereiche.
- **Ort:** Karte im Überblick, nur wenn das LV Beton enthält. Kein eigener Bereich.

## Verworfen

- Eigener Bereich „Beton“ im Splitscreen: mehr Bedienung, gleicher Nutzen wie die Karte.
- Fehlende Angaben als Prüfregel: zu viele Hinweise, wenn die Angaben zentral in den
  Vorbemerkungen stehen.

## Folgen

- Die Merkmale der neuen Spalte „Stahl/Fasern“ in `beton.csv` sind ein Entwurf. Nico prüft
  die Stichwörter.
- Die Filterleiste zeigt unter Beton zusätzlich „Sorte“.
