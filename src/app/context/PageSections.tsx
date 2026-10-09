import { SPATIAL, pageEffectIds } from '../../engine';
import { ChoiceGroup } from '../ChoiceGroup';
import { TextField } from '../Fields';
import { Section } from '../PanelSection';
import { ANCHORING_LABELS, ANCHORING_OPTIONS, JUMP_LABELS, JUMP_OPTIONS } from '../edgeIcons';
import { useEnginePlugins } from '../pluginsContext';
import { PageModeSections } from './ModeSections';
import { plural } from './contextFields';
import type { ContextPanelProps } from './types';

/** Sections du panneau contextuel quand rien n'est sélectionné : la page, ses effets. */

export function PageSections({ page, onRenamePage: onRename, ...props }: ContextPanelProps) {
  return (
    <>
      <Section title="Page">
        <TextField
          key={`name:${page.id}:${page.name}`}
          label="Nom"
          title={onRename ? 'Nom de la page (Entrée pour valider)' : 'Nom de la page'}
          value={page.name}
          readOnly={!onRename}
          onCommit={(name) => {
            if (name.trim()) onRename?.(name.trim());
          }}
        />
        <div className="field-row">
          Contenu
          <span className="field-value">
            {plural(page.shapes.length, 'forme')}, {plural(page.edges.length, 'flèche')}
          </span>
        </div>
        <div className="field-row">
          <span data-tip="Manuel : on choisit le point d'attache. Automatique : on choisit le côté, les flèches y sont réparties. Typon : idem, tracé à 45° (spatial.anchoring)">
            Ancrage des flèches
          </span>
          <ChoiceGroup
            label="Ancrage des flèches"
            value={page.attributes[SPATIAL.anchoring]}
            options={ANCHORING_OPTIONS}
            inherited={ANCHORING_LABELS[props.defaultAnchoring ?? 'manual']}
            inheritedFrom="les paramètres"
            disabled={!props.onPageAnchoring}
            onChange={(value) => props.onPageAnchoring?.(value)}
          />
        </div>
        <div className="field-row">
          <span data-tip="Rendu des flèches sans le leur là où elles passent au-dessus d'une autre (spatial.jumps)">
            Croisements des flèches
          </span>
          <ChoiceGroup
            label="Croisements des flèches"
            value={page.attributes[SPATIAL.jumps]}
            options={JUMP_OPTIONS}
            inherited={JUMP_LABELS[props.defaultJumps]}
            inheritedFrom="les paramètres"
            disabled={!props.onPageJumps}
            onChange={(value) => props.onPageJumps?.(value)}
          />
        </div>
      </Section>
      <PageModeSections
        page={page}
        onPageMode={props.onPageMode}
        onModeEdit={props.onModeEdit}
        onModeProperty={props.onModeProperty}
        modeCurrent={props.modeCurrent}
        modeSettings={props.modeSettings}
        styles={props.styles}
      />
      <PageEffectsSection page={page} onPageEffect={props.onPageEffect} />
    </>
  );
}

/**
 * Effets de la page (sujet 143) : une case par effet, cumulables. Seuls sont listés les effets permis par le mode de
 * la page et dans l'un de ses modes d'affichage (sujet 196) ; un effet inconnu (version plus récente) reste affiché
 * tel quel.
 */
function PageEffectsSection({ page, onPageEffect }: Pick<ContextPanelProps, 'page' | 'onPageEffect'>) {
  const plugins = useEnginePlugins();
  const written = pageEffectIds(page);
  const unknown = written.filter((id) => !plugins.effects.get(id));
  const allowed = new Set(plugins.allowedEffects(page));
  const effects = plugins.effects.list().filter((effect) => allowed.has(effect.id));
  if (effects.length === 0 && unknown.length === 0) return null;
  return (
    <Section title="Effets">
      {effects.map((effect) => (
        <label key={effect.id} className="field toggle" data-tip={effect.description}>
          <input
            type="checkbox"
            checked={written.includes(effect.id)}
            disabled={!onPageEffect}
            onChange={(event) => onPageEffect?.(effect.id, event.target.checked)}
          />
          {effect.name}
        </label>
      ))}
      {unknown.length > 0 && <p className="panel-hint">Effets inconnus : {unknown.join(', ')}.</p>}
    </Section>
  );
}
