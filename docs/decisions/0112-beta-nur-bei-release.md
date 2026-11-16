# 0112 – conocto.app nur bei neuem Release, main zu Cloudflare

- **Status:** akzeptiert
- **Datum:** 2026-11-16
- **Betrifft:** `.github/workflows/deploy-pages.yml`, `.github/workflows/pr-preview.yml`,
  `docs/entwicklung.md`
- **Ergänzt:** 0007 (Previews im Deploy aufräumen), 0082 (eigene Domain)

## Worum geht's

- Bisher hat jeder Merge nach `main` sofort conocto.app geändert.
- Nico will zwei Stände: eine stabile Beta für Tester und eine Arbeitsversion zum Ausprobieren.
- Die Arbeitsversion läuft seit 16.11.2026 bei Cloudflare Pages (Adresse `*.pages.dev`,
  geschützt über Cloudflare Zero Trust). Cloudflare baut `main` selbst, ohne Workflow im Repo.

## Entscheidung

- `deploy-pages.yml` startet nur noch bei einem neuen Tag `v…` (Release) oder von Hand.
- Ein Merge nach `main` landet nur noch in der Arbeitsversion bei Cloudflare.
- Previews unter `conocto.app/pr-preview/` bleiben. Previews geschlossener PRs verschwinden
  jetzt erst beim nächsten Release.

## Verworfen

- **Eigener Branch `beta`:** zweiter Branch läuft leicht auseinander, jedes Veröffentlichen
  braucht einen eigenen PR.
- **Nur von Hand starten:** kein fester Versionsstand, kein Änderungstext.

## Was der Owner tun muss

- Veröffentlichen: GitHub → Releases → „Draft a new release“ → Tag wie `v0.65.0` neu anlegen
  (Ziel `main`) → „Publish release“. Der Workflow baut dann conocto.app.
- Ohne Release bleibt conocto.app auf dem letzten Stand.
- Cloudflare-Einstellungen (nur im Dashboard): Root `frontend`, Build `npm ci && npm run build`,
  Ausgabe `dist`, Variable `NODE_VERSION=22.18.0`.
