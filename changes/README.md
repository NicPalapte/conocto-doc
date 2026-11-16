# Bausteine für den Changelog

Jeder PR, der in der App etwas ändert, legt hier **eine** Datei an, z. B. `changes/taste-t.md`:

```markdown
---
art: korrektur
---
Tasten nicht im Weg

- **Taste T** wirkt nicht, solange ein Fenster offen ist.
```

- `art: funktion` → mittlere Zahl der Version steigt, `art: korrektur` → letzte Zahl.
- Erste Zeile nach dem Kopf = Überschrift im Changelog, darunter die Stichpunkte in der Sprache
  der Anwendung.
- Nicht von Hand ändern: Versionsnummer in `frontend/package.json` und `CHANGELOG.md`.
- Nach dem Merge macht der Bot daraus Version und Changelog und löscht die Datei
  (Entscheidung neu-nummern-beim-merge).
