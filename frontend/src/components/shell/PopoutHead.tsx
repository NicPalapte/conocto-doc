// Kopf für Graph, Tabelle und Dokument im eigenen Browserfenster (Entscheidungen 0039,
// 0102): die ganze Kopfleiste wie im Hauptfenster, auf demselben Filterzustand. Nur ob die
// Filterleiste offen ist, gilt je Fenster — sonst klappte sie im anderen Fenster mit auf.

import { useState } from 'react';
import { FilterBar } from '../filter/FilterBar';
import { TopBar } from '../layout/TopBar';

export function PopoutHead() {
  const [filterOpen, setFilterOpen] = useState(false);
  return (
    <header className="relative z-[20] shrink-0">
      <TopBar popout filterOpen={filterOpen} onFilterOpen={setFilterOpen} />
      <FilterBar open={filterOpen} onClose={() => setFilterOpen(false)} />
    </header>
  );
}
