import type { ShapeModel } from '../engine/model/types';
import { defaultShapeRegistry } from '../engine/shapes/registry';
import type { PropertySection, ShapeProperty } from '../engine/shapes/types';
import { SPATIAL_PREFIX, spatialNumber, spatialValue } from '../engine/spatial';
import { NumberField, TextField } from './Fields';

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
  /** Attribut spatial (`spatial.…`) de la forme ; undefined = valeur par défaut. */
  onSpatial: (key: string, value: number | string | undefined) => void;
}) {
  const properties = defaultShapeRegistry.properties(shape).filter((property) => property.section === section);
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
  onSpatial: (key: string, value: number | string | undefined) => void;
}) {
  const { key } = property;
  const spatial = key.startsWith(SPATIAL_PREFIX);
  const value = spatial ? spatialValue(shape, key) : shape.style[key];
  const write = (next: number | string | undefined) =>
    spatial ? onSpatial(key, next) : onStyle({ [key]: next === undefined ? undefined : String(next) });
  switch (property.type) {
    case 'toggle':
      return (
        <label className="field toggle">
          <input
            type="checkbox"
            checked={value === '1'}
            onChange={(event) => write(event.target.checked ? '1' : '0')}
          />
          {property.label}
        </label>
      );
    case 'number': {
      const number = spatial ? spatialNumber(shape, key) : Number(value) || undefined;
      return (
        <NumberField
          key={`${shape.id}:${key}:${number ?? ''}`}
          label={property.label}
          title={property.title ?? property.label}
          value={number}
          placeholder={property.placeholder ?? ''}
          onCommit={write}
        />
      );
    }
    case 'text':
      return (
        <TextField
          key={`${shape.id}:${key}:${value ?? ''}`}
          label={property.label}
          title={property.title ?? property.label}
          value={value ?? ''}
          placeholder={property.placeholder}
          onCommit={(text) => write(text.trim() || undefined)}
        />
      );
  }
}
