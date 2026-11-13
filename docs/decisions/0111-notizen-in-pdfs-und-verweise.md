# 0111 – Notizen an PDF-Stellen und @-Verweise auf Positionen

- **Status:** akzeptiert
- **Datum:** 2026-11-14
- **Betrifft:** `frontend/src/lib/mentions.ts`, `lib/docs/docNotes.ts` (`DocMark.comments`),
  `lib/annotations.ts` (`mentionsOf`, `rekey`), `lib/notesFile.ts`,
  `components/common/MentionInput.tsx`, `components/common/MentionText.tsx`,
  `components/common/NoteBlock.tsx`, `components/docs/DocNoteDialog.tsx`,
  `components/docs/NoteBadge.tsx`, `components/common/PaintBar.tsx`
- **Ergänzt:** 0047 (Kommentare je Position), 0072 (Begleitdokument), 0061/0101
  (Arbeitsstand-Datei)
- **Ausnahme vom Feature-Freeze:** von Nico freigegeben am 13.11.2026

## Worum geht's

- Nico (13.11.2026): Notizen sollen auch in PDFs gehen. In Notizen mit „@“ auf
  LV-Positionen verweisen. Die Notiz erscheint dann auf der Positionskarte.
- Nico (14.11.2026): Notizen hängen an einer markierten Stelle und entstehen über
  Rechtsklick. Auf der Karte eine Liste für eigene und erwähnende Notizen, kein eigener
  Abschnitt „Erwähnt in“.
- Mockup (freigegeben): https://claude.ai/artifact/N5hU5midmbTGo9yzBDHyQ7

## Entscheidung

- **Notiz im PDF:** Text markieren, Rechtsklick (am Tablet: Auswahl ruhen lassen) →
  „Notiz…“. Berührt die Auswahl eine eigene Stelle, kommt die Notiz dorthin. Eine Stelle
  kann mehrere Notizen tragen, mit Zeit, einzeln löschbar. Am Seitenrand zeigt „✎ n“ die
  Notizen; ein Tipp öffnet sie. Stelle nur mit Notiz: gepunktet unterstrichen.
- **@-Verweis:** „@“ tippen oder den Knopf „@“ (fürs Tablet). Vorschläge nach OZ, dann
  Kurztext, aus allen geladenen LVs, höchstens 6. Im Text steht `@[Schlüssel]`, gezeigt
  als Chip mit OZ (und LV-Kennung ab zwei LVs). Tippen springt zur Position. Geht in
  Positions-Kommentaren und PDF-Notizen.
- **Schlüssel:** in der Sitzung die Knoten-ID, im Speicher und in der Arbeitsstand-Datei
  der Positions-Hash (`conocto-pos-v1`), wie alle Notizen (0055). Umschlüsseln an
  denselben Stellen (`rekey`, `notesFileText`, `mergeNotes`).
- **Positionskarte:** Der Verlauf zeigt eigene Einträge und Notizen, die die Position
  erwähnen, in einer Liste nach Zeit. Erwähnende Notizen tragen oben ihre Quelle
  („Datei · S. 4“ oder „Position …“); ein Tipp öffnet die Stelle oder die Position.
- **Erwähnung ist keine Verknüpfung:** Sie ändert weder „Im Dokument“ noch den Graphen
  noch Vorschläge. Verknüpfen bleibt eigene Aktion (0072).
- **Tabelle und Export** zeigen Verweise als „@OZ“.
- **Arbeitsstand-Datei:** Notizen an Stellen unter `dokumentstellen[].notizen`, Verweise
  mit Hash. Kennung und Version bleiben (`conocto-arbeitsstand`, 5); ältere Fassungen
  lassen das neue Feld weg und zeigen Verweise als Text.

## Verworfene Alternativen

- **Abschnitt „Erwähnt in“ auf der Karte:** Nico wollte eine Liste.
- **Erwähnung zählt als Verknüpfung:** vermischt Hinweis und feste Zuordnung.
- **Notiz am ganzen Dokument:** vorerst nicht; Notizen hängen an einer Stelle.
- **Verweis als OZ im Text:** bricht bei Umnummerierung und gleichen OZ in zwei LVs.

## Folgen

- Kein manueller Schritt nötig.
- Ein Verweis auf eine Position eines geschlossenen LV steht als „@?“ da und kommt
  zurück, wenn das LV wieder dazukommt.
