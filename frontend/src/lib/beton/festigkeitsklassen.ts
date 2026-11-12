// Druckfestigkeitsklassen nach DIN EN 206 / DIN 1045-2 (Normal- und Schwerbeton, Leichtbeton).
// Nur diese zählen als Betonsorte: „C100/0“ (Asphaltbinder) oder „C2/3“ sehen aus wie eine
// Klasse, sind aber keine (Issue #191, 12.11.2026; Liste von Nico bestätigt).

const NORMALBETON = [
  'C8/10',
  'C12/15',
  'C16/20',
  'C20/25',
  'C25/30',
  'C30/37',
  'C35/45',
  'C40/50',
  'C45/55',
  'C50/60',
  'C55/67',
  'C60/75',
  'C70/85',
  'C80/95',
  'C90/105',
  'C100/115',
];

const LEICHTBETON = [
  'LC8/9',
  'LC12/13',
  'LC16/18',
  'LC20/22',
  'LC25/28',
  'LC30/33',
  'LC35/38',
  'LC40/44',
  'LC45/50',
  'LC50/55',
  'LC55/60',
  'LC60/66',
  'LC70/77',
  'LC80/88',
];

const KLASSEN: ReadonlySet<string> = new Set(
  [...NORMALBETON, ...LEICHTBETON].map((klasse) => klasse.toLowerCase()),
);

/** „C30/37“, „c 30/37“, „LC25/28“ → ja; „C100/0“, „C2/3“ → nein. */
export function istFestigkeitsklasse(text: string): boolean {
  return KLASSEN.has(text.toLowerCase().replace(/\s+/g, ''));
}
