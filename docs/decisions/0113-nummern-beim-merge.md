# DOC-0113 – Nummer, Version und Changelog erst nach dem Merge

- **Status:** akzeptiert
- **Datum:** 2026-11-16
- **Betrifft:** `docs/decisions/`, `changes/`, `CHANGELOG.md`, `frontend/package.json`,
  `.github/conocto/entscheidungen.py`, `.github/workflows/entscheidungen.yml`, `ci.yml`
- **Ersetzt:** in 0027 die Folge „vor jeder Veröffentlichung Nummer und Changelog von Hand“
- **Anlass:** Nico, 16.11.2026: gleiche Nummern in parallelen PRs blockieren den Merge;
  eine Logik für alle vier Repos (Plan: https://claude.ai/artifact/X8w2PM99vybAQHQoxF8KcJ)

## Worum geht's

- Zwei PRs nahmen sich oft dieselbe nächste Nummer (z. B. beide `0095-…md`), dieselbe
  nächste Version und dieselbe letzte Zeile der Übersichtstabelle.
- Wer zuerst mergte, gewann. Der andere PR hatte Konflikte und musste umnummerieren.

## Entscheidung

- **Im PR keine Nummer:** neue Entscheidung als `docs/decisions/neu-<titel>.md`, erste Zeile
  `# NEU – Titel`. Verweise darauf im selben PR als `neu-<titel>`.
- **Im PR keine Version:** stattdessen ein Baustein `changes/<titel>.md` mit `art: funktion`
  oder `art: korrektur`, erste Zeile = Überschrift im Changelog, darunter die Stichpunkte.
- **Nach dem Merge** vergibt `.github/workflows/entscheidungen.yml` auf `main` in einem
  Commit: nächste freie Nummer, Zeile in der Übersichtstabelle, Ersetzung aller
  `neu-<titel>`, neue Version in `frontend/package.json` (+ Lockdatei), Abschnitt in
  `CHANGELOG.md`. Läuft nie zweimal gleichzeitig.
- **Die CI prüft im PR:** keine neue Datei mit Nummer, keine neue Tabellenzeile, keine Hand-
  änderung an Version oder `CHANGELOG.md`, Kopf von `neu-…` und Bausteinen lesbar.
- **Präfix im Gesamtprodukt:** Entscheidungen dieses Repos heißen nach außen `DOC-0112`
  (core `CORE-`, BIM `BIM-`, Designsystem `DS-`). Im eigenen Repo reicht `0112`.
  Dateinamen bleiben `NNNN-titel.md`, alte Nummern bleiben.
- **Ein Werkzeug für alle Repos:** `.github/conocto/entscheidungen.py` (nur Python-
  Standardbibliothek) liegt als gleiche Kopie in allen vier Repos.

## Warum

- Es gibt im PR nichts mehr, was zwei PRs gleichzeitig beanspruchen. Konflikte entstehen
  nur noch bei echten inhaltlichen Überschneidungen.
- Präfix statt gemeinsamem Zähler: eindeutig über alle Repos, ohne zentrale Stelle, an der
  vier Repos gleichzeitig schreiben.

## Verworfene Alternativen

- **Datum statt Nummer** – alte Verweise wären uneinheitlich, über 700 Verweise auf Nummern.
- **Tabelle komplett aus den Dateiköpfen erzeugen** – die Tabelle hat gekürzte Titel und
  zusammengefasste Status, die in den Köpfen anders stehen. Der Bot ergänzt nur neue Zeilen.
- **Bot öffnet einen eigenen PR** statt direkt zu schreiben – je Merge ein zweiter PR mit
  CI-Lauf und Klick.
- **Werkzeug zentral als wiederverwendbarer Workflow** – bubbleLV ist öffentlich, ein
  privates Projekt-Repo ließe sich von hier nicht aufrufen. Deshalb Kopie je Repo.

## Folgen

- Nico richtet einmal den Bot-Schlüssel ein: `docs/setup/bot-schluessel.md`. Ohne ihn
  scheitert der Lauf nach dem Merge rot, `neu-…` und Bausteine bleiben liegen, bis er da ist.
- Die Arbeitsversion baut nach jedem Commit auf `main`, also auch nach dem Bot-Commit; erst
  dieser Stand trägt die neue Version. Ein Release-Tag `v…` daher erst nach dem Bot-Commit setzen.
- Offene PRs mit schon vergebener Nummer: vor dem Merge auf `neu-…` umstellen.
