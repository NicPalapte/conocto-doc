# Umzug auf doc.conocto.app – einmalige Schritte

Ergebnis danach: Der Viewer läuft unter **https://doc.conocto.app/**. Die Startseite bleibt auf
**https://conocto.app/**. Alte Links auf `conocto.app/doc/` leiten weiter und nehmen die
gespeicherten Daten mit. Hintergrund: [neu-doc-eigene-adresse](../decisions/neu-doc-eigene-adresse.md).

Dauer: etwa 30 Minuten. In Teil B ist conocto.app ein paar Minuten nicht erreichbar.

## Teil A – vorbereiten (stört nichts)

Erst, wenn der PR mit diesem Umbau in `main` ist.

1. **Neues Cloudflare-Projekt für die Startseite**
   - Cloudflare → **Workers & Pages** → **Create** → Reiter **Pages** → **Connect to Git**.
   - Repo `bubbleLV` wählen. Projektname: `conocto-start`. Production branch: `main`.
   - Build-Einstellungen wie beim Projekt für dev.conocto.app:
     - Framework preset: **None**
     - Root directory: `frontend`
     - Build command: `npm ci && npm run build`
     - Build output directory: `dist`
   - **Environment variables** → zwei Einträge:
     - `NODE_VERSION` = `22.18.0`
     - `VITE_NUR_UMZUG` = `1` (sorgt dafür, dass dort nie der Viewer läuft, nur die
       Weiterleitung)
   - **Save and Deploy**.
   - Kein Zero Trust für dieses Projekt: die Startseite ist öffentlich.
   - Prüfen: `https://conocto-start.pages.dev/` zeigt die Startseite.
   - Fehlt `VITE_NUR_UMZUG`, ist dort die Arbeitsversion ohne Schutz offen.
2. **DNS-Eintrag für doc**
   - Cloudflare → `conocto.app` → **DNS** → **Records** → **Add record**.
   - Type `CNAME`, Name `doc`, Target `nicpalapte.github.io`.
   - **Proxy status aus** (graue Wolke). Sonst bekommt GitHub kein HTTPS-Zertifikat.
   - **Save**.

## Teil B – umschalten (direkt nacheinander)

3. **Release** wie gewohnt (Tag `v…` nach dem Bot-Commit).
   - Der Release-Lauf schreibt die neue Domain nach `gh-pages`. Ab dann liefert GitHub
     doc.conocto.app aus, und conocto.app ist weg, bis Schritt 4 fertig ist.
4. **conocto.app auf das neue Cloudflare-Projekt legen**
   - Cloudflare → `conocto.app` → **DNS** → **Records**: die vier **A**-Einträge für
     `conocto.app` (185.199.108–111.153) und den **CNAME `www`** löschen.
   - Cloudflare → **Workers & Pages** → `conocto-start` → **Custom domains** →
     **Set up a custom domain** → `conocto.app` → bestätigen.
   - Dasselbe noch einmal mit `www.conocto.app`.
   - Nach ein paar Minuten zeigt https://conocto.app/ wieder die Startseite.
5. **GitHub prüfen**
   - Repo → **Settings** → **Pages** → Custom domain muss `doc.conocto.app` zeigen. Sonst
     eintragen und **Save**.
   - Sobald der DNS-Check grün ist: **Enforce HTTPS** anhaken. Das Zertifikat kann bis zu
     einer Stunde dauern.

## Test danach

- https://conocto.app/ → Startseite. „LV öffnen“ landet auf https://doc.conocto.app/.
- Im Browser, in dem vorher unter conocto.app/doc/ gearbeitet wurde: einmal
  https://conocto.app/doc/ aufrufen. Danach zeigt doc.conocto.app das letzte Projekt mit
  Notizen und eigenen Regeln.
- Ein alter Positions-Link `conocto.app/doc/#lv=…~pos=…` öffnet dieselbe Position unter
  doc.conocto.app.

## Wenn etwas schiefgeht

- Daten sind nie weg: die alte Adresse löscht erst, wenn die neue alles übernommen hat.
- Zurück zum alten Stand: in GitHub → Settings → Pages wieder `conocto.app` eintragen,
  in Cloudflare die Custom domains bei `conocto-start` entfernen und die A-Einträge wieder
  anlegen (Werte in [ci-und-agenten.md](ci-und-agenten.md), Schritt 2a).
