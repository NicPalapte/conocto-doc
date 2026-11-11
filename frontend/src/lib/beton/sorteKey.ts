// Schlüssel einer Betonsorte (Entscheidung 0104), ohne Materialtabelle: so kann ihn auch
// der Worker für Vorschläge im Dokument bilden (Entscheidung 0106).

const EXPO_ORDER = ['X0', 'XC', 'XD', 'XS', 'XF', 'XA', 'XM'];

function expoRank(klasse: string): number {
  const group = klasse === 'X0' ? 'X0' : klasse.slice(0, 2);
  const rank = EXPO_ORDER.indexOf(group);
  return (rank < 0 ? EXPO_ORDER.length : rank) * 10 + (Number(klasse.slice(2)) || 0);
}

/** Expositionsklassen in Normreihenfolge: X0, XC, XD, XS, XF, XA, XM. */
export function sortExpo(values: readonly string[]): string[] {
  return [...values].sort((a, b) => expoRank(a) - expoRank(b));
}

/** Anzeigetext der Sorte: „C30/37 · XC4, XF1 · WF“. */
export function sorteKeyOf(
  festigkeit: string,
  expo: readonly string[],
  feuchte: readonly string[],
): string {
  return [festigkeit, sortExpo(expo).join(', '), feuchte.join(', ')]
    .filter((part) => part !== '')
    .join(' · ');
}
