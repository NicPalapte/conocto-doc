# NEU – Rückwärtskompatibel erst ab 0.66

- **Status:** akzeptiert
- **Datum:** 2026-11-18
- **Betrifft:** `frontend/src/lib/notesFile.ts`, `frontend/src/lib/annotations.ts`
  (`fromStored`), `frontend/src/lib/persist/lastLv.ts`, `frontend/src/state/rules.tsx`,
  `frontend/src/lib/share/urlState.ts`, `frontend/src/lib/pipeline/loadDemoLv.ts`,
  Demo-Datei `frontend/src/assets/demo/projekt/conocto-demo-arbeitsstand.json`
- **Ersetzt in Teilen:** 0101 (alte Dateien `conocto-notizen` lesen, Demo-Datei mit alter
  Kennung), 0088 (einmaliger Umzug alter Begriffe), 0055 (Links mit `p=<OZ>`), 0100 (alte
  Demo-Links `?demo=muster` und `?demo=angebot`), 0047 und 0062 (alte Speicherformen)

## Worum geht's

- Seit v0.66.0 ist Conocto als Beta draußen. Ab hier sollen Nutzer ihre Daten behalten.
- Vor 0.66 gab es nur Tests mit wenigen Leuten. Dafür hat die App viele Sonderwege
  mitgeschleppt: alte Arbeitsstand-Dateien (Version 1 bis 4), alte Speicherformen im Browser
  (bis v0.15 zurück), alte Links und alte Demo-Kennungen.
- Diese Wege machen den Code länger und jede neue Änderung schwerer zu prüfen.

## Entscheidung

- **Stichtag ist v0.66.0.** Was 0.66 schreibt, liest jede spätere Version weiter.
  Was älter ist, wird nicht mehr gelesen.
- **Arbeitsstand-Datei:** nur `conocto-arbeitsstand`, Version 5. Eine Datei
  `conocto-notizen` bekommt die Meldung „stammt aus einer Conocto-Version vor 0.66 und wird
  nicht mehr gelesen“.
- **Speicher im Browser:** nur die Notizen-Form `v: 6`. Ein gespeichertes Projekt ohne
  Kennung (`id`) oder LV-Liste (`files`) gilt als leer. Gelernte Begriffe unter `begriffe`
  werden nicht mehr in Regeln umgezogen.
- **Links:** nur noch `pos=<Hash>`; `p=<OZ>` wird übergangen. Demo nur über `?demo=projekt`.
- **Demo-Datei** hat jetzt die neue Kennung (`conocto-demo-arbeitsstand.json`).
- **Bleibt:** Das einmalige Löschen der alten Datenbank `bubble` (0091). Das ist kein Lesen,
  sondern räumt Fachdaten weg, die „Löschen“ auf der Startseite nicht erreicht.
- **Ab jetzt:** Neue Felder nur ergänzen, sodass ältere Fassungen sie übergehen. Ein Bruch
  braucht eine neue Version, die die Form von 0.66 weiter liest.

## Folgen

- Wer zuletzt eine Version vor 0.66 benutzt hat, sieht auf der Startseite keine letzte Datei
  mehr und verliert dort Markierungen und Kommentare. Alte Arbeitsstand-Dateien lassen sich
  nicht mehr laden.
- Begriffe, die vor 0.66 gelernt und nie umgezogen wurden, wirken nicht mehr.
- Alte Links öffnen die Ansicht weiter, wählen aber keine Position mehr.

## Verworfene Alternativen

- **Alles weiter lesen:** Kein echter Nutzer hat Daten von vor 0.66, die er braucht. Der Code
  dafür kostet mehr, als er bringt.
- **Alte Dateien in einem Zwischenschritt umwandeln:** gleicher Aufwand, ohne Nutzen.
