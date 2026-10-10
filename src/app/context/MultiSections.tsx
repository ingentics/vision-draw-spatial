import { ArrangeSection } from '../ArrangeSection';
import { BorderSection } from '../BorderSection';
import { OrderSection } from '../OrderSection';
import { OrientSection } from '../OrientSection';
import { Section } from '../PanelSection';
import { ShapePropertyFields } from '../ShapeProperties';
import { useEnginePlugins } from '../pluginsContext';
import { EdgeEndsSection } from './EdgeLineSections';
import { DeleteButton, StyleGrid, plural } from './contextFields';
import type { ContextPanelProps } from './types';

/** Sections du panneau contextuel pour une sélection de plusieurs éléments. */

export function MultiSections(props: ContextPanelProps) {
  const plugins = useEnginePlugins();
  const { shapes, edges } = props;
  // La dernière forme dont on choisit le style sert d'aperçu et de style courant ; sans elle (que des formes aux
  // couleurs imposées, sujet 440), ni Style ni Bordure.
  const current = shapes.filter((shape) => plugins.shapes.styleable(shape)).at(-1);
  return (
    <>
      <Section title="Sélection">
        <div className="field-row">
          Contenu
          <span className="field-value">
            {[shapes.length > 0 && plural(shapes.length, 'forme'), edges.length > 0 && plural(edges.length, 'flèche')]
              .filter(Boolean)
              .join(', ')}
          </span>
        </div>
        <p className="panel-hint">{props.multiSelectKey} + clic : ajouter ou retirer un élément.</p>
      </Section>
      <ArrangeSection
        shapeCount={shapes.length}
        reference={props.alignReference}
        onReference={props.onAlignReference}
        onAlign={props.onAlign}
        onDistribute={props.onDistribute}
      />
      <OrientSection shapes={shapes} onOrient={props.onOrient} />
      {current && (
        <Section title="Style">
          <StyleGrid presets={props.styles.base} shape={current} onApply={props.onApplyStyle} />
          <StyleGrid presets={props.styles.extended} shape={current} onApply={props.onApplyStyle} />
          {edges.length > 0 && <p className="panel-hint">Appliqué aux formes de la sélection.</p>}
        </Section>
      )}
      {current && (
        <BorderSection shape={current} onChange={props.onShapeStyle}>
          <ShapePropertyFields
            shape={current}
            section="border"
            onStyle={props.onShapeStyle}
            onSpatial={props.onSpatial}
          />
        </BorderSection>
      )}
      {edges.length > 0 && !edges.some((edge) => plugins.managesEdge(edge.id)) && (
        <EdgeEndsSection edge={edges[edges.length - 1]!} onChange={props.onEdgeStyle} onReverse={props.onReverse} />
      )}
      <OrderSection onOrder={props.onOrder} />
      <DeleteButton onDelete={props.onDelete} />
    </>
  );
}
