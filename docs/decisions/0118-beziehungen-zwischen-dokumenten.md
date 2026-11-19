# DOC-0118 – Beziehungen zwischen Dokumenten gehören zum Auftrag

- **Status:** akzeptiert
- **Datum:** 2026-11-19
- **Betrifft:** Auftrag in `.claude/CLAUDE.md`, „Der eine Satz“ in `docs/scope.md`
- **Ergänzt:** 0006 (Fokus „LV verstehen“), 0072 (Begleit-PDF), 0110 (mehrere LVs)

## Worum geht's

- Der Auftrag lautete bisher: Information zeigen, Wichtiges hervorheben, Beziehungen
  **zwischen Positionen** sichtbar machen.
- Conocto zeigt inzwischen mehr: mehrere LVs nebeneinander (0110), Begleit-PDFs mit
  verknüpften Stellen (0072), PDF-Karten mit Linien im Graphen (0097, 0114).
- Der Satz im Auftrag deckte das nicht ab. Ein Agent oder Reviewer konnte daraus schließen,
  dass Beziehungen zwischen Dokumenten nicht dazugehören.

## Entscheidung

- Der Auftrag lautet jetzt: Beziehungen zwischen Positionen **und zwischen den Dokumenten (LVs
  und Begleit-PDFs)** sichtbar machen.
- Die Grenze bleibt: Eine Beziehung kommt nur aus dem, was wörtlich in den Dateien steht, oder
  wird von Hand verknüpft. Conocto deutet keine Inhalte und rät keine Ähnlichkeit zwischen
  Dokumenten (0049, 0072, 0080).

## Folgen

- Funktionen, die zeigen, wie LVs und PDFs zusammenhängen, liegen im Auftrag.
- Funktionen, die Zusammenhänge selbst erschließen (inhaltliches Matching, KI), bleiben
  draußen.

## Verworfene Alternativen

- **Satz unverändert lassen:** Er passte nicht mehr zu dem, was die App schon kann.
