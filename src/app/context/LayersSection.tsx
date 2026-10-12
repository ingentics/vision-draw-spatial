import type { LayerModel, PageLayersView, PageModel } from '../../engine';
import { InlineEdit } from '../InlineEdit';
import { Section } from '../PanelSection';

/** Opérations sur les calques de la page affichée (sujet 523) ; absentes si la page n'est pas modifiable. */
export interface LayerActions {
  choose: (layerId: string) => void;
  add: () => void;
  rename: (layerId: string, name: string) => void;
  move: (layerId: string, direction: 'up' | 'down') => void;
  remove: (layerId: string) => void;
  setVisible: (layerId: string, visible: boolean) => void;
  setLocked: (layerId: string, locked: boolean) => void;
  /** Élévation en iso et en 3D (sujet 524) ; 0 : au sol. */
  setElevation: (layerId: string, elevation: number) => void;
}

/** Nom affiché d'un calque : le calque créé d'office n'a pas de nom. */
export function layerName(layer: LayerModel): string {
  return layer.name || 'Principal';
}

/**
 * Calques de la page (sujet 523), du plus haut (dessiné au-dessus) au plus bas : œil, cadenas, nom (clic : calque
 * courant, double-clic : renommer), élévation (iso et 3D, sujet 524), nombre d'éléments, monter, descendre, supprimer.
 */
export function LayersSection({
  page,
  layers,
  actions,
  elevations,
  onFlatten,
}: {
  page: PageModel;
  layers: PageLayersView;
  actions: LayerActions | undefined;
  /** Champ d'élévation de chaque calque et bouton Aplatir / Étendre (vues iso et 3D). */
  elevations: boolean;
  /** Aplatit ou étend les calques (sujet 526) : rien n'est écrit, donc aussi en lecture seule. */
  onFlatten: ((flattened: boolean) => void) | undefined;
}) {
  const counts = new Map<string, number>();
  for (const element of [...page.shapes, ...page.edges])
    if (element.parentId === undefined) counts.set(element.layerId, (counts.get(element.layerId) ?? 0) + 1);
  const ordered = [...layers.layers].reverse();
  return (
    <Section title="Calques">
      <ul className="flow-list layer-list">
        {ordered.map((layer, index) => (
          <LayerRow
            key={`${layer.id}:${layer.name}`}
            layer={layer}
            count={counts.get(layer.id) ?? 0}
            current={layer.id === layers.current}
            top={index === 0}
            bottom={index === ordered.length - 1}
            last={ordered.length === 1}
            elevation={elevations}
            actions={actions}
          />
        ))}
      </ul>
      <div className="layer-actions">
        {elevations && onFlatten && (
          <button
            type="button"
            className="button"
            aria-pressed={layers.flattened}
            disabled={!layers.layers.some((layer) => layer.elevation > 0)}
            data-tip={
              layers.flattened
                ? 'Étendre : chaque calque remonte à son élévation'
                : 'Aplatir : tous les calques redescendent au sol, le temps de travailler à plat (rien n’est écrit)'
            }
            onClick={() => onFlatten(!layers.flattened)}
          >
            {layers.flattened ? 'Étendre' : 'Aplatir'}
          </button>
        )}
        {actions && (
          <button
            type="button"
            className="button"
            data-tip="Nouveau calque au-dessus de tous, qui devient le calque courant"
            onClick={actions.add}
          >
            Ajouter un calque
          </button>
        )}
      </div>
      <p className="panel-hint">
        Calque courant (en gras) : ce qu’on dépose, tire ou colle y va. Double-clic sur un nom pour le renommer.
      </p>
    </Section>
  );
}

function LayerRow({
  layer,
  count,
  current,
  top,
  bottom,
  last,
  elevation,
  actions,
}: {
  layer: LayerModel;
  count: number;
  current: boolean;
  top: boolean;
  bottom: boolean;
  /** Seul calque de la page : il ne se supprime pas. */
  last: boolean;
  elevation: boolean;
  actions: LayerActions | undefined;
}) {
  const name = layerName(layer);
  return (
    <li
      className={current ? 'flow-item layer-item current' : 'flow-item layer-item'}
      aria-current={current || undefined}
    >
      <button
        type="button"
        className="icon-button"
        aria-label={layer.visible ? `Masquer « ${name} »` : `Afficher « ${name} »`}
        aria-pressed={!layer.visible}
        data-tip={
          layer.visible
            ? 'Masquer le calque : son contenu n’est plus dessiné ni cliquable (visible=0)'
            : 'Afficher le calque (visible=0 retiré)'
        }
        disabled={!actions}
        onClick={() => actions?.setVisible(layer.id, !layer.visible)}
      >
        {layer.visible ? EYE : EYE_OFF}
      </button>
      <button
        type="button"
        className="icon-button"
        aria-label={layer.locked ? `Déverrouiller « ${name} »` : `Verrouiller « ${name} »`}
        aria-pressed={layer.locked}
        data-tip={
          layer.locked
            ? 'Déverrouiller le calque : son contenu redevient cliquable (locked=1 retiré)'
            : 'Verrouiller le calque : son contenu reste dessiné mais ne se clique ni ne se sélectionne plus (locked=1)'
        }
        disabled={!actions}
        onClick={() => actions?.setLocked(layer.id, !layer.locked)}
      >
        {layer.locked ? LOCK : UNLOCK}
      </button>
      <InlineEdit
        value={name}
        label={`Nom du calque « ${name} »`}
        trigger="doubleClick"
        className="layer-name"
        inputClassName="layer-name"
        title={current ? 'Calque courant (double-clic : renommer)' : 'Rendre courant (double-clic : renommer)'}
        onClick={() => actions?.choose(layer.id)}
        onCommit={actions && ((next) => actions.rename(layer.id, next))}
      />
      {elevation && (
        <input
          key={layer.elevation}
          type="number"
          className="layer-elevation"
          min={0}
          step={1}
          defaultValue={layer.elevation || ''}
          placeholder="0"
          readOnly={!actions}
          aria-label={`Élévation de « ${name} »`}
          data-tip="Élévation du calque en iso et en 3D : tout son contenu monte de cette hauteur, en pixels (spatial.elevation)"
          onBlur={(event) => {
            const text = event.target.value.trim();
            const next = text === '' ? 0 : Number(text.replace(',', '.'));
            if (Number.isFinite(next) && next >= 0 && next !== layer.elevation) actions?.setElevation(layer.id, next);
            else event.target.value = layer.elevation ? String(layer.elevation) : '';
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') event.currentTarget.blur();
            else if (event.key === 'Escape') {
              event.currentTarget.value = layer.elevation ? String(layer.elevation) : '';
              event.currentTarget.blur();
            }
          }}
        />
      )}
      <span
        className="field-value"
        data-tip={`${count} élément${count > 1 ? 's' : ''} posé${count > 1 ? 's' : ''} sur le calque`}
      >
        {count}
      </span>
      {actions && (
        <>
          <button
            type="button"
            className="icon-button"
            aria-label={`Monter « ${name} »`}
            data-tip="Monter le calque : son contenu passe au-dessus du calque suivant"
            disabled={top}
            onClick={() => actions.move(layer.id, 'up')}
          >
            ↑
          </button>
          <button
            type="button"
            className="icon-button"
            aria-label={`Descendre « ${name} »`}
            data-tip="Descendre le calque : son contenu passe sous le calque précédent"
            disabled={bottom}
            onClick={() => actions.move(layer.id, 'down')}
          >
            ↓
          </button>
          <button
            type="button"
            className="icon-button"
            aria-label={`Supprimer « ${name} »`}
            data-tip={last ? 'Le dernier calque de la page ne se supprime pas' : 'Supprimer le calque et son contenu'}
            disabled={last}
            onClick={() => {
              if (count === 0 || window.confirm(`Supprimer le calque « ${name} » et ses ${count} éléments ?`))
                actions.remove(layer.id);
            }}
          >
            ×
          </button>
        </>
      )}
    </li>
  );
}

/** Icônes 14 × 14 en trait, couleur du bouton. */
const EYE = (
  <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true" fill="none" stroke="currentColor">
    <path d="M1 7 C3 3.5 11 3.5 13 7 C11 10.5 3 10.5 1 7 Z" />
    <circle cx="7" cy="7" r="1.8" />
  </svg>
);
const EYE_OFF = (
  <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true" fill="none" stroke="currentColor">
    <path d="M1 7 C3 3.5 11 3.5 13 7 C11 10.5 3 10.5 1 7 Z" opacity="0.5" />
    <path d="M2 12 L12 2" />
  </svg>
);
const LOCK = (
  <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true" fill="none" stroke="currentColor">
    <rect x="2.5" y="6.5" width="9" height="6" rx="1" fill="currentColor" />
    <path d="M4.5 6.5 V4.5 A2.5 2.5 0 0 1 9.5 4.5 V6.5" />
  </svg>
);
const UNLOCK = (
  <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true" fill="none" stroke="currentColor">
    <rect x="2.5" y="6.5" width="9" height="6" rx="1" />
    <path d="M4.5 6.5 V4.5 A2.5 2.5 0 0 1 9.3 3.5" />
  </svg>
);

/**
 * Calque de la sélection (sujet 523) : celui de ses éléments, vide s'ils sont sur plusieurs ; en choisir un y passe la
 * sélection. Rien sur une page sans calques ; un seul calque : affiché, sans choix.
 */
export function SelectionLayerField({
  layers,
  elements,
  onMove,
}: {
  layers: PageLayersView | undefined;
  elements: ReadonlyArray<{ layerId: string }>;
  onMove: ((layerId: string) => void) | undefined;
}) {
  if (!layers) return null;
  const ids = new Set(elements.map((element) => element.layerId));
  const value = ids.size === 1 ? [...ids][0]! : '';
  return (
    <label className="field-row" data-tip="Calque de la sélection : en choisir un autre l’y passe, avec son contenu">
      Calque
      <select
        value={value}
        disabled={!onMove || layers.layers.length < 2}
        onChange={(event) => event.target.value && onMove?.(event.target.value)}
      >
        {value === '' && <option value="">Plusieurs</option>}
        {[...layers.layers].reverse().map((layer) => (
          <option key={layer.id} value={layer.id}>
            {layerName(layer)}
          </option>
        ))}
      </select>
    </label>
  );
}
