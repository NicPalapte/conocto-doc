// Kopf für Graph, Tabelle und Dokument im eigenen Browserfenster (Entscheidungen 0039,
// 0102): die ganze Kopfleiste wie im Hauptfenster, auf demselben Filterzustand. Nur ob die
// Filterleiste offen ist, gilt je Fenster — sonst klappte sie im anderen Fenster mit auf.

import { useState, type ReactNode } from 'react';
import { FilterBar } from '../filter/FilterBar';
import { TopBar } from '../layout/TopBar';

/** `end`: Knöpfe des Fensters rechts in der Kopfleiste statt in einer eigenen Titelzeile. */
export function PopoutHead({ end }: { end?: ReactNode } = {}) {
  const [filterOpen, setFilterOpen] = useState(false);
  return (
    <header className="relative z-[20] shrink-0">
      <TopBar popout filterOpen={filterOpen} onFilterOpen={setFilterOpen} end={end} />
      <FilterBar open={filterOpen} onClose={() => setFilterOpen(false)} />
    </header>
  );
}
