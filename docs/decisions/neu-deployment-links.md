# NEU – Links zu Beta und Arbeitsversion auf der Repo-Seite

- **Status:** akzeptiert
- **Datum:** 2026-11-19
- **Betrifft:** `.github/workflows/deploy-pages.yml`, `.github/workflows/arbeitsversion-link.yml`
- **Ergänzt:** 0112 (conocto.app nur bei Release, main zu Cloudflare)

## Worum geht's

- Nico will auf der Repo-Seite beide Stände anklicken können: die öffentliche Beta und die
  Arbeitsversion.
- GitHub zeigt rechts unter „Deployments“ Links an. Die kommen aus „Environments“
  (benannte Ziele für eine Veröffentlichung, z. B. „Beta“).

## Entscheidung

- `deploy-pages.yml` meldet jedes Release als Environment `Beta` mit
  `https://conocto.app/doc/`.
- Neuer Workflow `arbeitsversion-link.yml`: bei jedem Merge nach `main` Environment
  `Arbeitsversion` mit `https://conocto.pages.dev/`. Er baut nichts, nur der Link.
- Feste Adresse des Cloudflare-Projekts statt Adresse eines einzelnen Builds
  (`<kennung>.conocto.pages.dev`): die zeigt immer denselben alten Stand.

## Verworfen

- **Cloudflare-Build per Workflow statt im Cloudflare-Dashboard:** braucht einen
  Cloudflare-Schlüssel als Secret und einen zweiten Build. Zu viel für einen Link.
- **Status per API aus Cloudflare melden:** braucht ebenfalls Schlüssel und Webhook.

## Was der Owner tun muss

- Nichts. Die Environments legt GitHub beim ersten Lauf selbst an.
- Der Eintrag `github-pages` bleibt zusätzlich stehen. Den legt GitHub selbst an.
- Optional: Website im Feld „About“ (Zahnrad) auf `https://conocto.app/doc/` stellen.
