# 0106 – Beton im Dokument: Vorschläge über Betonsorten

- **Status:** akzeptiert
- **Datum:** 2026-11-10
- **Betrifft:** `frontend/src/lib/docs/docSuggest.ts` (`findBeton`, Art `beton`),
  `lib/docs/suggestRules.ts`, `lib/beton/sorteKey.ts`, `lib/beton/sorten.ts`
  (`imDokument`), `components/docs/SuggestBar.tsx`, `components/overview/BetonSortenCard.tsx`,
  Grundstock-Regel `pdf-beton` in `docs/domain/reference/regeln.json`
- **Baut auf:** 0080 (Vorschläge im Dokument), 0087 (Vorschläge als Regeln), 0104
  (Betonsortenliste)

## Worum geht's

- Zweiter Schritt der Betonauswertung (Nico, 10.11.2026; Mockup freigegeben, Ausnahme vom
  Feature-Freeze ebenso).
- In Baubeschreibungen stehen Betonsorten oft als Tabelle: Bauteil, Festigkeit, Klassen.
  Diese Stellen sollen zur passenden Position führen.
- Angaben, die nur im Dokument stehen (etwa die Konsistenz), sollen in der Betonsortenliste
  sichtbar werden.

## Entscheidung

- **Neue Art von Vorschlag „Beton“** neben OZ und Menge, gleiche Regeln wie dort: nur
  Vorschlag, gilt erst nach Klick, „Nein“ wird gemerkt, eigener Schalter im Dokument.
- **Gleiche Sorte, wörtlich:** Festigkeitsklasse und die Klassen direkt dahinter ergeben
  die Sorte wie im LV („C30/37 · XC4, XF1 · WF“). Nur genau gleiche Sorten zählen, nichts
  wird ergänzt.
- **Eindeutig oder über Wörter:** Hat nur eine Position die Sorte, ist es diese. Sonst
  entscheiden eigene Wörter aus dem Kurztext, erst vor der Klasse (Tabellenzeile), dann
  dahinter. Ohne eigenes Wort: kein Vorschlag.
- **Grundstock-Regel `pdf-beton`** (eingebaut `beton-im-pdf`), abschaltbar. Parameter
  `hoechstens-positionen` (3): Passen mehr Positionen, gibt es keinen Vorschlag.
- **„Alle N“** in der Leiste filtert nach der Sorte (Facette `betonsorte`), nur auf Klick.
- **„fehlt im LV“:** Fehlt einer Betonposition eine Angabe im LV, steht sie aber in einer
  verknüpften Stelle, zeigt die Liste sie farbig (`--cat-6`) mit „fehlt im LV“. Gilt für jede
  verknüpfte Stelle, ob von Hand oder aus einem Vorschlag. Die Angabe zählt weiter als
  fehlend im LV.
- Gestrichelte Linie für Beton-Vorschläge in `--cyan`, damit sie sich von OZ (Akzent) und
  Menge (amber) abhebt.

## Verworfen

- Sorte mit Teilübereinstimmung (nur Festigkeit gleich): wäre Deutung, nicht Abgleich.
- Alle Angaben einer Seite (etwa „Konsistenz F3, soweit nicht anders angegeben“) für alle
  Sorten übernehmen: zu viel Deutung. Wer das will, verknüpft den Satz von Hand.

## Folgen

- Betonsorten im LV und im PDF müssen gleich geschrieben sein, sonst kein Vorschlag.
- Alte Notizdateien bleiben gültig; die neue Herkunft `beton` lesen ältere Versionen nicht.
