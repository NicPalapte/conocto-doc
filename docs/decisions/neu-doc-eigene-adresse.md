# NEU – Viewer auf eigener Adresse doc.conocto.app

- **Status:** vorgeschlagen
- **Datum:** 2026-11-20
- **Betrifft:** `frontend/src/lib/persist/umzug.ts`, `frontend/uebernahme.html`,
  `frontend/src/main.tsx`, `frontend/public/CNAME`, `.github/workflows/deploy-pages.yml`,
  `.github/workflows/pr-preview.yml`
- **Ergänzt:** 0082 (eigene Domain), 0092 (Startseite und Viewer unter /doc/),
  0112 (Beta nur bei Release), 0120 (Links zu Beta und Arbeitsversion)

## Worum geht's

- Nico will den Viewer unter einer eigenen Adresse: **doc.conocto.app**. Nicht `docs.`, das
  klingt nach Dokumentation.
- GitHub Pages kann je Repo nur eine Domain. Startseite und Viewer kommen aus demselben Repo.
- Eine neue Adresse ist für den Browser ein neuer Speicher. Notizen, Marker, eigene Regeln und
  das letzte Projekt lägen sonst nur noch unter der alten Adresse.

## Entscheidung

- **doc.conocto.app:** GitHub Pages wie bisher, nur bei Release. Der Viewer liegt in der
  Wurzel; `deploy-pages.yml` kopiert dafür `doc/index.html` nach `index.html`. `/doc/` bleibt
  zusätzlich erreichbar. PR-Vorschauen unter `doc.conocto.app/pr-preview/pr-<nr>/`.
- **conocto.app:** eigenes Cloudflare-Pages-Projekt, baut `main`, öffentlich (ohne Zero Trust).
  Umgebungsvariable `VITE_NUR_UMZUG=1`: der Viewer startet dort nie, er leitet nur weiter.
  Damit ist die Arbeitsversion auch unter der `*.pages.dev`-Adresse dieses Projekts nicht offen.
- **Umzug der Daten, nur im Browser:** `conocto.app/doc/` lädt unsichtbar
  `doc.conocto.app/uebernahme.html` und gibt ihr per `postMessage` alle gespeicherten Einträge.
  - Die neue Seite nimmt nur Nachrichten von `https://conocto.app` und `https://www.conocto.app`.
  - Sie überschreibt nie: ein vorhandenes Projekt bleibt samt Notizen, ebenso jede vorhandene
    Einstellung.
  - Die alte Adresse löscht ihre Daten erst, wenn die neue alles übernommen hat. Sonst bleiben
    sie für den nächsten Versuch. Nach 10 Sekunden ohne Antwort leitet sie trotzdem weiter.
  - Suche und Fragment (`?demo=projekt`, `#lv=…~pos=…`) gehen bei der Weiterleitung mit.
- Gleiches Format wie 0.66 (0117): die Einträge wandern unverändert, die Lesewege prüfen sie.
- **dev.conocto.app** bleibt, wie es ist.

## Verworfen

- **Weiterleitung nur per Cloudflare-Regel:** schnell, aber die Daten blieben zurück.
- **Nur „Arbeitsstand sichern/laden“ von Hand:** jeder Tester müsste vorher daran denken.
- **Viewer als zweites Cloudflare-Projekt, Startseite bleibt bei GitHub:** Cloudflare baut nur
  Branches, nicht Release-Tags. Die Beta bräuchte einen eigenen Branch, den ein Workflow pflegt.
- **doc.conocto.app/doc/ als Adresse:** doppeltes „doc“, unnötig lang.

## Was der Owner tun muss

- Einmalig, Anleitung in `docs/setup/doc-eigene-adresse.md`: Cloudflare-Projekt für die
  Startseite, DNS-Eintrag `doc`, Domain in den GitHub-Einstellungen, dann ein Release.
- Ohne diese Schritte bleibt alles wie bisher unter conocto.app.
