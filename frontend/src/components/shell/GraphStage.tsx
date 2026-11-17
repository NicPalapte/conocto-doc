// Der Graph mit allem, was fest zu ihm gehört: Legende und Steuerung (GraphHeader,
// im Graphen selbst, weil sie seine Breite braucht). Kennzahlen stehen nur im
// Überblick (Entscheidung 0105). Steht als
// Bereich im Splitscreen oder im eigenen Browserfenster — die Hülle muss `relative` sein.

import { BubbleGraph } from '../graph/BubbleGraph';
import type { LVNode } from '../../types/lvNode';

export function GraphStage({ root }: { root: LVNode }) {
  return <BubbleGraph root={root} />;
}
