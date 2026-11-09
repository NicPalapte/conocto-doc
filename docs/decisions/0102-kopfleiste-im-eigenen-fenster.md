# 0102 – Ganze Kopfleiste im eigenen Fenster

- **Status:** akzeptiert
- **Datum:** 2026-11-09
- **Betrifft:** `frontend/src/components/shell/PopoutHead.tsx` (vorher `PopoutSearch.tsx`),
  `TopBar.tsx`, `SearchPill.tsx`, Dialoge (`ReportDialog`, `AdminDialog`, `ShortcutsDialog`,
  `NotesImportDialog`)
- **Ergänzt:** 0039 (Tabelle im eigenen Fenster), 0072 (Dokument im eigenen Fenster)

## Worum geht's

- Graph, Tabelle und Dokument lassen sich in ein eigenes Browserfenster legen. Dort gab es
  bisher nur die Suchleiste (Graph, Tabelle) oder gar keine (Dokument).
- Nico will auf dem zweiten Bildschirm denselben Kopf wie im Hauptfenster (08.11.2026).
  Erster Schritt zur globalen Suche über LV und PDFs (Plan und Mockup am 09.11. freigegeben).
  Feature-Freeze: als Verbesserung freigegeben.

## Entscheidung

- **Ganzer Kopf in jedem ausgelagerten Fenster:** Logo-Menü, Suchleiste mit Filter-Chips,
  „Ansicht“, „LV schließen“. Gleicher Suchbegriff, gleiche Filter, gleiche Auswahl.
- **Nur ausgelagert:** Im Hauptfenster bleibt es bei einem Kopf über dem Splitscreen.
- **Eigene Filterleiste je Fenster** (wie bisher): Aufklappen im einen Fenster klappt sie im
  anderen nicht mit auf.
- **„Ansicht“ ordnet immer das Hauptfenster.**
- **Dialoge öffnen im Fenster, in dem man klickt** (Fehler melden, Tastenkürzel, Admin,
  Arbeitsstand laden). Der Regeleditor aus „Als Regel…“ öffnet nur im Hauptfenster.
- **Tour und Kurzumfrage** stehen im ausgelagerten Logo-Menü nicht: sie laufen im
  Hauptfenster.
- **Sehr schmales Fenster (unter 560 px):** Die Suche ist nur eine Lupe. Sie fährt beim
  Darüberfahren mit der Maus über die Kopfleiste aus, am Tablet beim Antippen. Sie klappt
  wieder ein, wenn Maus und Fokus das Feld verlassen.

## Verworfene Alternativen

- **Nur die Suchleiste im Fenster (bisher):** Menü und „Ansicht“ fehlten auf dem zweiten
  Bildschirm.
- **Kopf auch im Splitscreen je Bereich:** zu voll, ein Kopf genügt dort.

## Folgen

- Für den Owner gibt es nichts einmalig zu tun.
