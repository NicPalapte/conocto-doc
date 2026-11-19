# Conocto – Coding Agent

## Auftrag
Conocto macht **ein Leistungsverzeichnis lesbar**: jede Information der Datei zeigen, das
Wichtige hervorheben, Beziehungen zwischen Positionen und zwischen den Dokumenten (LVs und
Begleit-PDFs) sichtbar machen (0118). Was nicht dem Verstehen
der geladenen Dateien dient, gehört nicht ins Produkt. Reine Frontend-App: GAEB-Dateien und
Begleit-PDFs im Browser laden, klassifizieren, prüfen, im Graphen durchsuchen und filtern.
- Beziehungen nur aus dem, was wörtlich in den Dateien steht, oder von Hand verknüpft. Verboten:
  inhaltliche Deutung oder Ähnlichkeit zwischen Dokumenten erraten (0049, 0072, 0080).

## Bei Bedarf lesen (nicht vorab laden)
- Aufbau, Ordner, Deployment: `docs/entwicklung.md`
- Scope und Anwendungsfälle: `docs/scope.md` · Plan: `docs/implementation-plan.md`
- Architektur: `docs/architecture/pipeline.md`, `frontend.md`, `data-model.md`
- Prüfregeln und Norm-Verweise: `docs/domain/vob-pruefungen.md`, Index `docs/domain/README.md`
- Entscheidungen: `docs/decisions/README.md` (Übersicht), Einzeldatei je Nummer
- CI und Agenten: `docs/setup/ci-und-agenten.md`
- `README.md` ist nur für Besucher: Produkt/Vision, keine Entwicklerinhalte.
- `docs/archiviert/` ist veraltet: nicht als Maßstab verwenden.

## Befehle
- `cd frontend && npm run dev` – App lokal
- `cd frontend && npm test` – Vitest
- `cd frontend && npm run typecheck` – TypeScript über `src`, `vite.config.ts`, `tests`
- `cd frontend && npm run build` – statisches Bundle
- Lint/Format laufen per Hook nach jedem Edit/Write (`.claude/hooks/lint.sh`).

## Stack
Vite · React · TypeScript · Tailwind in `frontend/`; Fachkern in `packages/core/`; eigener
GAEB-DA-XML-Parser hinter `GaebParser`.

## Architektur (nicht verhandelbar)
- Kein Backend, keine DB, kein Login. Parsen, Klassifizieren, Filtern, Rendern im Browser.
  Fachdaten verlassen den Browser nie. Bei Zweifel, ob ein Feature einen Server braucht:
  nachfragen.
- Erlaubt: statische Fremd-Assets (Fonts, npm, CDN), lokale Downloads als Blob, Browser-Druck.
  Schriften nur über `@conocto/design/fonts` (im Bundle), kein Aufruf an Google Fonts.
- Verboten: `localStorage`/`sessionStorage`/Cookies für Fachdaten. UI-Zustand nur in
  React-State/Context, überlebt keinen Reload. Ausnahme: Anordnung im Splitscreen (0073).
- **IndexedDB nur über `frontend/src/lib/persist/lastLv.ts`.** Erlaubt sind genau:
  - ein Projekt: Bytes + Angaben der zuletzt geöffneten Datei(en), weitere LVs unter
    `weitereLvs` (0046, 0110); Notizen je Positions-Hash `hashes.id` (`lib/annotations.ts`,
    0047, 0057): Marker, Verlauf, Textmarkierungen, Stellen und Notizen in Begleit-PDFs
    (`lib/docs/docNotes.ts`, 0072, 0111), ausgeblendete Vorschlagsarten (0087), Urteile über
    Verbindungen (`links`, 0081). Löschbar auf der Startseite.
  - unabhängig von der Datei, je ein Schlüssel: Farbnamen (`lib/paintNames.ts`,
    `state/paintNames.tsx`), `umfrage` (`state/survey.tsx`, 0071), `tour`
    (`components/tour/Tour.tsx`, 0098), `anordnung` (`state/ViewerProvider.tsx`, 0073),
    `regeln` (`state/rules.tsx`, 0081), `grundstock-aus` (0089), `wortlisten`
    (`lib/rules/wordLists.ts`, 0090).
  - Verboten: geparstes LV, Demo-LVs, zweites Projekt, PDF-Bytes speichern. Notizen nur
    schreiben, wenn `persistIdOf` noch passt. Ohne IndexedDB still weiter, kein Fehler.
- **Rückwärtskompatibel ab v0.66.0** (0117): lesbar bleibt, was 0.66 schreibt –
  `conocto-arbeitsstand` Version 5, `StoredAnnotations` `v: 6`, Meta mit `id` + `files`,
  Links `pos=`. Verboten: Lesewege für Formate vor 0.66. Neue Felder nur optional; ein Bruch
  braucht eine neue Version, die 0.66 weiter liest, plus Test.

### Pipeline (Kern)
- GAEB-XML-Wissen nur in `packages/core/src/gaeb/parser.ts` (`GaebParser`). Exceptions nur
  `GAEBParseError`, `GAEBValidationError`, `GAEBVersionError`.
- Parser liefert `LVDraft` (`packages/core/src/model/lvDraft.ts`) ohne GAEB-Begriffe.
- Kern `packages/core/` (0054): App importiert nur über `@core`; im Kern kein React, kein
  Import aus `frontend/`. Fachlogik ohne UI-Bezug gehört in den Kern.
- Positions-Hashes `PositionHashes` (0055): Preis, Klassifizierung, Notizen nie im Hash;
  Normierung nur mit neuer Schema-Kennung (`conocto-pos-v1`).
- Klassifizierung läuft auf dem `LVDraft` vor dem Baum, schreibt nach `Position.attributes`,
  hinter einem Interface in `frontend/src/lib/classify/`; regelbasiert, kein LLM.
- `buildTree(draft): LVNode` ist eine reine Funktion. Filter, Summen, Beziehungen rechnen auf
  dem flachen Positions-Index, nicht per Baum-Traversierung.
- Prüfregeln: Grundstock `conocto-rule-v1` mit Wirkung `pruefhinweis` in
  `docs/domain/reference/regeln.json` (0086); Auswertung `frontend/src/lib/check/index.ts`,
  eingebaute Logik nur `lib/check/builtins.ts`, Wortlisten als CSV (`lib/rules/wissen.ts`).
- Regel-Auswerter nur in `packages/core/src/rules/`.
- Parsen + Klassifizieren großer LVs im Web Worker.

### Frontend
- Zwei Seiten (0092): Startseite `frontend/index.html` + `frontend/src/landing/` (ohne React,
  kein App-Import außer `@conocto/design/fonts`); Viewer `frontend/doc/index.html`. Demo nur
  über `?demo=projekt` (`takeDemoFromUrl`).
- Daten nur aus der lokalen Pipeline; keine Fixture-Daten im UI.
- `matchPos` ist die einzige Filter-/Suchlogik; `searchKeyOf` (Kern) die einzige Suchregel.
- Graph, Tabelle und Baum nutzen denselben `LVNode`-Baum.
- Ein Filterzustand für alle Bereiche und Fenster; Zustand getrennt in `filterState` /
  `selectionState` / `viewState`. Bereich, Reiter oder Fenster öffnen/schließen ändert nie
  Filter, Suche oder Auswahl. Bereiche nur über `view.workspace` (0074).

## Leistung
- ~10k Positionen flüssig in Graph und jedem Fenster: erste Ansicht < 5 s, Filterwechsel
  < 100 ms, Fenster öffnen < 200 ms. Mittel: flacher Index, Worker, Virtualisierung,
  LOD + Culling.
- Beziehungen einmal beim Laden im Worker, nie im Render; kein All-Paare-Vergleich, erst nach
  Einheit vorgruppieren.

## Produkt-Scope
Jede Zeile: Funktion – bindende Regel – Entscheidung. Details in der Entscheidung.

**In Scope**
- GAEB-Import x83 und preisführend x84/x86.
- Mehrere LVs nebeneinander (`LvFilesProvider`) – Kennung `LV1…` an `PositionSummary.lv`,
  Knoten `file` erst ab zwei LVs, Facette `lv`, ein Menüpunkt „Dokument hinzufügen…“ für PDF
  und GAEB – 0110.
- Klassifizierung Kurz-/Langtext mit Textstellen; vier Wichtig-Kategorien Geld/Menge · Risiko
  · Norm · Frist; fachliche Filter.
- VOB-Check als Hinweis – siehe „Prüfregeln“ unten.
- Graph als Hauptscreen (0034); alle Bereiche nur als Splitscreen, tausch-, stapel-,
  schließbar, über „Ansicht“ (0064, 0070, 0073, 0074). Graph ↔ Tabelle am selben Platz nur
  über `switchGraphTable` (0107). Vergleich max. 4 Positionen (0037).
- Beziehungen nur als ähnliche Positionen im Vergleich, keine wertende Regel – 0049.
- Eigene Marker (Fortschritt Offen/In Bearbeitung/Fertig + Wichtig) und Kommentar-Verlauf je
  Position – 0047, 0062.
- Textmarkierungen im Langtext, 6 feste Farben mit eigenen Namen – 0063.
- Begriff lernen per Rechtsklick = eine eigene Regel – 0053, 0088.
- Einstellungen im Logo-Menü als Overlay (`components/settings/`), ohne Passwort, kein
  Splitscreen-Bereich (0109).
  Jede Regel an/aus; Grundstock nur abschalten oder kopieren (0089); Wortlisten: Grundstock-
  Wörter nur abschalten, Suche nur über `useRules().context` (0090); ein Format für alle
  Regelarten (0085); Verbindungen aus Regeln nur als Vorschlag bis zur Bestätigung (0081).
- Export/Druck lokal über das Logo-Menü; Arbeitsstand sichern/laden (`lib/notesFile.ts`,
  0061, 0101).
- Begleit-PDF im Bereich „Dokument“ (`components/docs/`, 0072): lesen, anstreichen, Stellen
  oder ganzes Dokument (Seite 0, 0099) von Hand verknüpfen, keine Interpretation.
  - Notiz an PDF-Stelle; @-Verweise als `@[Knoten-ID]`, gespeichert `@[hash]`, nur Hinweis
    (`lib/mentions.ts`, 0111).
  - Im Graphen als PDF-Karten mit Linien, nur Anzeige (0097); Linien nur für hervorgehobenes
    PDF, gewählte Position, hervorgehobenen Abschnitt, Matrix-Achsen `dokument`/`dokumentart`
    mit Sammelwert „mehrere PDFs“ (0114).
  - Pläne messen: Maßstab erst nach „Übernehmen“, Wert immer aus aktuellem Maßstab, nie
    gespeichert; Rechenansatz ⇒ VA-Menge mit Herkunft (`lib/docs/planNotes.ts`,
    `packages/core/src/plan/`, 0095).
  - Vorschläge (`lib/docs/docSuggest.ts`, 0080): nur exakte OZ oder eindeutige Menge+Einheit,
    Übernahme erst per Klick, „Nein“ gemerkt, kein inhaltliches Matching. An/aus und Werte nur
    über Grundstock-Regeln `pdf-oz`/`pdf-menge`/`pdf-beton`/`pdf-text`
    (`lib/docs/suggestRules.ts`, 0087). Betonsorte nur
    wörtlich gleich (0106). OZ ohne „Pos.“/„OZ“ nur in LV-Schreibweise, nie Kapitelnummer;
    Kurztext nur wörtlich und eindeutig (0108).
- Eine Suchleiste für LV und alle PDFs; PDF-Treffer filtern das LV nie – 0103. Ganzer Kopf auch
  in ausgelagerten Fenstern – 0102.
- Betonsortenliste im Überblick: Sorte nur aus wörtlichen Klassen, fehlende Angaben nur als
  Hinweis, Klick filtert über Facette `betonsorte` (`lib/beton/sorten.ts`, 0104, 0106).
- Kurzumfrage nur als Owner-Wunsch (0071).
- Entfernt, nicht wieder einführen: eigene Matrix-Ansicht und Ähnlichkeit (0031; Matrix lebt
  als Graph-Gliederung, 0035, 0059), Befehlspalette (0038).

**Out of Scope** (ablehnen/vertrösten; Details `docs/scope.md`)
- Server jeder Art; Persistenz über die Session hinaus außer der IndexedDB-Liste oben.
- Auth/SSO, auch kein Passwort als Sichtschutz (0109).
- Versionsvergleich, x83+x84-Merge (perspektivisch gewollt, jetzt draußen).
- Aufgaben, Vergabepakete, NU-Anfragen, Bieterfragen verwalten, Zuständigkeit/Zuweisung,
  Status-Änderung, EP-Kalkulation, Excel-/Manuell-Import, Multi-Tenant, GAEB-Export,
  LLM-Klassifizierung.
- Notizen außer Kommentar je Position und Notiz an PDF-Stelle (0111).

## Prüfregeln
- Hinweise, keine Urteile; nie als Rechtsrat formulieren.
- Norm-Verweis nur, wo ein geprüfter existiert – nie erfinden (0086). Fundstelle zeigen,
  einzeln abschaltbar. Fehlende Referenzdaten ⇒ Regel inaktiv, kein Fehler.
- Status ist `OPEN` aus dem Import, nur Anzeige, nicht editierbar, kein Filter (0051).
- Norm-/DIN-/VOB-Nummer zitieren; bei Unsicherheit über normative Inhalte nachfragen.

## Nutzungszählung
- Nur über `frontend/src/lib/usage/count.ts` (0056), nur feste Namen aus `USAGE_EVENTS`.
  Neues Ereignis ⇒ in `USAGE_EVENTS` und `usageEventOf` oder `countEvent`.
- Verboten mitzusenden: Dateinamen, LV-Texte, Suchtexte, Filterwerte, Positions-IDs,
  URL-Fragment.
- `VITE_USAGE_COUNT=1` in `frontend/.env.production` nur nach Freigabe des Owners.

## Code-Style
- Produktname **Conocto** (0069); Kennungen `conocto-…` (0091): `conocto-pos-v1`,
  `conocto-graph-v1`, `conocto-lv-export-v1`, `conocto-rule-v1`, `conocto-arbeitsstand`,
  `@conocto/core`, IndexedDB `conocto`. Verboten: neue Kennungen mit `bubble`. Ausnahmen:
  GoatCounter-Code `bubble`, Repo-Name, `BubbleGraph`.
- Farben nur über CSS-Variablen aus `@conocto/design` (`tokens.css`, 0076); neue Tokens im Repo
  `conocto-design`, nicht in `frontend/src/index.css`. `--accent*` = Ziegelrot für Auswahl und
  Interaktion. Hinweise amber, nie rot.
- Titel `font-display` (Hanken Grotesk), sonst Schibsted Grotesk. Verboten: `tabular-nums`.
- Strikte Types; `any` nur mit Kommentar. Zeilenlänge ≤ 100.
- Kommentare nur für nicht offensichtliches Warum. Verboten: Namen, Datum, Arbeitsstände,
  „früher/nicht mehr“ – Historie gehört in Git und `docs/decisions/`.

## Tests
- Vitest für `GaebParser`, Klassifizierer, `buildTree`, `matchPos`.
- Parser-Tests gegen echte Fixtures unter `packages/core/tests/fixtures/`.
- Jede eigene Exception hat einen Test, der sie auslöst.

## Commits und Branches
- Vor jeder Aufgabe prüfen, ob ein passender Branch aktiv ist. Ist `main` aktiv: darauf
  hinweisen, keinen Branch selbst anlegen.
- `feat|fix|refactor|test|chore|docs|perf(<scope>): <beschreibung>`; Scopes `gaeb · classify ·
  tree · viewer · graph · relate · check · frontend`.

## Dokumentation
- Weichenstellung ⇒ `docs/decisions/neu-<titel>.md` mit `# NEU – Titel`, Verweise im selben PR
  als `neu-<titel>`. Verboten: Nummer vergeben, Zeile in der Übersicht ergänzen – macht
  `.github/workflows/entscheidungen.yml` nach dem Merge (0113). Fremde Repos mit Präfix
  (`CORE-0005`, `BIM-0002`, `DS-0001`).
- Prüfen vor Abschluss: neue Abhängigkeit, neuer Workflow, geänderte Architekturregel,
  verworfene Alternative ⇒ Eintrag. Kein Eintrag für Bugfix, Test, Umbenennung, Format.
- Getroffene Entscheidungen nicht umschreiben: Status `ersetzt durch NNNN`, neue Datei.
- App-Änderung ⇒ Baustein `changes/<titel>.md` (`art: funktion|korrektur`, `changes/README.md`).
  Verboten: Version in `frontend/package.json`/`package-lock.json` oder `CHANGELOG.md` von Hand.
- `.github/conocto/entscheidungen.py` ist in bubbleLV, bauonto, conocto-bim, conocto-design
  gleich; Änderung in allen vier Repos.
- Manuelle Schritte des Owners ⇒ `docs/setup/`.

## Automatik (nicht ohne Rückfrage ändern)
- `ci.yml` – Lint, Format, Typecheck, Test, Build je PR.
- `claude-review.yml` – Review-Agent, max. 3 Läufe je PR; misst an dieser Datei.
- `pr-preview.yml` – Preview unter `pr-preview/pr-<nr>/`, nur auf Kommentar `/preview`.
- `deploy-pages.yml` – Tag `v*` ⇒ `gh-pages` = conocto.app (Beta); `main` ⇒ Cloudflare Pages
  (Arbeitsversion, 0112).
- `entscheidungen.yml` – nach Merge: Nummer, Tabellenzeile, Version, Changelog in einem Commit
  (Secret `BOT_SCHLUESSEL`, `docs/setup/bot-schluessel.md`). Tag `v*` erst nach diesem Commit.
- `gh-pages` nur durch Workflows. Verboten: von Hand committen.

## Sprache
Owner ist kein Software-Experte (0003).
- **Für den Owner** (Chat, Commits, PRs, `README.md`, `docs/decisions/`, `docs/setup/`,
  Workflow-Kommentare): einfache Sprache, kurze Sätze, Stichpunkte, Ergebnis zuerst.
  Fachbegriff beim ersten Vorkommen in einem Halbsatz erklären (nicht: GAEB, LV, Position,
  Los, iTwo). Manuelle Schritte samt Folge beim Auslassen nennen. Keine Statusfloskeln.
- **Für die KI** (`.claude/`, Workflow-Prompts): Regeln als Aufzählung, exakte Pfade und
  Symbole, Verbot + erlaubte Alternative, keine Floskeln, keine Redundanz.

## Antwortformat
- Neue Komponente: zuerst Plan in 3–5 Punkten.
- Kein Code mit Platzhaltern (`TODO: implement`).
