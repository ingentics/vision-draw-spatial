import { useRef } from 'react';
import { defaultShapeRegistry, SPATIAL_PREFIX, spatialNumber, spatialValue } from '../engine';
import type { PropertySection, ShapeModel, ShapeProperty } from '../engine';
import { NumberField, TextField } from './Fields';

/** Numéro du prochain passage dans un champ (clé de fusion des frappes, unique pour toute la session). */
let nextPass = 0;

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
  onSpatial: (key: string, value: number | string | undefined, merge?: string) => void;
}) {
  const { key } = property;
  // Une étape d'annulation par passage dans un champ : les frappes d'un même passage sont fusionnées.
  const session = useRef(nextPass++);
  const spatial = key.startsWith(SPATIAL_PREFIX);
  const value = spatial ? spatialValue(shape, key) : shape.style[key];
  const write = (next: number | string | undefined, merge?: string) =>
    spatial ? onSpatial(key, next, merge) : onStyle({ [key]: next === undefined ? undefined : String(next) });
  switch (property.type) {
    case 'toggle': {
      const byDefault = property.checkedByDefault ?? false;
      return (
        <label className="field toggle">
          <input
            type="checkbox"
            checked={value === undefined ? byDefault : value === '1'}
            onChange={(event) => write(event.target.checked ? (byDefault ? undefined : '1') : '0')}
          />
          {property.label}
        </label>
      );
    }
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
          key={`${shape.id}:${key}`}
          label={property.label}
          title={property.title ?? property.label}
          value={value ?? ''}
          placeholder={property.placeholder}
          // En direct pour un attribut spatial : le dessin suit la saisie (ex. mot de la tranche).
          onLive={
            spatial ? (text) => write(text.trim() || undefined, `${shape.id}:${key}:${session.current}`) : undefined
          }
          onCommit={(text) => {
            write(text.trim() || undefined, `${shape.id}:${key}:${session.current}`);
            session.current = nextPass++;
          }}
        />
      );
  }
}
