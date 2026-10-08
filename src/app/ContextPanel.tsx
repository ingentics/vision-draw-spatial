import { useRef } from 'react';
import {
  anchorOf,
  commentOf,
  edgeTexts,
  endLabelOf,
  jumpValue,
  matchesPreset,
  modePalette,
  pageEffectIds,
  routingKind,
  SPATIAL,
  spatialNumber,
} from '../engine';
import type {
  AlignMove,
  OrientAction,
  AlignReference,
  Anchoring,
  DistributeMove,
  EdgeEnd,
  EdgeModel,
  EdgeTextAnchor,
  JumpStyle,
  LinkModel,
  ModeEdit,
  ModeScope,
  ModeTarget,
  OrderMove,
  PageModel,
  PluginSettings,
  ShapeModel,
  StylePreset,
  StyleSettings,
} from '../engine';
import { TEXT_FORMAT_ATTRIBUTE } from './LabelEditor';
import { BorderSection } from './BorderSection';
import { NumberField, TextField } from './Fields';
import { ModePropertyFields } from './plugins/modes/ModeFields';
import { modePanel } from './plugins/modes/registry';
import { ShapePropertyFields } from './ShapeProperties';
import { CommentField } from './comment';
import { CollapseButton } from './Sidebar';
import { Section } from './PanelSection';
import { TextFormatSections } from './TextFormat';
import type { TextEdit } from './TextFormat';
import { ArrangeSection } from './ArrangeSection';
import { OrientSection } from './OrientSection';
import { ChoiceGroup } from './ChoiceGroup';
import { useTooltip } from './Tooltip';
import {
  ANCHORING_LABELS,
  ANCHORING_OPTIONS,
  EDGE_LINE_OPTIONS,
  JUMP_LABELS,
  JUMP_OPTIONS,
  MARKERS,
  markerOptions,
} from './edgeIcons';
import type { EdgeLine } from './edgeIcons';
import { ModeIcon } from './ModeIcon';
import { OrderSection } from './OrderSection';
import { useEnginePlugins } from './pluginsContext';

export interface ContextPanelProps {
  page: PageModel;
  /** Toutes les pages, pour les liens. */
  pages: PageModel[];
  /** Formes et flèches sélectionnées sur la page (vides : panneau de la page). */
  shapes: ShapeModel[];
  edges: EdgeModel[];
  styles: StyleSettings;
  /** Réglages enregistrés des modes (`settings.modes`), passés bornés à la section du mode. */
  modeSettings: PluginSettings;
  /** Épaisseur par défaut des volumes (réglage), affichée quand la forme n'a pas la sienne. */
  defaultDepth: number;
  /** Libellé de la touche de sélection multiple (ex. « Ctrl »), pour l'aide. */
  multiSelectKey: string;
  onApplyStyle: (preset: StylePreset) => void;
  /** Clés de style des formes sélectionnées (bordure : couleur, épaisseur, trait, coins). */
  onShapeStyle: (patch: Record<string, string | undefined>) => void;
  /** Retourner ou pivoter les formes sélectionnées qui l'acceptent (sujet 335). */
  onOrient: (action: OrientAction) => void;
  /** Clés de style des flèches sélectionnées (tracé : droite, angles droits, arrondi, courbe), calculées par flèche. */
  /** `merge` : réglage en direct, fusionné en une étape d'annulation avec les précédents de même clé. */
  onEdgeStyle: (patch: EdgeStylePatch, merge?: string) => void;
  /** Retour en auto de la flèche : points intermédiaires et points d'attache imposés retirés. */
  onResetRoute: () => void;
  /** Renommer la page ; absent si les pages ne sont pas modifiables. */
  onRenamePage?: (name: string) => void;
  /** Mode de la page (undefined = page normale) ; absent si la page n'est pas modifiable. */
  onPageMode?: (modeId: string | undefined) => void;
  /** Active ou retire un effet de la page ; absent si la page n'est pas modifiable. */
  onPageEffect?: (effectId: string, enabled: boolean) => void;
  /** Ancrage des flèches propre à la page (undefined = réglage de l'appli) ; absent si la page n'est pas modifiable. */
  onPageAnchoring?: (anchoring: Anchoring | undefined) => void;
  /** Ancrage des flèches du réglage de l'appli (choix « par défaut » de la page). */
  defaultAnchoring?: Anchoring;
  /** Saut des flèches aux croisements propre à la page (undefined = réglage de l'appli) ; absent si non modifiable. */
  onPageJumps?: (jumps: JumpStyle | 'none' | undefined) => void;
  /** Saut du réglage de l'appli (choix « par défaut » de la page). */
  defaultJumps: JumpStyle | 'none';
  /** Saut suivi par les flèches de la page sans le leur (celui de la page, sinon celui de l'appli). */
  pageJumps: JumpStyle | 'none';
  /** Taille du saut d'une flèche sans `jumpSize` (réglage de l'appli). */
  defaultJumpSize: number;
  /** Opération du mode de la page (sections propres au mode) ; absent si la page n'est pas modifiable. */
  onModeEdit?: (label: string, edit: (edit: ModeEdit) => void) => void;
  /**
   * Réglage déclaré par le mode de la page (undefined = vide) ; absent si la page n'est pas modifiable. `merge` :
   * réglage en direct, une étape d'annulation par saisie.
   */
  onModeProperty?: (
    scope: ModeScope,
    targetId: string | undefined,
    key: string,
    value: string | undefined,
    part?: string,
    merge?: string,
  ) => void;
  /** Partie sélectionnée de la forme (ex. champ d'une table RDD, sujet 249) : le panneau ne montre que ses réglages. */
  part?: string;
  /** « Courant » du mode de la page (ex. flux courant), montré par ses sections. */
  modeCurrent?: string;
  /** Lien de l'élément sélectionné (vers une page ou une URL) ; undefined = retiré. */
  onLink: (link: LinkModel | undefined) => void;
  /** Attribut spatial de la forme sélectionnée (épaisseur, élévation…) ; undefined = valeur par défaut. */
  /** `merge` : réglage en direct, fusionné en une étape d'annulation avec les précédents de même clé. */
  onSpatial: (key: string, value: number | string | undefined, merge?: string) => void;
  /** Édition du texte (du milieu, pour une flèche) dans le plan. */
  onEditLabel: () => void;
  /** Édition en place du commentaire de l'élément sélectionné (montré au survol), dans l'encart du rendu. */
  onEditComment: () => void;
  /** Texte de début ou de fin d'une flèche (vide = retiré). */
  onEndLabel: (end: EdgeEnd, text: string) => void;
  onDelete: () => void;
  /** Inverse les flèches sélectionnées (source et cible échangées). */
  onReverse: () => void;
  /** Ordre de dessin de la sélection (premier plan, arrière-plan, avancer, reculer). */
  onOrder: (move: OrderMove) => void;
  /** Référence de l'alignement (réglage de l'appli) et son changement. */
  alignReference: AlignReference;
  onAlignReference: (reference: AlignReference) => void;
  /** Aligner ou répartir les formes de la sélection. */
  onAlign: (move: AlignMove) => void;
  onDistribute: (move: DistributeMove) => void;
  /** Ancre d'un texte de la flèche (début, milieu, fin). */
  onTextAnchor: (cellId: string, anchor: EdgeTextAnchor) => void;
  /** Texte en cours d'édition en place : le panneau montre son format. */
  textEdit?: TextEdit;
}

/**
 * Panneau contextuel à droite, comme le panneau Format de draw.io : toujours ouvert sur une page,
 * il montre la forme sélectionnée, sinon la flèche, sinon la page, avec tous leurs réglages (styles,
 * texte, volume, lien, suppression). Les paramètres et les diagnostics prennent sa place le temps
 * d'être ouverts.
 */
export function ContextPanel(props: ContextPanelProps) {
  const { shapes, edges } = props;
  const count = shapes.length + edges.length;
  const title = contextTitle(shapes, edges, props.textEdit && (props.textEdit.comment ? 'comment' : 'text'));
  let body;
  if (props.textEdit) body = <TextFormatSections edit={props.textEdit} />;
  else if (count === 0) body = <PageSections {...props} />;
  else if (count > 1) body = <MultiSections {...props} />;
  else if (shapes.length === 1 && props.part !== undefined)
    body = <ElementModeSection {...props} element={shapes[0]!} scope="shape" />;
  else if (shapes.length === 1) body = <ShapeSections {...props} shape={shapes[0]!} />;
  else body = <EdgeSections {...props} edge={edges[0]!} />;
  return (
    <aside
      className="side-panel card-panel context-panel"
      aria-label={title}
      {...(props.textEdit ? { [TEXT_FORMAT_ATTRIBUTE]: '' } : {})}
    >
      <header className="side-panel-header">
        <CollapseButton />
        <h2>{title}</h2>
      </header>
      <div className="side-panel-body">{body}</div>
    </aside>
  );
}

/** Titre du panneau contextuel (aussi celui de la bande quand la barre de droite est repliée). */
export function contextTitle(
  shapes: readonly ShapeModel[],
  edges: readonly EdgeModel[],
  editing: 'text' | 'comment' | undefined,
): string {
  const count = shapes.length + edges.length;
  if (editing) return editing === 'comment' ? 'Commentaire' : 'Texte';
  if (count === 0) return 'Page';
  if (count > 1)
    return edges.length === 0 ? `${count} formes` : shapes.length === 0 ? `${count} flèches` : `${count} éléments`;
  return shapes.length === 1 ? 'Forme' : 'Flèche';
}

// ---------------------------------------------------------------------------
// Page

function PageSections({ page, onRenamePage: onRename, ...props }: ContextPanelProps) {
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
          <span title="Manuel : on choisit le point d'attache. Automatique : on choisit le côté, les flèches y sont réparties. Typon : idem, tracé à 45° (spatial.anchoring)">
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
          <span title="Rendu des flèches sans le leur là où elles passent au-dessus d'une autre (spatial.jumps)">
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
        <label key={effect.id} className="field toggle" title={effect.description}>
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

/** Choix « Aucun » du mode de la page (aucun mode ne peut porter un identifiant vide). */
const NO_MODE = '';

/**
 * Mode de la page (sujet 69) : choix du mode, puis ses réglages déclarés et ses sections propres
 * (`src/app/plugins/modes/<id>/`). Un mode inconnu (écrit par une version plus récente) reste affiché tel quel.
 */
function PageModeSections({
  page,
  onPageMode,
  onModeEdit,
  onModeProperty,
  modeCurrent,
  modeSettings,
  styles,
}: Pick<
  ContextPanelProps,
  'page' | 'onPageMode' | 'onModeEdit' | 'onModeProperty' | 'modeCurrent' | 'modeSettings' | 'styles'
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
          <span title="Mode de la page (spatial.mode) : spécialise la page ; rien ne change dans draw.io">Mode</span>
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
 * Sections des réglages du mode de la page sur un élément (flèche ou forme), s'il en déclare : celle au nom du mode,
 * puis une par `section` déclarée (sujet 260), dans l'ordre des réglages.
 */
function ElementModeSection({
  element,
  scope,
  ...props
}: ContextPanelProps & { element: ModeTarget; scope: ModeScope }) {
  const plugins = useEnginePlugins();
  const mode = plugins.modes.modeOf(props.page);
  const part = scope === 'shape' ? props.part : undefined;
  const shown = plugins.modePropertyViews(props.page, scope, element, part);
  if (!mode || shown.length === 0) return null;
  const sections = [...new Set(shown.map((view) => view.property.section))];
  return (
    <>
      {sections.map((section) => (
        <Section key={section ?? ''} title={section ?? mode.name}>
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

// ---------------------------------------------------------------------------
// Forme

function ShapeSections({ shape, ...props }: ContextPanelProps & { shape: ShapeModel }) {
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

// ---------------------------------------------------------------------------
// Flèche

function EdgeSections({ edge, ...props }: ContextPanelProps & { edge: EdgeModel }) {
  const plugins = useEnginePlugins();
  const end = (id: string | undefined) => {
    const shape = id ? props.page.shapes.find((s) => s.id === id) : undefined;
    if (!shape) return 'point libre';
    return shape.label ? `« ${shape.label} »` : 'forme sans texte';
  };
  // Flèche gérée par le mode (ex. relation RDD, sujets 265, 267) : ses réglages en tête, texte du milieu et
  // commentaire, coupure et renvois (sujet 270) ; le reste, imposé par le mode (cardinalités comprises), n'est pas
  // montré.
  if (plugins.managesEdge(edge.id))
    return (
      <>
        <ElementModeSection {...props} element={edge} scope="edge" />
        <Section title="Texte">
          <LabelRow label={edge.label} name="Milieu" onEdit={props.onEditLabel} />
          <CommentField comment={commentOf(edge)} onEdit={props.onEditComment} />
        </Section>
        <Section title="Tracé">
          <EdgeSplitFields edge={edge} onChange={props.onEdgeStyle} />
        </Section>
        <DeleteButton onDelete={props.onDelete} />
      </>
    );
  return (
    <>
      <Section title="Texte">
        <LabelRow label={edge.label} name="Milieu" onEdit={props.onEditLabel} />
        {(['start', 'end'] as const).map((which) => {
          const current = endLabelOf(edge, which)?.label ?? '';
          return (
            <TextField
              key={`${which}:${edge.id}:${current}`}
              label={which === 'start' ? 'Début' : 'Fin'}
              title={
                which === 'start'
                  ? 'Texte près du début de la flèche (côté source) ; vide = aucun'
                  : 'Texte près de la fin de la flèche (côté pointe) ; vide = aucun'
              }
              value={current}
              placeholder="aucun"
              onCommit={(text) => props.onEndLabel(which, text)}
            />
          );
        })}
        <CommentField comment={commentOf(edge)} onEdit={props.onEditComment} />
      </Section>
      <ElementModeSection {...props} element={edge} scope="edge" />
      <TextAnchors edge={edge} onAnchor={props.onTextAnchor} onChange={props.onEdgeStyle} />
      <EdgeLineSection
        edge={edge}
        pageJumps={props.pageJumps}
        defaultJumpSize={props.defaultJumpSize}
        onChange={props.onEdgeStyle}
        onResetRoute={props.onResetRoute}
      />
      <EdgeEndsSection edge={edge} onChange={props.onEdgeStyle} onReverse={props.onReverse} />
      <Section title="Liaison">
        <div className="field-row">
          De
          <span className="field-value">{end(edge.sourceId)}</span>
        </div>
        <div className="field-row">
          Vers
          <span className="field-value">{end(edge.targetId)}</span>
        </div>
      </Section>
      <Section title="Lien">
        <LinkField link={edge.link} pageId={props.page.id} pages={props.pages} onLink={props.onLink} />
      </Section>
      <OrderSection onOrder={props.onOrder} />
      <DeleteButton onDelete={props.onDelete} />
    </>
  );
}

/**
 * Ancre de chaque texte de la flèche : début, milieu ou fin du tracé. Pour un placement libre, on tire
 * la poignée du texte sur le plan.
 */
function TextAnchors({
  edge,
  onAnchor,
  onChange,
}: {
  edge: EdgeModel;
  onAnchor: (cellId: string, anchor: EdgeTextAnchor) => void;
  onChange: (patch: EdgeStylePatch) => void;
}) {
  const { hover, tooltip } = useTooltip();
  const texts = edgeTexts(edge);
  if (texts.length === 0) return null;
  const names: Record<EdgeTextAnchor, string> = { start: 'Début', middle: 'Milieu', end: 'Fin' };
  const tips: Record<EdgeTextAnchor, string> = {
    start: 'Début : texte posé au début du tracé, contre la forme de départ (x de sa géométrie, align, verticalAlign)',
    middle: 'Milieu : texte posé au milieu du tracé (x de sa géométrie ; align et verticalAlign retirés)',
    end: 'Fin : texte posé au bout du tracé, contre la forme d’arrivée (x de sa géométrie, align, verticalAlign)',
  };
  return (
    <Section title="Position des textes">
      {texts.map((text) => {
        const anchor = anchorOf(text.placement);
        return (
          <div key={text.cellId} className="field-row anchor-row">
            <span className="field-value label-value" title={text.label}>
              « {text.label.replace(/\n/g, ' ')} »
            </span>
            <span className="button-group" role="radiogroup" aria-label={`Ancre de « ${text.label} »`}>
              {(['start', 'middle', 'end'] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  className="group-button format-button"
                  aria-checked={anchor === value}
                  aria-pressed={anchor === value}
                  {...hover(tips[value])}
                  onClick={() => onAnchor(text.cellId, value)}
                >
                  {names[value]}
                </button>
              ))}
            </span>
          </div>
        );
      })}
      {edge.label.trim() && (
        <label
          className="field toggle"
          title={`Texte du milieu posé le long du trait de la flèche (${SPATIAL.labelFollow}) ; draw.io le garde horizontal`}
        >
          <input
            type="checkbox"
            checked={edge.style[SPATIAL.labelFollow] === '1'}
            onChange={(event) => onChange(() => ({ [SPATIAL.labelFollow]: event.target.checked ? '1' : undefined }))}
          />
          Texte du milieu : suit la flèche
        </label>
      )}
      {edge.label.trim() && edge.style[SPATIAL.labelFollow] === '1' && (
        <FollowShiftField edge={edge} onChange={onChange} />
      )}
      <p className="panel-hint">
        Placement libre : en modifiant le texte (double-clic), tirer la poignée ◇ sous le texte.
      </p>
      {tooltip}
    </Section>
  );
}

/** Ajustement fin du texte qui suit la flèche : glissement le long du trait (`spatial.labelFollowShift`). */
function FollowShiftField({
  edge,
  onChange,
}: {
  edge: EdgeModel;
  onChange: (patch: EdgeStylePatch, merge?: string) => void;
}) {
  const parsed = parseFloat(edge.style[SPATIAL.labelFollowShift] ?? '');
  const shift = Number.isFinite(parsed) && parsed !== 0 ? parsed : undefined;
  // Une étape d'annulation par passage dans le champ : les valeurs tapées à la suite sont fusionnées.
  const session = useRef(0);
  const write = (value: number | undefined) => () => ({
    [SPATIAL.labelFollowShift]: value ? String(value) : undefined,
  });
  return (
    <NumberField
      key={edge.id}
      label="Décalage le long du trait (px)"
      title={`Glisse le texte le long du trait : positif = vers la fin, négatif = vers le début (${SPATIAL.labelFollowShift})`}
      value={shift}
      placeholder="0"
      signed
      onLive={(value) => onChange(write(value), `followShift:${edge.id}:${session.current}`)}
      onCommit={(value) => {
        onChange(write(value), `followShift:${edge.id}:${session.current}`);
        session.current++;
      }}
    />
  );
}

/** Tracé d'une flèche : droite, angles droits, coudes arrondis (par défaut des flèches créées), ou courbe. */

/** Clés de style à écrire sur une flèche, d'après son style actuel. */
type EdgeStylePatch = (style: Record<string, string>) => Record<string, string | undefined>;

const isStraight = (style: Record<string, string>) => routingKind(style).kind === 'straight';

/** Tracé avec coudes : une flèche droite reprend le routeur orthogonal, les autres gardent le leur. */
const withRouter =
  (keys: Record<string, string | undefined>): EdgeStylePatch =>
  (style) =>
    isStraight(style) ? { ...keys, edgeStyle: 'orthogonalEdgeStyle', noEdgeStyle: undefined } : keys;

/** Clés de style écrites par chaque tracé. */
const EDGE_LINE_PATCHES: Record<EdgeLine, EdgeStylePatch> = {
  straight: () => ({ edgeStyle: undefined, noEdgeStyle: undefined, rounded: '0', curved: undefined }),
  sharp: withRouter({ rounded: '0', curved: undefined }),
  rounded: withRouter({ rounded: '1', curved: undefined }),
  curved: withRouter({ rounded: '0', curved: '1' }),
};

/** Clés de style des points d'attache imposés (`exitX`…, `entryX`…). */
const CONSTRAINT_KEYS = ['exit', 'entry'].flatMap((prefix) => ['X', 'Y'].map((axis) => `${prefix}${axis}`));

function EdgeLineSection({
  edge,
  pageJumps,
  defaultJumpSize,
  onChange,
  onResetRoute,
}: {
  edge: EdgeModel;
  pageJumps: JumpStyle | 'none';
  defaultJumpSize: number;
  onChange: (patch: EdgeStylePatch, merge?: string) => void;
  onResetRoute: () => void;
}) {
  const current: EdgeLine =
    edge.style.curved === '1'
      ? 'curved'
      : isStraight(edge.style)
        ? 'straight'
        : edge.style.rounded === '1'
          ? 'rounded'
          : 'sharp';
  const manual = edge.points.length > 0 || CONSTRAINT_KEYS.some((key) => edge.style[key] !== undefined);
  const jump = jumpValue(edge.style.jumpStyle) ?? pageJumps;
  const jumpSize = parseInt(edge.style.jumpSize ?? '', 10);
  const curved = current === 'curved';
  return (
    <Section title="Tracé">
      <div className="field-row">
        Coudes
        <ChoiceGroup
          label="Tracé de la flèche"
          value={current}
          options={EDGE_LINE_OPTIONS}
          onChange={(value) => value && onChange(EDGE_LINE_PATCHES[value])}
        />
      </div>
      <div className="field-row">
        <span
          title={
            curved
              ? 'Une flèche courbe ne fait pas de saut (comme draw.io)'
              : 'Rendu de la flèche là où elle passe au-dessus d’une autre (jumpStyle) ; par défaut : celui de la page'
          }
        >
          Croisements
        </span>
        <ChoiceGroup
          label="Croisements de la flèche"
          value={edge.style.jumpStyle}
          options={JUMP_OPTIONS}
          inherited={JUMP_LABELS[pageJumps]}
          inheritedFrom="la page"
          disabled={curved}
          onChange={(value) => onChange(() => ({ jumpStyle: value }))}
        />
      </div>
      {jump !== 'none' && !curved && (
        <NumberField
          key={`${edge.id}:${edge.style.jumpSize ?? ''}`}
          label="Taille du saut (pt)"
          title={`Taille du saut au croisement (jumpSize) ; vide = ${defaultJumpSize} pt (paramètres)`}
          value={Number.isFinite(jumpSize) ? jumpSize : undefined}
          placeholder={String(defaultJumpSize)}
          onCommit={(value) =>
            onChange(() => ({ jumpSize: value === undefined ? undefined : String(Math.round(value)) }))
          }
        />
      )}
      <EdgeSplitFields edge={edge} onChange={onChange} />
      <div className="field-row">
        Chemin
        <button
          type="button"
          className="button"
          disabled={!manual}
          title={
            manual
              ? 'Retirer les points posés et les points d’attache imposés : le tracé redevient automatique'
              : 'Le tracé est déjà automatique'
          }
          onClick={onResetRoute}
        >
          Retour en auto
        </button>
      </div>
    </Section>
  );
}

/** Flèche coupée en deux (sujet 219) : case « Couper la flèche » et, cochée, les textes de renvoi des deux tronçons. */
function EdgeSplitFields({
  edge,
  onChange,
}: {
  edge: EdgeModel;
  onChange: (patch: EdgeStylePatch, merge?: string) => void;
}) {
  const splitSession = useRef(0);
  return (
    <>
      <label className="field toggle" title="Ne dessiner qu’un tronçon au départ et un à l’arrivée (split)">
        <input
          type="checkbox"
          checked={edge.style.split === '1'}
          onChange={(event) => onChange(() => ({ split: event.target.checked ? '1' : undefined }))}
        />
        Couper la flèche
      </label>
      {edge.style.split === '1' &&
        (['Left', 'Right'] as const).map((side) => {
          const key = `splitLabel${side}`;
          // Le point-virgule sépare les clés du style draw.io : retiré du texte.
          const write = (text: string) => () => ({ [key]: text.replace(/;/g, '').trim() || undefined });
          // Réglage en direct : une étape d'annulation par passage dans le champ.
          const merge = `${key}:${edge.id}:${splitSession.current}`;
          return (
            <TextField
              key={`${key}:${edge.id}`}
              label={side === 'Left' ? 'Renvoi départ' : 'Renvoi arrivée'}
              title={`Texte dans un cadre au bout du tronçon ${side === 'Left' ? 'de départ (côté source)' : 'd’arrivée (côté cible)'} (${key}) ; vide = fondu`}
              value={edge.style[key] ?? ''}
              placeholder="fondu"
              onLive={(text) => onChange(write(text), merge)}
              onCommit={(text) => {
                onChange(write(text), merge);
                splitSession.current++;
              }}
            />
          );
        })}
    </>
  );
}

/** Flèche gérée par le mode de la page (ex. relation RDD et ses cardinalités, sujet 265). */

/**
 * Bouts de la flèche : forme du début et de la fin, pleine ou vide (défauts draw.io : rien au début, classique pleine
 * à la fin), et inversion du sens.
 */
function EdgeEndsSection({
  edge,
  onChange,
  onReverse,
}: {
  edge: EdgeModel;
  onChange: (patch: EdgeStylePatch) => void;
  onReverse: () => void;
}) {
  return (
    <Section title="Bouts">
      {(['start', 'end'] as const).map((end) => {
        const current = edge.style[`${end}Arrow`] ?? (end === 'end' ? 'classic' : 'none');
        const known = MARKERS.find((marker) => marker.value === current);
        const filled = edge.style[`${end}Fill`] !== '0';
        const name = end === 'start' ? 'Début' : 'Fin';
        return (
          <div key={end} className="end-field">
            <div className="field-row">
              {name}
              {known?.fillable && (
                <label className="end-fill" title={`Pointe pleine ou vide (${end}Fill)`}>
                  <input
                    type="checkbox"
                    checked={filled}
                    onChange={(event) => onChange(() => ({ [`${end}Fill`]: event.target.checked ? undefined : '0' }))}
                  />
                  pleine
                </label>
              )}
            </div>
            <ChoiceGroup
              label={`Bout du ${name.toLowerCase()} de la flèche`}
              value={current}
              options={markerOptions(end, filled)}
              unknownLabel={(value) => `${value} (non dessiné)`}
              columns={8}
              onChange={(value) =>
                value && onChange(() => ({ [`${end}Arrow`]: end === 'start' && value === 'none' ? undefined : value }))
              }
            />
            {!known && <p className="panel-hint">Bout non dessiné : {current}.</p>}
          </div>
        );
      })}
      <div className="field-row">
        Sens
        <button
          type="button"
          className="button"
          title="Inverser le sens de la flèche : le début devient la fin et la fin le début, le tracé reste le même"
          onClick={onReverse}
        >
          Inverser
        </button>
      </div>
    </Section>
  );
}

// ---------------------------------------------------------------------------
// Sélection multiple

function MultiSections(props: ContextPanelProps) {
  const plugins = useEnginePlugins();
  const { shapes, edges } = props;
  // La dernière forme choisie sert d'aperçu et de style courant.
  const current = shapes[shapes.length - 1];
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

// ---------------------------------------------------------------------------
// Champs

function LabelRow({ label, name = 'Texte', onEdit }: { label: string; name?: string; onEdit: () => void }) {
  return (
    <div className="field-row">
      {name}
      <span className="field-value label-value" title={label}>
        {label || 'aucun'}
      </span>
      <button
        type="button"
        className="button"
        title="Modifier le texte dans le plan (F2, ou double-clic)"
        onClick={onEdit}
      >
        Modifier
      </button>
    </div>
  );
}

const NONE = '';
const URL_OPTION = '__url__';

/** Lien vers une autre page ou une URL (SPEC §14.1). */
function LinkField({
  link,
  pageId,
  pages,
  onLink,
}: {
  link: LinkModel | undefined;
  pageId: string;
  pages: PageModel[];
  onLink: (link: LinkModel | undefined) => void;
}) {
  const value = link?.type === 'page' ? `page:${link.pageId}` : link?.type === 'url' ? URL_OPTION : NONE;
  return (
    <label className="field-row">
      Vers
      <select
        value={value}
        onChange={(event) => {
          const next = event.target.value;
          if (next === NONE) onLink(undefined);
          else if (next === URL_OPTION) {
            const href = window.prompt('Adresse du lien (https://…, mailto:…)', link?.type === 'url' ? link.href : '');
            if (href?.trim()) onLink({ type: 'url', href: href.trim() });
          } else onLink({ type: 'page', pageId: next.slice('page:'.length) });
        }}
      >
        <option value={NONE}>Aucun</option>
        {pages
          .filter((page) => page.id !== pageId)
          .map((page) => (
            <option key={page.id} value={`page:${page.id}`}>
              → {page.name}
            </option>
          ))}
        <option value={URL_OPTION}>{link?.type === 'url' ? `URL : ${link.href}` : 'URL…'}</option>
      </select>
    </label>
  );
}

function DeleteButton({ onDelete }: { onDelete: () => void }) {
  return (
    <button type="button" className="button danger-button" title="Supprimer (Suppr)" onClick={onDelete}>
      Supprimer
    </button>
  );
}

function StyleGrid({
  presets,
  shape,
  onApply,
}: {
  presets: StylePreset[];
  shape: ShapeModel;
  onApply: (preset: StylePreset) => void;
}) {
  return (
    <div className="style-grid">
      {presets.map((preset) => (
        <button
          key={`${preset.name}:${preset.fillColor}`}
          type="button"
          className="style-swatch"
          aria-pressed={matchesPreset(shape.style, preset)}
          title={preset.name}
          aria-label={`Style ${preset.name}`}
          onClick={() => onApply(preset)}
        >
          <StylePreview shape={shape} preset={preset} />
        </button>
      ))}
    </div>
  );
}

/** Aperçu de la forme sélectionnée avec ce style : le dessin déclaré par sa forme, aux couleurs du style. */
function StylePreview({ shape, preset }: { shape: ShapeModel; preset: StylePreset }) {
  const plugins = useEnginePlugins();
  const text = preset.fontColor ?? '#000000';
  return (
    <svg viewBox="0 0 40 28" aria-hidden="true">
      <g
        fill={preset.fillColor}
        stroke={preset.strokeColor}
        dangerouslySetInnerHTML={{ __html: plugins.shapes.swatch(shape) }}
      />
      <text x="20" y="17.5" textAnchor="middle" fill={text}>
        Aa
      </text>
    </svg>
  );
}

function plural(n: number, word: string): string {
  return `${n} ${word}${n > 1 ? 's' : ''}`;
}
