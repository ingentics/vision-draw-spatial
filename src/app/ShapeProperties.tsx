import { SPATIAL_PREFIX, spatialNumber, spatialValue } from '../engine';
import type { FieldValue, PropertySection, ShapeModel, ShapeProperty } from '../engine';
import { DeclaredField } from './DeclaredField';
import { useEnginePlugins } from './pluginsContext';

/**
 * Réglages propres à la forme sélectionnée (`properties` de sa définition) rangés dans une section du panneau : le
 * panneau ne connaît aucune forme, chacune déclare les siens.
 */
export function ShapePropertyFields({
  shape,
  section,
  onStyle,
  onSpatial,
}: {
  shape: ShapeModel;
  section: PropertySection;
  /** Clés de style de la forme (undefined = retirée). */
  onStyle: (patch: Record<string, string | undefined>) => void;
  /**
   * Attribut spatial (`spatial.…`) de la forme ; undefined = valeur par défaut. `merge` : réglage en direct, fusionné
   * en une étape d'annulation avec les précédents de même clé.
   */
  onSpatial: (key: string, value: number | string | undefined, merge?: string) => void;
}) {
  const plugins = useEnginePlugins();
  const properties = plugins.shapes.properties(shape).filter((property) => property.section === section);
  return (
    <>
      {properties.map((property) => (
        <PropertyField key={property.key} shape={shape} property={property} onStyle={onStyle} onSpatial={onSpatial} />
      ))}
    </>
  );
}

function PropertyField({
  shape,
  property,
  onStyle,
  onSpatial,
}: {
  shape: ShapeModel;
  property: ShapeProperty;
  onStyle: (patch: Record<string, string | undefined>) => void;
  onSpatial: (key: string, value: number | string | undefined, merge?: string) => void;
}) {
  const { key } = property;
  const spatial = key.startsWith(SPATIAL_PREFIX);
  const raw = spatial ? spatialValue(shape, key) : shape.style[key];
  // Valeur typée du champ : une case cochée par défaut tant que la clé est absente (`checkedByDefault`).
  const byDefault = property.type === 'toggle' && (property.checkedByDefault ?? false);
  const value =
    property.type === 'toggle'
      ? raw === undefined
        ? byDefault
        : raw === '1'
      : property.type === 'number'
        ? spatial
          ? spatialNumber(shape, key)
          : Number(raw) || undefined
        : raw;
  const write = (next: FieldValue | undefined, merge?: string) => {
    // Case : décocher écrit `0`, recocher retire la clé si elle est cochée par défaut, sinon écrit `1`.
    const written = typeof next === 'boolean' ? (next ? (byDefault ? undefined : '1') : '0') : next;
    if (spatial) onSpatial(key, written, merge);
    else onStyle({ [key]: written === undefined ? undefined : String(written) });
  };
  return <DeclaredField field={property} layout="panel" identity={shape.id} value={value} onChange={write} />;
}
