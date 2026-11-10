// Der Graph mit allem, was fest zu ihm gehört: Legende und Steuerung (GraphHeader,
// im Graphen selbst, weil sie seine Breite braucht). Die Kennzahlen stehen nur im
// Überblick, nicht mehr über dem Graphen (Nico, 10.11.2026: aufgeräumter). Steht als
// Bereich im Splitscreen oder im eigenen Browserfenster — die Hülle muss `relative` sein.

import { BubbleGraph } from '../graph/BubbleGraph';
import type { LVNode } from '../../types/lvNode';

export function GraphStage({ root }: { root: LVNode }) {
  return <BubbleGraph root={root} />;
}
