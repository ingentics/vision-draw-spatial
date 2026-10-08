import { useEffect, useState } from 'react';
import type { Engine, MiniGraph } from '../engine';

interface MiniGraphState {
  graph: MiniGraph | undefined;
  pageId: string | undefined;
  graphView: boolean;
  accent: string;
  node: string;
  link: string;
}

function readState(engine: Engine, size: number): MiniGraphState {
  const settings = engine.getSettings();
  return {
    graph: engine.getMiniGraph(size),
    pageId: engine.getCurrentPage()?.id,
    graphView: engine.isGraphView(),
    accent: settings.selection.accentColor,
    node: settings.minimap.outlineColor,
    link: settings.minimap.edgeColor,
  };
}

/**
 * Mini-graphe (sujet 366), à gauche de la mini-carte : graphe des pages en disques (sujet 367), la page courante en
 * couleur d'accent, le reste en gris (comme l'icône de l'onglet « Vue graphe »). Lecture seule ; absent en vue graphe, où il ferait
 * doublon.
 */
export function MiniGraphView({
  engine,
  visible,
  size,
  onToggle,
}: {
  engine: Engine | undefined;
  visible: boolean;
  size: number;
  /** Absent : l'hôte gère l'affichage, pas de bouton. */
  onToggle: (() => void) | undefined;
}) {
  const [state, setState] = useState<MiniGraphState>();

  useEffect(() => {
    if (!engine) return;
    const update = () => setState(readState(engine, size));
    update();
    const subscriptions = (['load', 'pageChange', 'documentChange', 'settingsChange'] as const).map((event) =>
      engine.on(event, update),
    );
    return () => {
      for (const unsubscribe of subscriptions) unsubscribe();
    };
  }, [engine, size]);

  if (!state?.graph || state.graphView) return null;
  const { graph } = state;
  if (!visible)
    return onToggle ? (
      <div className="drawio-minigraph">
        <button type="button" className="drawio-minimap-show" title="Afficher le mini-graphe (G)" onClick={onToggle}>
          Mini-graphe
        </button>
      </div>
    ) : null;
  return (
    <div className="drawio-minigraph">
      <svg
        width={graph.width}
        height={graph.height}
        viewBox={`0 0 ${graph.width} ${graph.height}`}
        role="img"
        aria-label="Mini-graphe des pages, page courante en bleu"
      >
        <defs>
          <marker
            id="drawio-minigraph-arrow"
            viewBox="0 0 6 6"
            refX={6}
            refY={3}
            markerWidth={5}
            markerHeight={5}
            markerUnits="userSpaceOnUse"
            orient="auto"
          >
            <path d="M0,0 L6,3 L0,6 z" fill={state.link} />
          </marker>
        </defs>
        {graph.links.map((link, i) => (
          <line
            key={i}
            x1={link.from.x}
            y1={link.from.y}
            x2={link.to.x}
            y2={link.to.y}
            stroke={state.link}
            strokeWidth={1}
            markerEnd="url(#drawio-minigraph-arrow)"
          />
        ))}
        {graph.nodes.map(({ pageId, rect }) => (
          <circle
            key={pageId}
            cx={rect.x + rect.width / 2}
            cy={rect.y + rect.height / 2}
            r={rect.width / 2}
            fill={pageId === state.pageId ? state.accent : state.node}
          />
        ))}
      </svg>
      {onToggle && (
        <button
          type="button"
          className="drawio-minimap-toggle"
          aria-label="Masquer le mini-graphe (G)"
          title="Masquer le mini-graphe (G)"
          onClick={onToggle}
        >
          ×
        </button>
      )}
    </div>
  );
}
