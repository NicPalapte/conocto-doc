# 0101 – „Arbeitsstand“ statt „Notizen“ für die gesicherte Datei

- **Status:** akzeptiert
- **Datum:** 2026-11-09
- **Betrifft:** `frontend/src/lib/notesFile.ts`, Logo-Menü (`AboutMenu.tsx`), Ladefenster
  (`NotesImportDialog.tsx`), Startseite (`FileDropzone.tsx`)
- **Ersetzt in Teilen:** 0061 (Name der Datei und Kennung `conocto-notizen`)

## Worum geht's

- Die Datei aus „Notizen sichern“ (0061) enthält längst mehr als Notizen: Fortschritt,
  „Wichtig“, Kommentare, Textmarkierungen samt Farbnamen, Stellen in Begleit-PDFs mit
  Verknüpfung, abgelehnte Vorschläge, Seitenart, Maßstab, Messungen und VA-Mengen.
- Nico: „Notizen“ ist dafür nicht mehr der richtige Begriff (07.11.2026). Gewählt am
  09.11.2026 aus drei Vorschlägen. Reine Umbenennung, keine neue Funktion (Feature-Freeze).

## Entscheidung

- **Begriff in der App:** „Arbeitsstand“. Menügruppe „Mein Arbeitsstand“ mit
  „Arbeitsstand sichern“ und „Arbeitsstand laden…“; Startseite „Arbeitsstand sichern + löschen“.
- **Dateiname:** `<LV-Name>-arbeitsstand-<Datum>.json`. Das Format bleibt JSON.
- **Kennung:** `art: "conocto-arbeitsstand"`, `version: 5`. Inhalt wie Version 4.
- **Alte Dateien:** `conocto-notizen` mit Version 1 bis 4 wird weiter gelesen.
- **Bleibt gleich:** die Zähl-Ereignisse `notizen-gesichert` und `notizen-geladen`
  (sonst bricht die Statistik ab), der IndexedDB-Schlüssel `notizen` und die Datei des
  Demo-Projekts (`conocto-demo-notizen.json`, alte Kennung – prüft so nebenbei das Lesen
  alter Dateien). Die Notizen im Fenster „Dokument“ heißen weiter Notizen; sie sind keine Datei.

## Folgen

- Ältere App-Fassungen lesen eine neue Arbeitsstand-Datei nicht mehr („keine Datei von
  Conocto“). Es gibt nur die eine öffentliche Fassung, deshalb ohne Belang.

## Verworfene Alternativen

- **„Bearbeitung“** – klingt nach einem Vorgang, nicht nach einer Datei.
- **„Projektdatei“ mit eigener Endung `.conocto`** – verspricht, dass das LV selbst drin ist;
  eigene Endung lässt sich nicht mehr mit jedem Programm öffnen.
- **Alte Kennung behalten, nur Texte ändern** – Datei und App würden verschieden heißen.
