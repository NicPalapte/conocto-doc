// Betonsortenliste als CSV (Entscheidung 0104): eine Zeile je Sorte, je Angabe zur
// Festlegung eine Spalte mit den gefundenen Werten oder dem Hinweis, wo sie fehlt. Steht
// sie nur in einem verknüpften Dokument, heißt es „fehlt im LV“ (Entscheidung 0106).

import { csvText } from './csvText';
import {
  PFLICHTANGABEN,
  type Angabe,
  type BetonSorte,
  type BetonSortenListe,
} from '../beton/sorten';
import { formatNumber } from '../format';

/** Stand einer Angabe: im LV, nur im verknüpften Dokument, oder (auch) gar nicht. */
export type AngabeStand = 'lv' | 'dokument' | 'fehlt';

export function angabeStand(angabe: Angabe): AngabeStand {
  if (angabe.fehlt === 0) return 'lv';
  return angabe.nurImDokument === angabe.fehlt ? 'dokument' : 'fehlt';
}

export function angabeText(sorte: BetonSorte, key: string): string {
  const angabe = sorte.angaben.find((entry) => entry.key === key);
  if (angabe === undefined) return '';
  const werte = angabe.werte.join(', ');
  if (angabe.fehlt === 0) return werte;
  const alle = sorte.positions.length;
  const teil = angabe.fehlt < alle ? ` in ${angabe.fehlt} von ${alle}` : '';
  const hinweis =
    angabeStand(angabe) === 'dokument'
      ? `fehlt im LV${teil}`
      : `fehlt in ${angabe.fehlt} von ${alle}`;
  const dokument =
    angabe.imDokument.length === 0 ? '' : `im Dokument: ${angabe.imDokument.join(', ')}`;
  const gefunden = [werte, dokument].filter((part) => part !== '').join(' · ');
  return gefunden === '' ? hinweis : `${gefunden} (${hinweis})`;
}

export function betonSortenCsv(liste: BetonSortenListe): string {
  const kopf = [
    'Sorte',
    'Positionen',
    'Menge',
    'Einheit',
    'Bauweise',
    'Stahl/Fasern',
    ...PFLICHTANGABEN.map((angabe) => angabe.label),
  ];
  const zeilen = liste.sorten.map((sorte) => {
    const menge = sorte.mengen[0];
    return [
      sorte.key,
      String(sorte.positions.length),
      menge === undefined ? '' : formatNumber(menge.sum),
      menge?.label ?? '',
      sorte.bauweise.join(', '),
      sorte.stahlFasern.join(', '),
      ...PFLICHTANGABEN.map((angabe) => angabeText(sorte, angabe.key)),
    ];
  });
  return csvText([kopf, ...zeilen]);
}
