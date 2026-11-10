// Betonsortenliste als CSV (Entscheidung 0104): eine Zeile je Sorte, je Angabe zur
// Festlegung eine Spalte mit den gefundenen Werten oder dem Hinweis, wo sie fehlt.

import { csvText } from './csvText';
import { PFLICHTANGABEN, type BetonSorte, type BetonSortenListe } from '../beton/sorten';
import { formatNumber } from '../format';

export function angabeText(sorte: BetonSorte, key: string): string {
  const angabe = sorte.angaben.find((entry) => entry.key === key);
  if (angabe === undefined) return '';
  const werte = angabe.werte.join(', ');
  if (angabe.fehlt === 0) return werte;
  const hinweis = `fehlt in ${angabe.fehlt} von ${sorte.positions.length}`;
  return werte === '' ? hinweis : `${werte} (${hinweis})`;
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
