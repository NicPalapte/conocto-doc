# 0110 – Mehrere LVs gleichzeitig laden

- **Status:** akzeptiert
- **Datum:** 2026-11-13
- **Betrifft:** `frontend/src/lib/tree/buildTree.ts` (`buildTreeOfParts`),
  `lib/pipeline/runPipeline.ts` (`classifyAndBuildParts`, `LoadedLV.files`),
  `lib/pipeline/loadLv.ts` (`loadLvsFromBytes`), `components/docs/LvFilesProvider.tsx`,
  `components/docs/LvList.tsx`, `lib/persist/lastLv.ts`, `lib/persist/project.ts`,
  `lib/facets.ts` (Facette `lv`), `lib/graph/layoutMap.ts` (Insel je LV),
  `components/layout/AboutMenu.tsx`
- **Ergänzt:** 0046 und 0047 (gespeichert wird das ganze Projekt), 0072 (ein Menüpunkt für
  PDF und LV), Out-of-Scope „mehrere Dateien gleichzeitig“ in `docs/scope.md`
- **Ausnahme vom Feature-Freeze:** von Nico freigegeben am 11.11.2026 (einzige bis zum
  Start am 11.01.2027)

## Worum geht's

- Nico (11.11.2026): mehrere LVs schon in der Beta. Der Bereich „Dokument“ zeigt alle
  Dokumente, auch die LVs.
- Nico (13.11.2026): Der Bereich „Dokument“ ist die Verwaltung. Dort LVs und PDFs
  hinzufügen und entfernen, gemischt; die App erkennt die Art selbst. Ein Menüpunkt
  „Dokument hinzufügen…“ für beides. Je LV eine Insel im Graphen. „LV“ als Filter und als
  Achse der Matrix.
- Mockup (freigegeben): https://claude.ai/artifact/2ETtqPne1d8r5iMai9ogSS

## Entscheidung

- **Laden:** Startseite, „Dokument hinzufügen…“ im Logo-Menü, „+ Hinzufügen“ im Bereich
  „Dokument“ und Ablegen auf der App nehmen PDF und GAEB gemischt. Die Endung entscheidet.
  Eine kaputte Datei bricht die anderen nicht ab, sie steht als Hinweis da. Die gleiche
  Datei zweimal wird erkannt (Datei-ID) und nur einmal geladen.
- **Kennung:** jedes LV heißt „LV1“, „LV2“ … (kleinste freie Zahl). Sie bleibt, wenn ein
  anderes LV geschlossen wird.
- **Baum:** Projekt → je LV ein Knoten `file` → Lose → Abschnitte → Positionen. Mit nur
  einem LV gibt es den Knoten nicht, alles bleibt wie bisher.
- **Positionen** tragen ihre Kennung (`PositionSummary.lv`). Daraus: Facette „LV“ in der
  Filterleiste, Achse „LV“ in der Matrix, Kennzeichen „LV2“ in Positionskarte, Tabelle und
  Suchtreffern.
- **Graph „nach LV“:** um jedes LV eine eigene Insel (durchgezogene Linie), darin Lose und
  Hauptabschnitte wie bisher.
- **Bereich „Dokument“:** jedes LV ist eine Karte unter der Kategorie „LV“, neben den PDFs
  (Nico, 13.11.2026: LVs ganz normal als Dokumente). Bei Sortierung nach Art steht sie bei
  PDFs der Art „LV“, sonst als eigene Gruppe vorn. Antippen blendet ein LV ein oder aus (das
  ist die Facette „LV“, also auch Tabelle und Suche). Der Papierkorb schließt ein LV. Das
  letzte LV bleibt, dafür gibt es „Anderes LV öffnen“. Keine Lesefassung, nur ein Symbol.
- **Prüfung, Beziehungen, Betonsorten, Summen** rechnen über alle LVs zusammen. Ein LV
  dazu oder weg rechnet den Baum neu (wie beim Laden, im Worker ab 500 Positionen).
- **Notizen:** Schlüssel bleibt der Positions-Hash. Die Hashes werden über alle LVs in
  einem Lauf gebildet: eine gleiche Position im zweiten LV bekommt „-2“ und damit eigene
  Notizen. Schließt man ein LV, bleiben seine Notizen gespeichert und kommen zurück, wenn
  das LV wieder dazukommt.
- **Speichern:** das ganze Projekt bleibt in der IndexedDB (alle Bytes, Notizen). Das erste
  LV wie bisher unter `bytes`, die übrigen unter `weitereLvs`, die Liste in `meta.files`.
  Ältere Einträge mit einer Datei lesen sich als „LV1“.
- **Hinweis, kein Stopp:** ab 8 LVs oder 10.000 Positionen zusammen steht ein Hinweis,
  dass die App langsamer werden kann.
- **Offene PDFs bleiben**, wenn ein LV dazukommt oder geht; ebenso Filter, Auswahl und
  Ansicht. Ein neues Projekt (Startseite) schließt wie bisher alles.

## Verworfene Alternativen

- **Notizen je LV getrennt über Datei-ID + Hash:** neues Speicherformat und alle
  Notiz-Wege doppelt. Verworfen; Hash über alle LVs löst es ohne neues Format.
- **Gleiche Position teilt Notizen über LVs hinweg** (Vorschlag vom 13.11.): bräuchte eine
  Notiz an mehreren Knoten zugleich. Verworfen zugunsten getrennter Notizen, weil zwei LVs
  meist verschiedene Lose oder Gewerke sind.
- **Eigenes Fenster „Projekt“ zur Verwaltung:** Nico wollte kein Extra-Fenster.
- **Lose zu LVs umdeuten (Knotenart `lot`):** hätte Lose in Losen ergeben.
- **Versionsvergleich, x83+x84 zusammenführen:** bleibt draußen. Jedes LV steht für sich.

## Folgen

- Kein manueller Schritt nötig.
- Randfall: Stehen zwei gleiche Positionen in LV1 und LV2 und LV1 wird geschlossen, rückt
  die Position aus LV2 auf den Hash ohne „-2“ und zeigt dann die Notizen der Position aus
  LV1. Selten, weil gleiche Positionen in zwei LVs selten sind.
- Teilbare Links nennen die Datei-ID des LV, aus dem die Position stammt.
