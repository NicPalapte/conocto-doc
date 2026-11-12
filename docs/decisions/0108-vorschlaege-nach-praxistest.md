# 0108 – Vorschläge im Dokument nach dem Praxistest: strengere OZ, Kurztext, Leiste an der Stelle

- **Status:** akzeptiert
- **Datum:** 2026-11-12
- **Betrifft:** `frontend/src/lib/docs/docSuggest.ts` (`findOz`, `isHeading`, `findText`,
  `suggestMatchOf`), `lib/docs/suggestRules.ts`, `lib/docs/suggestPlace.ts`,
  `components/docs/SuggestBar.tsx`, `components/docs/DocumentsProvider.tsx` (`offered`),
  `components/common/PositionDetails.tsx`, `components/common/Highlighted.tsx`,
  Grundstock-Regel `pdf-text` in `docs/domain/reference/regeln.json`
- **Baut auf:** 0080 (Vorschläge im Dokument), 0087 (Vorschläge als Regeln), 0106 (Beton)

## Worum geht's

- Praxistest mit echten Unterlagen (Nico, 12.11.2026): von 11 Vorschlägen war einer richtig.
  Die übrigen waren Kapitelnummern der Baubeschreibung („1.2.10“), die als OZ galten.
- Im LV stehen die OZ mit führenden Nullen („01.02.0010“), die Kapitel ohne.
- Wunsch: genaue Textübereinstimmung statt Nummern; die Leiste soll an der markierten Stelle
  stehen; die Positionskarte soll zeigen, was übereinstimmt.

## Entscheidung

- **OZ strenger:** Ohne „Pos.“ oder „OZ“ davor zählt eine Nummer nur in der Schreibweise des
  LV (gleiche führende Nullen). Steht sie am Zeilenanfang und folgt ein Titel ohne Wort aus
  dem Kurztext der Position, ist sie eine Kapitelnummer: kein Vorschlag. Mit Kontextwort
  bleibt alles wie bisher.
- **Neue Art „Kurztext“:** Steht der Kurztext einer Position wörtlich im PDF, gibt es einen
  Vorschlag. Groß/klein, Satzzeichen, Zeilenumbrüche und Umlaute („ä“ = „ae“) zählen nicht.
  Nur Kurztexte mit mindestens zwei Wörtern, einem eigenen Wort und mindestens
  `kleinste-laenge` Zeichen (12), die genau eine Position hat. An einer Stelle gilt der
  längste. Grundstock-Regel `pdf-text` (eingebaut `text-im-pdf`), abschaltbar.
- Steht an der Stelle schon ein Vorschlag zur selben Position (OZ samt Zeile, Menge, Beton),
  gibt es keinen zweiten über den Kurztext.
- **Leiste an der Stelle:** Die Leiste steht rechts neben der markierten Stelle, sonst
  darunter, darüber oder links, immer im Fenster. Sie folgt beim Blättern, Scrollen und Zoomen.
- **Positionskarte:** Solange die Leiste offen ist, sind in der Karte der vorgeschlagenen
  Position die passenden Teile grün gestrichelt umrandet: OZ, Menge, Kurztext, gemeinsame
  Wörter, Betonklassen. Nur Anzeige, nichts wird gespeichert.
- Gestrichelte Linie der Kurztext-Vorschläge in `--greenD`.

## Verworfen

- Inhaltliches oder unscharfes Matching (ähnliche Wörter, Teilsätze): wäre Deutung, nicht
  Abgleich (0080).
- Kapitelnummern über die Seitenstruktur (Schriftgröße) erkennen: braucht mehr aus PDF.js
  und bleibt unsicher; Schreibweise + Zeilenanfang reichen für den Befund.

## Folgen

- OZ ohne führende Nullen im Fließtext („siehe 1.2.40“) brauchen jetzt „Pos.“ davor, wenn
  das LV Nullen schreibt.
- Alte Notizdateien bleiben gültig; die neue Herkunft `text` lesen ältere Versionen nicht.
