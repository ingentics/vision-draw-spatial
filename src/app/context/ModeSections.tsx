import { modePalette } from '../../engine';
import type { ReactNode } from 'react';
import type { ModeInfo, ModeScope, ModeTarget, PageModel, StyleSettings } from '../../engine';
import { ChoiceGroup } from '../ChoiceGroup';
import { ModeIcon } from '../ModeIcon';
import { Section } from '../PanelSection';
import { ModePropertyFields } from '../plugins/modes/ModeFields';
import { modePanel } from '../plugins/modes/registry';
import { useEnginePlugins } from '../pluginsContext';
import type { ContextPanelProps } from './types';

/** Sections du panneau contextuel propres au mode de la page : choix du mode, réglages déclarés, partie visée. */

/** Choix « Aucun » du mode de la page (aucun mode ne peut porter un identifiant vide). */
const NO_MODE = '';

/**
 * Mode de la page (sujet 69) : choix du mode, puis ses réglages déclarés et ses sections propres
 * (`src/app/plugins/modes/<id>/`). Un mode inconnu (écrit par une version plus récente) reste affiché tel quel.
 */
export function PageModeSections({
  page,
  onPageMode,
  onModeEdit,
  onModeProperty,
  modeCurrent,
  modeSettings,
  exporters,
  styles,
  simulation,
}: Pick<
  ContextPanelProps,
  | 'page'
  | 'onPageMode'
  | 'onModeEdit'
  | 'onModeProperty'
  | 'modeCurrent'
  | 'modeSettings'
  | 'exporters'
  | 'styles'
  | 'simulation'
>) {
  const plugins = useEnginePlugins();
  const modeId = plugins.modes.modeId(page);
  const mode = plugins.modes.modeOf(page);
  const options = [
    { value: NO_MODE, label: 'Aucun', title: 'Aucun : page normale, sans mode (spatial.mode retiré)' },
    ...plugins.modes.list().map((m) => ({
      value: m.id,
      label: m.shortName ?? m.name,
      icon: m.icon && <ModeIcon mode={m} />,
      title: m.description ? `${m.name} : ${m.description}` : m.name,
    })),
  ];
  const PageSection = modePanel(mode?.id)?.PageSection;
  // Réglages de page rangés dans un encart du mode (`section`, ex. « RDD »), après la section « Mode ».
  const sections = [
    ...new Set(
      plugins
        .modePropertyViews(page, 'page', page)
        .map((view) => view.property.section)
        .filter((section) => section !== undefined),
    ),
  ];
  return (
    <>
      <Section title="Mode">
        <div className="field-row">
          <span data-tip="Mode de la page (spatial.mode) : spécialise la page ; rien ne change dans draw.io">Mode</span>
          <ChoiceGroup
            label="Mode de la page"
            value={modeId ?? NO_MODE}
            options={options}
            disabled={!onPageMode}
            onChange={(value) => onPageMode?.(value === NO_MODE ? undefined : value)}
          />
        </div>
        <ModeFields page={page} scope="page" target={page} styles={styles} onModeProperty={onModeProperty} />
      </Section>
      {sections.map((section) => (
        <Section key={section} title={section}>
          <ModeFields
            page={page}
            scope="page"
            target={page}
            section={section}
            styles={styles}
            onModeProperty={onModeProperty}
          />
        </Section>
      ))}
      {PageSection && mode && (
        <PageSection
          page={page}
          onEdit={onModeEdit}
          current={modeCurrent}
          values={plugins.modes.values(mode.id, modeSettings[mode.id])}
          exporters={exporters}
          simulation={simulation}
        />
      )}
    </>
  );
}

/** Réglages déclarés par le mode de la page pour une cible. */
function ModeFields({
  page,
  scope,
  target,
  part,
  section,
  styles,
  onModeProperty,
}: {
  page: PageModel;
  scope: ModeScope;
  target: ModeTarget;
  part?: string;
  section?: string;
  styles: StyleSettings;
  onModeProperty?: ContextPanelProps['onModeProperty'];
}) {
  return (
    <ModePropertyFields
      page={page}
      scope={scope}
      target={target}
      part={part}
      section={section}
      palette={modePalette(styles)}
      onChange={
        onModeProperty &&
        ((key, value, merge) =>
          onModeProperty(scope, scope === 'page' ? undefined : target.id, key, value, part, merge))
      }
    />
  );
}

/**
 * Section principale déclarée par le mode pour cet élément (sujet 413, ex. « Couche logique ») : elle reprend le texte
 * et le commentaire de la forme ; undefined = section « Texte », puis celle au nom du mode.
 */
export function modeMainSection(mode: ModeInfo | undefined, element: ModeTarget): string | undefined {
  const main = mode?.mainSection;
  return 'kind' in element && main?.kinds.includes(element.kind) ? main.title : undefined;
}

/**
 * Sections des réglages du mode de la page sur un élément (flèche ou forme), s'il en déclare : celle au nom du mode
 * (ou la section principale du mode, sujet 413), puis une par `section` déclarée (sujet 260), dans l'ordre des
 * réglages. `lead` : en tête de la première section, qui est alors montrée même sans réglage (texte de la forme).
 */
export function ElementModeSection({
  element,
  scope,
  lead,
  ...props
}: ContextPanelProps & { element: ModeTarget; scope: ModeScope; lead?: ReactNode }) {
  const plugins = useEnginePlugins();
  const mode = plugins.modes.modeOf(props.page);
  const part = scope === 'shape' ? props.part : undefined;
  const shown = plugins.modePropertyViews(props.page, scope, element, part);
  if (!mode || (shown.length === 0 && !lead)) return null;
  const declared = new Set(shown.map((view) => view.property.section));
  const sections = lead ? [undefined, ...[...declared].filter((section) => section !== undefined)] : [...declared];
  return (
    <>
      {sections.map((section) => (
        <Section key={section ?? ''} title={section ?? modeMainSection(mode, element) ?? mode.name}>
          {section === undefined && lead}
          <ModeFields
            page={props.page}
            scope={scope}
            target={element}
            part={part}
            section={section}
            styles={props.styles}
            onModeProperty={props.onModeProperty}
          />
        </Section>
      ))}
    </>
  );
}
