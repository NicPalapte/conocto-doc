# Umzug auf doc.conocto.app – einmalige Schritte

Ergebnis danach: Der Viewer läuft unter **https://doc.conocto.app/**. Die Startseite bleibt auf
**https://conocto.app/**. Alte Links auf `conocto.app/doc/` leiten weiter und nehmen die
gespeicherten Daten mit. Hintergrund: [neu-doc-eigene-adresse](../decisions/neu-doc-eigene-adresse.md).

Dauer: etwa 30 Minuten. In Teil B ist conocto.app ein paar Minuten nicht erreichbar.

## Teil A – vorbereiten (stört nichts)

Erst, wenn der PR mit diesem Umbau in `main` ist.
Danach zeigt dev.conocto.app unter `/doc/` weiter die Arbeitsversion.

1. **Zero Trust prüfen**
   - Die Startseite kommt aus dem vorhandenen Cloudflare-Projekt, das schon dev.conocto.app
     baut. Es bekommt nur eine zweite Adresse. Ein neues Projekt ist nicht nötig.
   - Cloudflare → **Zero Trust** → **Access** → **Applications**: der Schutz darf nur für
     `dev.conocto.app` gelten, nicht für `conocto.app` oder `*.conocto.app`. Sonst müssten
     Besucher der Startseite sich anmelden.
   - Unter conocto.app startet der Viewer nie, dort leitet `/doc/` nur weiter. Das erkennt die
     App an der Adresse, dafür ist keine Einstellung nötig.
2. **DNS-Eintrag für doc**
   - Cloudflare → `conocto.app` → **DNS** → **Records** → **Add record**.
   - Type `CNAME`, Name `doc`, Target `nicpalapte.github.io`.
   - **Proxy status aus** (graue Wolke). Sonst bekommt GitHub kein HTTPS-Zertifikat.
   - **Save**.

## Teil B – umschalten (direkt nacheinander)

3. **Release** wie gewohnt (Tag `v…` nach dem Bot-Commit).
   - Der Release-Lauf schreibt die neue Domain nach `gh-pages`. Ab dann liefert GitHub
     doc.conocto.app aus, und conocto.app ist weg, bis Schritt 4 fertig ist.
4. **conocto.app auf das Cloudflare-Projekt legen**
   - Cloudflare → `conocto.app` → **DNS** → **Records**: die vier **A**-Einträge für
     `conocto.app` (185.199.108–111.153) und den **CNAME `www`** löschen.
   - Cloudflare → **Workers & Pages** → das Projekt von dev.conocto.app → **Custom domains** →
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
  in Cloudflare die Custom domains `conocto.app` und `www.conocto.app` entfernen und die A-Einträge wieder
  anlegen (Werte in [ci-und-agenten.md](ci-und-agenten.md), Schritt 2a).
