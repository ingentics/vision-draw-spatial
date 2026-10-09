import { SPATIAL, commentOf, matchesPreset, spatialNumber } from '../../engine';
import type { ShapeModel } from '../../engine';
import { BorderSection } from '../BorderSection';
import { NumberField } from '../Fields';
import { OrderSection } from '../OrderSection';
import { OrientSection } from '../OrientSection';
import { Section } from '../PanelSection';
import { ShapePropertyFields } from '../ShapeProperties';
import { CommentField } from '../comment';
import { useEnginePlugins } from '../pluginsContext';
import { ElementModeSection } from './ModeSections';
import { DeleteButton, LabelRow, LinkField, StyleGrid } from './contextFields';
import type { ContextPanelProps } from './types';

/** Sections du panneau contextuel pour une forme sélectionnée seule. */

export function ShapeSections({ shape, ...props }: ContextPanelProps & { shape: ShapeModel }) {
  const plugins = useEnginePlugins();
  const known = [...props.styles.base, ...props.styles.extended];
  return (
    <>
      <Section title="Texte">
        <LabelRow label={shape.label} onEdit={props.onEditLabel} />
        <CommentField comment={commentOf(shape)} onEdit={props.onEditComment} />
      </Section>
      <ShapeOwnSection shape={shape} onShapeStyle={props.onShapeStyle} onSpatial={props.onSpatial} />
      <ElementModeSection {...props} element={shape} scope="shape" />
      <OrientSection shapes={[shape]} onOrient={props.onOrient} />
      <Section title="Style">
        <StyleGrid presets={props.styles.base} shape={shape} onApply={props.onApplyStyle} />
        <StyleGrid presets={props.styles.extended} shape={shape} onApply={props.onApplyStyle} />
        {known.every((preset) => !matchesPreset(shape.style, preset)) && (
          <p className="panel-hint">Style actuel : couleurs personnalisées.</p>
        )}
      </Section>
      <BorderSection shape={shape} onChange={props.onShapeStyle}>
        <ShapePropertyFields shape={shape} section="border" onStyle={props.onShapeStyle} onSpatial={props.onSpatial} />
      </BorderSection>
      {/* Volume : seulement si le mode de la page permet l'iso ou la 3D (sujet 260). */}
      {(plugins.modes.allowsViewMode(props.page, 'iso') || plugins.modes.allowsViewMode(props.page, '3d')) && (
        <Section title="Volume">
          <NumberField
            key={`h:${shape.id}:${spatialNumber(shape, SPATIAL.height) ?? ''}`}
            label="Épaisseur"
            title="Épaisseur du volume en vue iso (spatial.height) ; vide = réglage par défaut"
            value={spatialNumber(shape, SPATIAL.height)}
            placeholder={String(props.defaultDepth)}
            onCommit={(value) => props.onSpatial(SPATIAL.height, value)}
          />
          <NumberField
            key={`e:${shape.id}:${spatialNumber(shape, SPATIAL.elevation) ?? ''}`}
            label="Élévation"
            title="Hauteur au-dessus du sol ou du conteneur en vue iso (spatial.elevation)"
            value={spatialNumber(shape, SPATIAL.elevation)}
            placeholder="0"
            onCommit={(value) => props.onSpatial(SPATIAL.elevation, value)}
          />
          <ShapePropertyFields
            shape={shape}
            section="volume"
            onStyle={props.onShapeStyle}
            onSpatial={props.onSpatial}
          />
        </Section>
      )}
      <Section title="Lien">
        <LinkField link={shape.link} pageId={props.page.id} pages={props.pages} onLink={props.onLink} />
      </Section>
      <OrderSection onOrder={props.onOrder} />
      <DeleteButton onDelete={props.onDelete} />
    </>
  );
}

/**
 * Section de la forme elle-même : ses paramètres d'instance (`properties` de section `shape`), titrée du nom de la
 * forme dans la palette. Absente si la forme n'en déclare pas.
 */
function ShapeOwnSection({
  shape,
  onShapeStyle,
  onSpatial,
}: {
  shape: ShapeModel;
  onShapeStyle: ContextPanelProps['onShapeStyle'];
  onSpatial: ContextPanelProps['onSpatial'];
}) {
  const plugins = useEnginePlugins();
  if (!plugins.shapes.properties(shape).some((property) => property.section === 'shape')) return null;
  return (
    <Section title={plugins.shapes.templateOf(shape)?.name ?? 'Forme'}>
      <ShapePropertyFields shape={shape} section="shape" onStyle={onShapeStyle} onSpatial={onSpatial} />
    </Section>
  );
}
