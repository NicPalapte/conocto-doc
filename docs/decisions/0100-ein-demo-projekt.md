# 0100 – Ein Demo-Projekt mit PDFs, Verknüpfungen und Plan

- **Status:** akzeptiert
- **Datum:** 2026-11-08
- **Betrifft:** `frontend/src/lib/pipeline/loadDemoLv.ts`, Startseite des Viewers
  (`FileDropzone.tsx`), `frontend/src/assets/demo/projekt/`, `frontend/scripts/makeDemoProjekt.ts`
- **Ersetzt in Teilen:** 0009 (Demo-LV) und 0014 (Demo-LV mit Preisen): statt zwei Demo-LVs
  gibt es ein Demo-Projekt

## Worum geht's

- Nico will die App schneller testen (Auftrag 08.11.2026, Launch-Aufgabe, kein neues Feature).
- Bisher: zwei Demo-LVs (mit und ohne Preise), ohne PDFs. Verknüpfungen, Vorschläge und
  Plan-Messung musste man jedes Mal von Hand herstellen.

## Entscheidung

- **Ein Demo-Projekt** statt zwei Demos: das Demo-LV mit Preisen (x84) plus drei erfundene
  PDFs (Baubeschreibung, Vorbemerkungen, Grundriss EG im Maßstab 1:100).
- **Schon verknüpft:** Stellen in den PDFs hängen an Positionen, von Hand und als übernommener
  OZ-Vorschlag. Zwei Stellen sind nur angestrichen.
- **Offene Vorschläge:** weitere OZ und Mengen im Text. Die App rechnet sie wie bei jedem PDF
  (0080); nichts davon ist bestätigt.
- **Plan:** Maßstab aus dem Plankopf übernommen, eine Fläche (Besprechung 48 m²) an Estrich
  und Kautschukbelag, eine Länge (Sockel 28 m) an der Sockelleiste. Die Positionen haben so
  eine VA-Menge mit Herkunft „Plan“ (0095).
- **Format:** Die Notizen liegen als normale Notiz-Datei (`conocto-notizen`, 0061) neben den
  PDFs. Die App lädt sie beim Klick wie „Notizen laden“. Kein eigenes Demo-Format.
- **Erzeugt per Skript:** `npm run demo-projekt` schreibt PDFs und Notiz-Datei neu (feste Bytes,
  feste Zeit, also gleiche Kennungen). Ein Test prüft, dass Hashes, Stellen, Maßstab und
  Vorschläge zusammenpassen.
- **Alte Links:** `doc/?demo=muster` und `?demo=angebot` öffnen das Demo-Projekt. Die Startseite
  verlinkt `doc/?demo=projekt`.
- Die Demo wird nie gespeichert (wie bisher, 0046).
- Die x83-Musterdatei bleibt im Repo, weil viele Tests sie nutzen; die App bietet sie nicht
  mehr an.

## Verworfene Alternativen

- **Zweite Demo zusätzlich** – Nico will nur ein Projekt.
- **Notizen im Code zusammenbauen** – eine Notiz-Datei prüft zugleich den echten Ladeweg.
- **PDFs von Hand bauen und einchecken** – ohne Skript stimmen Lage und Kennung nach jeder
  Textänderung nicht mehr.

## Folgen

- Ändert jemand Demo-LV oder Texte, muss `npm run demo-projekt` laufen. Sonst schlägt
  `tests/pipeline/demoProjekt.test.ts` an.
- Die Startseite zeigt nur noch einen Demo-Knopf: „Demo-Projekt öffnen“.
