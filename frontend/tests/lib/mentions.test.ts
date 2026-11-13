// @-Verweise in Notizen und Notizen an Dokumentstellen (Entscheidung 0111).

import { describe, expect, it } from 'vitest';
import {
  addComment,
  EMPTY_ANNOTATIONS,
  fromStored,
  mentionsOf,
  rekey,
  toStored,
} from '../../src/lib/annotations';
import {
  addDocComment,
  EMPTY_DOC_NOTES,
  linkDocMark,
  markAt,
  mergeDocNotes,
  paintDocMark,
  removeDocComment,
  toDocMark,
  unpaintDocMark,
  type DocSpot,
} from '../../src/lib/docs/docNotes';
import {
  insertMention,
  mentionCandidates,
  mentionedIds,
  mentionQueryAt,
  mentionToken,
  parseMentions,
  plainMentions,
  rekeyMentions,
} from '../../src/lib/mentions';
import { matchNotes, mergeNotes, notesFileText, parseNotesFile } from '../../src/lib/notesFile';
import type { LVNode } from '../../src/types/lvNode';

const SPOT: DocSpot = { doc: 'abc123abc123', page: 4, start: 10, text: 'Sichtbeton SB2' };

describe('Verweise im Text', () => {
  it('zerlegt Text und Verweise und findet erwähnte Positionen', () => {
    const text = `Wie ${mentionToken('position:01.10')} und ${mentionToken('position:01.20')}.`;
    expect(parseMentions(text)).toEqual([
      { kind: 'text', text: 'Wie ' },
      { kind: 'mention', id: 'position:01.10' },
      { kind: 'text', text: ' und ' },
      { kind: 'mention', id: 'position:01.20' },
      { kind: 'text', text: '.' },
    ]);
    expect(mentionedIds(`${text} ${mentionToken('position:01.10')}`)).toEqual([
      'position:01.10',
      'position:01.20',
    ]);
    expect(parseMentions('ohne')).toEqual([{ kind: 'text', text: 'ohne' }]);
  });

  it('schlüsselt um und lässt Unbekannte stehen', () => {
    const text = `${mentionToken('a')} ${mentionToken('x')}`;
    expect(rekeyMentions(text, new Map([['a', 'hash-a']]))).toBe('@[hash-a] @[x]');
  });

  it('zeigt Verweise als @OZ für Tabelle und Export', () => {
    const ozOf = (id: string): string | null => (id === 'a' ? '01.10' : null);
    expect(plainMentions(`Siehe ${mentionToken('a')}, ${mentionToken('b')}`, ozOf)).toBe(
      'Siehe @01.10, @?',
    );
  });

  it('erkennt einen begonnenen Verweis, aber keine E-Mail-Adresse', () => {
    expect(mentionQueryAt('Siehe @bod', 10)).toEqual({ start: 6, query: 'bod' });
    expect(mentionQueryAt('@', 1)).toEqual({ start: 0, query: '' });
    expect(mentionQueryAt('nico@firma', 10)).toBeNull();
    expect(mentionQueryAt('Siehe @a\nb', 10)).toBeNull();
  });

  it('setzt den Verweis ein und den Cursor dahinter', () => {
    const query = mentionQueryAt('Siehe @bod', 10);
    expect(query).not.toBeNull();
    if (query === null) return;
    expect(insertMention('Siehe @bod', 10, query, 'p1')).toEqual({
      text: 'Siehe @[p1] ',
      cursor: 12,
    });
  });

  it('schlägt erst passende OZ, dann Kurztext vor', () => {
    const list = [
      { id: 'a', oz: '01.02.0010', shortText: 'Bodenplatte C30/37' },
      { id: 'b', oz: '02.01.0010', shortText: 'Schalung Bodenplatte' },
      { id: 'c', oz: '03.0010', shortText: 'Wand' },
    ];
    expect(mentionCandidates(list, '01.02').map((hit) => hit.id)).toEqual(['a']);
    expect(mentionCandidates(list, 'bodenplatte').map((hit) => hit.id)).toEqual(['a', 'b']);
    expect(mentionCandidates(list, 'schalung boden').map((hit) => hit.id)).toEqual(['b']);
    expect(mentionCandidates(list, '  ')).toEqual([]);
  });
});

describe('Notizen an Dokumentstellen', () => {
  it('legt eine Stelle ohne Farbe an und entfernt sie mit der letzten Notiz', () => {
    const one = addDocComment(EMPTY_DOC_NOTES, SPOT, '  Prüfen  ', 5);
    expect(markAt(one, SPOT)).toMatchObject({
      paint: null,
      links: [],
      comments: [{ at: 5, text: 'Prüfen' }],
    });
    expect(addDocComment(one, SPOT, '   ', 6)).toBe(one);
    expect(removeDocComment(one, SPOT, 0).marks).toEqual([]);
  });

  it('behält Notizen beim Anstreichen, Verknüpfen und Farbe wegnehmen', () => {
    let notes = addDocComment(EMPTY_DOC_NOTES, SPOT, 'Notiz', 5);
    notes = paintDocMark(notes, SPOT, 'gelb', 6);
    notes = linkDocMark(notes, SPOT, ['p1'], 7);
    notes = unpaintDocMark(notes, SPOT);
    expect(markAt(notes, SPOT)).toMatchObject({
      paint: null,
      links: ['p1'],
      comments: [{ at: 5, text: 'Notiz' }],
    });
  });

  it('liest Notizen aus dem Speicher und führt gleiche nur einmal zusammen', () => {
    const notes = addDocComment(EMPTY_DOC_NOTES, SPOT, 'Notiz', 5);
    const stored = JSON.parse(JSON.stringify(notes.marks[0])) as unknown;
    expect(toDocMark(stored)?.comments).toEqual([{ at: 5, text: 'Notiz' }]);
    const more = addDocComment(notes, SPOT, 'Zweite', 9);
    const merged = mergeDocNotes(notes, more);
    expect(markAt(merged, SPOT)?.comments?.map((comment) => comment.text)).toEqual([
      'Notiz',
      'Zweite',
    ]);
    expect(mergeDocNotes(merged, more)).toBe(merged);
  });
});

describe('Erwähnungen einer Position', () => {
  it('sammelt Kommentare anderer Positionen und Notizen in Dokumenten nach Zeit', () => {
    let notes = addComment(EMPTY_ANNOTATIONS, 'p2', `Erst nach ${mentionToken('p1')}`, 30);
    notes = addComment(notes, 'p1', `Selbst ${mentionToken('p1')}`, 10);
    notes = {
      ...notes,
      documents: addDocComment(notes.documents, SPOT, `Für ${mentionToken('p1')}`, 20),
    };
    const found = mentionsOf(notes, 'p1');
    expect(found.map((item) => item.source.kind)).toEqual(['doc', 'position']);
    expect(found[1].source).toEqual({ kind: 'position', id: 'p2' });
    expect(mentionsOf(notes, 'p3')).toEqual([]);
  });

  it('speichert Verweise unter dem Hash und findet sie nach dem Laden wieder', () => {
    let notes = addComment(EMPTY_ANNOTATIONS, 'p2', `Wie ${mentionToken('p1')}`, 30);
    notes = {
      ...notes,
      documents: addDocComment(notes.documents, SPOT, `Für ${mentionToken('p1')}`, 20),
    };
    const toHash = new Map([
      ['p1', 'h1'],
      ['p2', 'h2'],
    ]);
    const stored = JSON.parse(JSON.stringify(toStored(rekey(notes, toHash)))) as unknown;
    expect(JSON.stringify(stored)).toContain('@[h1]');
    expect(JSON.stringify(stored)).not.toContain('@[p1]');
    const back = rekey(
      fromStored(stored),
      new Map([
        ['h1', 'p1'],
        ['h2', 'p2'],
      ]),
    );
    expect(mentionsOf(back, 'p1')).toHaveLength(2);
  });
});

function pos(id: string, oz: string, hash: string): LVNode {
  return {
    id,
    kind: 'position',
    code: oz,
    children: [],
    position: {
      oz,
      shortText: `Kurztext ${oz}`,
      longText: '',
      unit: 'm3',
      quantity: 1,
      unitPrice: null,
      positionType: 'normal',
      attributes: {},
      hashes: { id: hash, oz: `oz-${oz}`, text: `t-${hash}`, menge: 'menge' },
    },
  } as unknown as LVNode;
}

describe('Arbeitsstand-Datei', () => {
  it('nimmt Notizen an Dokumentstellen und Verweise mit, unter dem Hash', () => {
    const nodes = [pos('p1', '01.10', 'h1'), pos('p2', '01.20', 'h2')];
    let notes = addComment(EMPTY_ANNOTATIONS, 'p2', `Wie ${mentionToken('p1')}`, 30);
    notes = {
      ...notes,
      documents: addDocComment(notes.documents, SPOT, `Für ${mentionToken('p1')}`, 20),
    };
    const text = notesFileText(notes, nodes, { fileName: 'lv.x83', fileId: null }, 1000);
    expect(text).toContain('@[h1]');
    expect(text).not.toContain('@[p1]');

    // In eine neue Sitzung mit anderen Knoten-IDs laden.
    const later = [pos('n1', '01.10', 'h1'), pos('n2', '01.20', 'h2')];
    const file = parseNotesFile(text);
    const { same, byHash } = matchNotes(file, later);
    const merged = mergeNotes(EMPTY_ANNOTATIONS, same, file.dokumente, undefined, byHash);
    const found = mentionsOf(merged, 'n1');
    expect(found.map((item) => item.text)).toEqual(['Für @[n1]', 'Wie @[n1]']);
  });
});
