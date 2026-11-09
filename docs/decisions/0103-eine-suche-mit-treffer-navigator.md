# 0103 – Eine Suche für LV und PDFs mit Treffer-Navigator

- **Status:** akzeptiert
- **Datum:** 2026-11-09
- **Betrifft:** `packages/core/src/text/searchKey.ts`, `frontend/src/components/search/`
  (`SearchNav.tsx`, `SearchSources.tsx`), `SearchPill.tsx`, `DocumentsProvider.tsx`,
  `DocumentView.tsx`, `lib/matchPos.ts`, `lib/docs/docSearch.ts`, `Highlighted.tsx`,
  `lib/searchSnippet.ts`; entfernt: `components/docs/DocSearchField.tsx`
- **Ersetzt:** 0084 (eigene Suche im PDF)

## Worum geht's

- Nico will die Suche doch global (08.11.2026): ein Begriff für LV und alle PDFs, Treffer
  hervorgehoben, vor/zurück, Sprung zwischen Dokumenten, Standard = Dokument, in dem man
  gerade arbeitet. Plan und Mockup (Variante E) am 09.11. freigegeben, als Verbesserung trotz
  Feature-Freeze.
- PDF.js hängt Zeilen ohne Leerzeichen aneinander („14Monate“), getrennte Wörter
  („Stahl-“ / „beton“) fand die Suche nicht.

## Entscheidung

- **Eine Suchleiste für alles.** Der Begriff filtert das LV wie bisher (0058) und sucht in
  allen offenen PDFs. Das eigene Suchfeld im Dokument fällt weg. **PDF-Treffer filtern das
  LV nie.**
- **Treffer-Navigator in der Suchleiste:** „4 / 9 ▾“ und ▲ ▼ (auch ↓ ↑ und Enter /
  Umschalt + Enter).
  - LV: ein Treffer = eine Position, in LV-Reihenfolge. Ein Schritt wählt sie; Tabelle
    scrollt hin, der Graph holt sie ins Bild, die Positionskarte zeigt sie.
  - PDF: ein Treffer = eine Fundstelle. Ein Schritt springt genau dorthin.
- **Quellen-Liste unter der Suchleiste** (Mockup E): je Quelle Name (gekürzt, ganz im
  Tooltip), Trefferzahl und ein Ausschnitt. Klappt beim Tippen oder Antippen der Zählung auf,
  zu mit Esc oder Klick daneben. Antippen springt in die Quelle und öffnet bei einem PDF das
  Dokument.
- **Standard-Quelle = zuletzt bearbeiteter Bereich.** Klick oder Fokus im Dokument ⇒ das
  gezeigte PDF; in Graph, Tabelle, Position, Überblick, Prüfung ⇒ LV. Wird nicht gespeichert.
- **Jedes ausgelagerte Fenster hat seine feste Quelle:** im Dokument-Fenster das PDF, in
  Graph und Tabelle das LV. So springt man in zwei Fenstern parallel (Nico, 09.11.).
- **Ende einer Quelle:** ▼ beginnt dort wieder vorn; darunter „Weiter in: … (n)“. Nichts
  springt von selbst ins nächste Dokument. Im ausgelagerten Fenster steht der Hinweis nur dort,
  und nur auf Quellen derselben Art (im Dokument-Fenster das nächste PDF).
- **Treffer sichtbar über eigenen Farben:** Im Langtext rahmt der Akzent den Treffer, im PDF
  liegt der Treffer über den Anstreichungen.
- **Eine Suchregel überall** (Suchschlüssel im Kern): ohne Groß/klein, ohne Leerraum, ohne
  weiches Trennzeichen und ohne Trennstrich am Zeilenende. „C 25/30“ findet „C25/30“.
  Der Seitentext bleibt unverändert, gespeicherte Stellen verschieben sich nicht.
- **Strg F** holt die Suchleiste im ausgelagerten Fenster immer, im Hauptfenster, wenn zuletzt
  im Dokument gearbeitet wurde.
- **Menü beim Markieren:** nur noch „In Suche übernehmen“ (LV-Text und PDF).

## Verworfene Alternativen

- **Quellen-Schalter in der Suchleiste** (Mockup A): zu eng, Dokumentnamen hätten stark
  gekürzt werden müssen (Nico, 09.11.).
- **Automatisch ins nächste Dokument springen:** man verliert die Orientierung.
- **Seitentext mit Leerzeichen an Zeilenenden neu bauen:** hätte gespeicherte Stellen
  verschoben.

## Folgen

- Für den Owner gibt es nichts einmalig zu tun.
- Wer im LV „C 25“ sucht, findet jetzt mehr als vorher (Leerraum zählt nicht).
- Später denkbar (Nico): Trefferliste im Dokument zeigen. Vorerst nicht: ↓ ↑ und die
  Quellen-Liste genügen.
