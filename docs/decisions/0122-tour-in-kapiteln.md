# DOC-0122 – Tour in drei Kapiteln, PDF-Teil erst mit PDF

- **Status:** akzeptiert
- **Datum:** 2026-11-21
- **Betrifft:** `frontend/src/components/tour/` (Tour, Schritte), `frontend/src/state/viewState.ts`
  (`tour.until`), `frontend/src/lib/persist/lastLv.ts` (Schlüssel `tour`)
- **Baut auf:** 0098 (Tour gesehen merken), 0116 (Willkommenskarte)
- **Mockup:** https://claude.ai/artifact/Y5ZFkNX4TyNgiT6LGhBP9f

## Worum geht's

- Die Tour zeigte nur das Lesen des LVs (9 Schritte). Alles zu PDFs, Plan messen,
  Betonsorten und Arbeitsliste fehlte.
- Ohne geladenes PDF kann die Tour nicht auf PDF-Stellen zeigen.

## Entscheidung

- **17 Schritte in drei Kapiteln:** 1 „LV lesen“, 2 „Unterlagen verknüpfen“,
  3 „Kalkulieren und abarbeiten“. Die Tour startet immer vorne; jedes Kapitel lässt sich mit
  „Kapitel überspringen ›“ überspringen.
- **Nach dem ersten LV ohne PDF:** Die Willkommenskarte startet nur Kapitel 1. Am Ende
  fragt eine Karte „Unterlagen dazu?“: „PDF hinzufügen…“ öffnet die Dateiwahl und führt danach
  direkt in Kapitel 2. „Später“ schließt sie.
- **Erstes PDF später:** Eine zweite Karte „PDFs sind da“ bietet Kapitel 2 und 3 an.
- **Mit PDF schon beim ersten LV** (Demo-Projekt, gemerktes Projekt): eine Karte für alle drei
  Kapitel.
- **Logo-Menü:** startet immer die ganze Tour. Fehlende Ziele überspringt sie wie bisher.
- **Gemerkt je Teil:** Schlüssel `tour` hält jetzt `{ lv, unterlagen }`. Der alte Wert `true`
  gilt als „Kapitel 1 gesehen“ (lesbar wie 0.66, Entscheidung 0117).
- Ziele weiter nur über `data-tour`; neu: `doc-overview`, `doc-cards`, `doc-page`, `suggest`,
  `units`, `beton`, `measure`. Ein Ziel außerhalb des Bildes holt die Tour per Scrollen herein.
- Anrede in der Tour: „du“.

## Verworfen

- Kapitel einzeln auf der Willkommenskarte wählen (erstes Mockup): man fände Kapitel 2 und 3
  danach nicht mehr.
- Die ganze Tour erst nach einem PDF anbieten: wer nur ein LV öffnet, bekäme keine Hilfe.

## Folgen

- Wer die alte Tour schon gesehen hat, bekommt beim ersten PDF einmal die Karte für
  Kapitel 2 und 3.
- Nichts für den Owner zu tun.
