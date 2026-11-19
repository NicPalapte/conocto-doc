# NEU – CLAUDE.md schlank, Doku nur bei Bedarf lesen

- **Status:** akzeptiert
- **Datum:** 2026-11-19
- **Betrifft:** `.claude/CLAUDE.md` (Maßstab des Review-Agenten)

## Worum geht's

- `CLAUDE.md` holte über `@`-Verweise bei jedem Start rund 190 KB Doku dazu: Plan,
  Architektur, Scope, Übersicht der Entscheidungen. Zusammen mit der Datei selbst (21 KB)
  waren das rund 210 KB je Sitzung.
- Der Scope stand als ein Satz über rund 50 Zeilen da. Wichtige Verbote gingen darin unter.
- Unter „Stack“ stand „Persistenz: keine“, obwohl IndexedDB erlaubt ist.

## Entscheidung

- Keine `@`-Verweise mehr. Die Doku steht als Pfad unter „Bei Bedarf lesen“; der Agent öffnet
  sie, wenn eine Aufgabe sie braucht.
- Jede bisherige Regel bleibt, als Aufzählung: der Scope mit einer Zeile je Funktion samt
  bindender Regel und Entscheidung, und die IndexedDB-Liste getrennt nach „zur Datei“ und
  „unabhängig von der Datei“.
- Neu: Kommentare im Code ohne Namen, Datum, Arbeitsstände und „früher/nicht mehr“.
- Neu: `docs/archiviert/` gilt nicht als Maßstab.

## Folgen

- Jede Sitzung lädt rund 14 KB statt 210 KB.
- Der Review-Agent misst an derselben Regelmenge, nur übersichtlicher.
- Wer Details braucht, liest die Entscheidung oder `docs/` selbst.

## Verworfene Alternativen

- **Nur die `@`-Verweise entfernen:** Das spart den größten Teil, aber der Scope bliebe schwer
  lesbar und der Widerspruch bei „Persistenz“ bliebe stehen.
- **Scope-Details nach `docs/scope.md` verschieben:** Dann stünden bindende Regeln nicht mehr
  dort, wo der Review-Agent misst.
