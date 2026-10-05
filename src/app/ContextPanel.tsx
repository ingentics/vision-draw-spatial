import { useRef } from 'react';
import { anchorOf, edgeTexts, endLabelOf } from '../engine/edit/edgeLabels';
import type { EdgeTextAnchor } from '../engine/Engine';
import type { EdgeEnd } from '../engine/edit/edgeLabels';
import { matchesPreset } from '../engine/edit/styles';
import { defaultShapeRegistry } from '../engine/shapes/registry';
import { routingKind } from '../engine/render/edges/route';
import type { StylePreset } from '../engine/edit/styles';
import type { EdgeModel, LinkModel, PageModel, ShapeModel } from '../engine/model/types';
import type { ExporterSettings, StyleSettings } from '../engine/settings';
import { SPATIAL, spatialNumber } from '../engine/spatial';
import { TEXT_FORMAT_ATTRIBUTE } from './LabelEditor';
import { BorderSection } from './BorderSection';
import { NumberField, SelectField, TextField } from './Fields';
import { JUMP_STYLES, jumpValue } from '../engine/render/edges/jumps';
import type { JumpStyle } from '../engine/render/edges/jumps';
import { defaultEffectRegistry, pageEffectIds } from '../engine/effects/registry';
import { defaultModeRegistry } from '../engine/modes/registry';
import type { ModeScope } from '../engine/modes/registry';
import type { ModeEdit, ModeTarget } from '../engine/modes/types';
import { ModePropertyFields } from './modes/ModeFields';
import { modePanel } from './modes/registry';
import { ShapePropertyFields } from './ShapeProperties';
import { CollapseButton } from './Sidebar';
import { Section } from './PanelSection';
import { TextFormatSections } from './TextFormat';
import type { TextEdit } from './TextFormat';
import type { OrderMove } from '../engine/format/order';
import type { AlignMove, AlignReference, DistributeMove } from '../engine/edit/align';
import { ArrangeSection } from './ArrangeSection';

export interface ContextPanelProps {
  page: PageModel;
  /** Toutes les pages, pour les liens. */
  pages: PageModel[];
  /** Formes et flèches sélectionnées sur la page (vides : panneau de la page). */
  shapes: ShapeModel[];
  edges: EdgeModel[];
  styles: StyleSettings;
  /** Réglages des exporteurs (moteur de rendu de la fenêtre d'export d'un mode). */
  exporters: ExporterSettings;
  /** Épaisseur par défaut des volumes (réglage), affichée quand la forme n'a pas la sienne. */
  defaultDepth: number;
  /** Libellé de la touche de sélection multiple (ex. « Ctrl »), pour l'aide. */
  multiSelectKey: string;
  onApplyStyle: (preset: StylePreset) => void;
  /** Clés de style des formes sélectionnées (bordure : couleur, épaisseur, trait, coins). */
  onShapeStyle: (patch: Record<string, string | undefined>) => void;
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
  onPageAnchoring?: (anchoring: 'manual' | 'auto' | undefined) => void;
  /** Ancrage des flèches du réglage de l'appli (choix « par défaut » de la page). */
  defaultAnchoring?: 'manual' | 'auto';
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
  /** Réglage déclaré par le mode de la page (undefined = vide) ; absent si la page n'est pas modifiable. */
  onModeProperty?: (scope: ModeScope, targetId: string | undefined, key: string, value: string | undefined) => void;
  /** « Courant » du mode de la page (ex. flux courant), montré par ses sections. */
  modeCurrent?: string;
  /** Lien de l'élément sélectionné (vers une page ou une URL) ; undefined = retiré. */
  onLink: (link: LinkModel | undefined) => void;
  /** Attribut spatial de la forme sélectionnée (épaisseur, élévation…) ; undefined = valeur par défaut. */
  onSpatial: (key: string, value: number | string | undefined) => void;
  /** Édition du texte (du milieu, pour une flèche) dans le plan. */
  onEditLabel: () => void;
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
  const title = contextTitle(shapes, edges, props.textEdit !== undefined);
  let body;
  if (props.textEdit) body = <TextFormatSections edit={props.textEdit} />;
  else if (count === 0) body = <PageSections {...props} />;
  else if (count > 1) body = <MultiSections {...props} />;
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
export function contextTitle(shapes: readonly ShapeModel[], edges: readonly EdgeModel[], editingText: boolean): string {
  const count = shapes.length + edges.length;
  if (editingText) return 'Texte';
  if (count === 0) return 'Page';
  if (count > 1)
    return edges.length === 0 ? `${count} formes` : shapes.length === 0 ? `${count} flèches` : `${count} éléments`;
  return shapes.length === 1 ? 'Forme' : 'Flèche';
}

// ---------------------------------------------------------------------------
// Page

const ANCHORINGS = ['manual', 'auto'];
const ANCHORING_LABELS = { manual: 'Manuel', auto: 'Automatique' } as const;

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
        <SelectField
          label="Ancrage des flèches"
          title="Manuel : on choisit le point d'attache. Automatique : on choisit le côté, les flèches y sont réparties (spatial.anchoring)"
          value={
            ANCHORINGS.includes(page.attributes[SPATIAL.anchoring] ?? '') ? page.attributes[SPATIAL.anchoring]! : ''
          }
          options={[
            { value: '', label: `Par défaut (${ANCHORING_LABELS[props.defaultAnchoring ?? 'manual']})` },
            { value: 'manual', label: ANCHORING_LABELS.manual },
            { value: 'auto', label: ANCHORING_LABELS.auto },
          ]}
          disabled={!props.onPageAnchoring}
          onChange={(value) => props.onPageAnchoring?.(value === 'manual' || value === 'auto' ? value : undefined)}
        />
        <SelectField
          label="Croisements des flèches"
          title="Rendu des flèches sans le leur là où elles passent au-dessus d'une autre (spatial.jumps)"
          value={jumpValue(page.attributes[SPATIAL.jumps]) ?? ''}
          options={[{ value: '', label: `Par défaut (${jumpLabel(props.defaultJumps)})` }, ...JUMP_OPTIONS]}
          disabled={!props.onPageJumps}
          onChange={(value) => props.onPageJumps?.(jumpValue(value))}
        />
      </Section>
      <PageModeSections
        page={page}
        onPageMode={props.onPageMode}
        onModeEdit={props.onModeEdit}
        onModeProperty={props.onModeProperty}
        modeCurrent={props.modeCurrent}
        exporters={props.exporters}
      />
      <PageEffectsSection page={page} onPageEffect={props.onPageEffect} />
    </>
  );
}

/**
 * Effets de la page (sujet 143) : une case par effet, cumulables. Un effet refusé par le mode de la page reste
 * cochable mais signalé inactif ; un effet inconnu (version plus récente) reste affiché tel quel.
 */
function PageEffectsSection({ page, onPageEffect }: Pick<ContextPanelProps, 'page' | 'onPageEffect'>) {
  const written = pageEffectIds(page);
  const unknown = written.filter((id) => !defaultEffectRegistry.get(id));
  return (
    <Section title="Effets">
      {defaultEffectRegistry.list().map((effect) => {
        const allowed = defaultModeRegistry.allowsEffect(page, effect.id);
        return (
          <label
            key={effect.id}
            className="field toggle"
            title={allowed ? effect.description : `${effect.name} : sans effet dans le mode de cette page`}
          >
            <input
              type="checkbox"
              checked={written.includes(effect.id)}
              disabled={!onPageEffect}
              onChange={(event) => onPageEffect?.(effect.id, event.target.checked)}
            />
            {allowed ? effect.name : `${effect.name} (inactif)`}
          </label>
        );
      })}
      {unknown.length > 0 && <p className="panel-hint">Effets inconnus : {unknown.join(', ')}.</p>}
    </Section>
  );
}

/**
 * Mode de la page (sujet 69) : choix du mode, puis ses réglages déclarés et ses sections propres
 * (`src/app/modes/<id>/`). Un mode inconnu (écrit par une version plus récente) reste affiché tel quel.
 */
function PageModeSections({
  page,
  onPageMode,
  onModeEdit,
  onModeProperty,
  modeCurrent,
  exporters,
}: Pick<ContextPanelProps, 'page' | 'onPageMode' | 'onModeEdit' | 'onModeProperty' | 'modeCurrent' | 'exporters'>) {
  const modeId = defaultModeRegistry.modeId(page);
  const mode = defaultModeRegistry.modeOf(page);
  const options = [
    { value: '', label: 'Aucun' },
    ...defaultModeRegistry.list().map((m) => ({ value: m.id, label: m.name })),
    ...(modeId && !mode ? [{ value: modeId, label: `Inconnu (${modeId})` }] : []),
  ];
  const PageSection = modePanel(mode?.id)?.PageSection;
  return (
    <>
      <Section title="Mode">
        <SelectField
          label="Mode"
          title={
            mode?.description ?? 'Mode de la page (spatial.mode) : spécialise la page ; rien ne change dans draw.io'
          }
          value={modeId ?? ''}
          options={options}
          disabled={!onPageMode}
          onChange={(value) => onPageMode?.(value || undefined)}
        />
        <ModeFields page={page} scope="page" target={page} onModeProperty={onModeProperty} />
      </Section>
      {PageSection && <PageSection page={page} onEdit={onModeEdit} current={modeCurrent} exporters={exporters} />}
    </>
  );
}

/** Réglages déclarés par le mode de la page pour une cible. */
function ModeFields({
  page,
  scope,
  target,
  onModeProperty,
}: {
  page: PageModel;
  scope: ModeScope;
  target: ModeTarget;
  onModeProperty?: ContextPanelProps['onModeProperty'];
}) {
  return (
    <ModePropertyFields
      page={page}
      scope={scope}
      target={target}
      onChange={
        onModeProperty && ((key, value) => onModeProperty(scope, scope === 'page' ? undefined : target.id, key, value))
      }
    />
  );
}

/** Section des réglages du mode de la page sur un élément (flèche ou forme), s'il en déclare. */
function ElementModeSection({
  element,
  scope,
  ...props
}: ContextPanelProps & { element: ModeTarget; scope: ModeScope }) {
  const mode = defaultModeRegistry.modeOf(props.page);
  if (!mode || defaultModeRegistry.properties(props.page, scope).length === 0) return null;
  return (
    <Section title={mode.name}>
      <ModeFields page={props.page} scope={scope} target={element} onModeProperty={props.onModeProperty} />
    </Section>
  );
}

// ---------------------------------------------------------------------------
// Forme

function ShapeSections({ shape, ...props }: ContextPanelProps & { shape: ShapeModel }) {
  const known = [...props.styles.base, ...props.styles.extended];
  return (
    <>
      <Section title="Texte">
        <LabelRow label={shape.label} onEdit={props.onEditLabel} />
      </Section>
      <ShapeOwnSection shape={shape} onShapeStyle={props.onShapeStyle} onSpatial={props.onSpatial} />
      <ElementModeSection {...props} element={shape} scope="shape" />
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
        <ShapePropertyFields shape={shape} section="volume" onStyle={props.onShapeStyle} onSpatial={props.onSpatial} />
      </Section>
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
  if (!defaultShapeRegistry.properties(shape).some((property) => property.section === 'shape')) return null;
  const { definition } = defaultShapeRegistry.resolve(shape);
  return (
    <Section title={definition.palette?.name ?? 'Forme'}>
      <ShapePropertyFields shape={shape} section="shape" onStyle={onShapeStyle} onSpatial={onSpatial} />
    </Section>
  );
}

// ---------------------------------------------------------------------------
// Flèche

function EdgeSections({ edge, ...props }: ContextPanelProps & { edge: EdgeModel }) {
  const end = (id: string | undefined) => {
    const shape = id ? props.page.shapes.find((s) => s.id === id) : undefined;
    if (!shape) return 'point libre';
    return shape.label ? `« ${shape.label} »` : 'forme sans texte';
  };
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
  const texts = edgeTexts(edge);
  if (texts.length === 0) return null;
  const names: Record<EdgeTextAnchor, string> = { start: 'Début', middle: 'Milieu', end: 'Fin' };
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
                  title={`Ancrer au ${value === 'start' ? 'début' : value === 'end' ? 'bout' : 'milieu'} de la flèche`}
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
type EdgeLine = 'straight' | 'sharp' | 'rounded' | 'curved';

/** Clés de style à écrire sur une flèche, d'après son style actuel. */
type EdgeStylePatch = (style: Record<string, string>) => Record<string, string | undefined>;

const isStraight = (style: Record<string, string>) => routingKind(style).kind === 'straight';

/** Tracé avec coudes : une flèche droite reprend le routeur orthogonal, les autres gardent le leur. */
const withRouter =
  (keys: Record<string, string | undefined>): EdgeStylePatch =>
  (style) =>
    isStraight(style) ? { ...keys, edgeStyle: 'orthogonalEdgeStyle', noEdgeStyle: undefined } : keys;

const EDGE_LINES: Record<EdgeLine, { label: string; patch: EdgeStylePatch; icon: string }> = {
  straight: {
    label: 'Droite',
    patch: () => ({ edgeStyle: undefined, noEdgeStyle: undefined, rounded: '0', curved: undefined }),
    icon: 'M2 13L14 5',
  },
  sharp: { label: 'Angles droits', patch: withRouter({ rounded: '0', curved: undefined }), icon: 'M2 13V5h12' },
  rounded: {
    label: 'Arrondi',
    patch: withRouter({ rounded: '1', curved: undefined }),
    icon: 'M2 13V8a3 3 0 0 1 3-3h9',
  },
  curved: { label: 'Courbe', patch: withRouter({ rounded: '0', curved: '1' }), icon: 'M2 13C2 7 7 5 14 5' },
};

/** Sauts aux croisements (`jumpStyle`), libellés du panneau. */
const JUMP_LABELS: Record<JumpStyle | 'none', string> = {
  none: 'Aucun',
  arc: 'Arc',
  gap: 'Coupure',
  sharp: 'Marche',
  line: 'Ligne',
};

const jumpLabel = (jumps: JumpStyle | 'none') => JUMP_LABELS[jumps];

/** Choix explicites d'un saut (le choix « par défaut » est ajouté par chaque liste). */
const JUMP_OPTIONS = (['none', ...JUMP_STYLES] as const).map((value) => ({ value, label: JUMP_LABELS[value] }));

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
  onChange: (patch: EdgeStylePatch) => void;
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
  const ownJump = jumpValue(edge.style.jumpStyle);
  const jump = ownJump ?? pageJumps;
  const jumpSize = parseInt(edge.style.jumpSize ?? '', 10);
  const curved = current === 'curved';
  return (
    <Section title="Tracé">
      <div className="field-row">
        Coudes
        <span className="button-group" role="radiogroup" aria-label="Tracé de la flèche">
          {(Object.keys(EDGE_LINES) as EdgeLine[]).map((value) => (
            <button
              key={value}
              type="button"
              role="radio"
              className="group-button format-button"
              aria-checked={current === value}
              aria-pressed={current === value}
              title={EDGE_LINES[value].label}
              onClick={() => onChange(EDGE_LINES[value].patch)}
            >
              <svg viewBox="0 0 16 16" aria-hidden="true">
                <path d={EDGE_LINES[value].icon} />
              </svg>
            </button>
          ))}
        </span>
      </div>
      <SelectField
        label="Croisements"
        title={
          curved
            ? 'Une flèche courbe ne fait pas de saut (comme draw.io)'
            : 'Rendu de la flèche là où elle passe au-dessus d’une autre (jumpStyle) ; par défaut : celui de la page'
        }
        value={ownJump ?? ''}
        disabled={curved}
        options={[{ value: '', label: `Par défaut (${jumpLabel(pageJumps)})` }, ...JUMP_OPTIONS]}
        onChange={(value) => onChange(() => ({ jumpStyle: jumpValue(value) }))}
      />
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

/** Bouts de flèche (`startArrow`, `endArrow`) que l'appli dessine, et s'ils peuvent être vides. */
const MARKERS: Array<{ value: string; label: string; fillable: boolean }> = [
  { value: 'none', label: 'Aucun', fillable: false },
  { value: 'classic', label: 'Classique', fillable: true },
  { value: 'classicThin', label: 'Classique fine', fillable: true },
  { value: 'block', label: 'Triangle', fillable: true },
  { value: 'blockThin', label: 'Triangle fin', fillable: true },
  { value: 'open', label: 'Ouverte', fillable: false },
  { value: 'openThin', label: 'Ouverte fine', fillable: false },
  { value: 'oval', label: 'Rond', fillable: true },
  { value: 'diamond', label: 'Losange', fillable: true },
  { value: 'diamondThin', label: 'Losange fin', fillable: true },
];

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
          <div key={end} className="field-row">
            {name}
            <span className="end-fields">
              {known?.fillable && (
                <label title={`Pointe pleine ou vide (${end}Fill)`}>
                  <input
                    type="checkbox"
                    checked={filled}
                    onChange={(event) => onChange(() => ({ [`${end}Fill`]: event.target.checked ? undefined : '0' }))}
                  />
                  pleine
                </label>
              )}
              <select
                aria-label={`Bout du ${name.toLowerCase()} de la flèche`}
                title={`Forme du bout (${end}Arrow)`}
                value={current}
                onChange={(event) => {
                  const value = event.target.value;
                  onChange(() => ({ [`${end}Arrow`]: end === 'start' && value === 'none' ? undefined : value }));
                }}
              >
                {!known && <option value={current}>{current} (non dessiné)</option>}
                {MARKERS.map((marker) => (
                  <option key={marker.value} value={marker.value}>
                    {marker.label}
                  </option>
                ))}
              </select>
            </span>
          </div>
        );
      })}
      <div className="field-row">
        Sens
        <button
          type="button"
          className="button"
          title="Inverser la flèche : elle part de sa cible et va vers sa source, les bouts restent en place"
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
      {edges.length > 0 && (
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

/** Actions d'ordre de dessin, avec leur raccourci de draw.io (infobulle). */
const ORDER_ACTIONS: Array<{ move: OrderMove; label: string; title: string }> = [
  { move: 'front', label: 'Premier plan', title: 'Passer au-dessus de tout (Ctrl / ⌘ + Maj + F)' },
  { move: 'back', label: 'Arrière-plan', title: 'Passer sous tout (Ctrl / ⌘ + Maj + B)' },
  { move: 'forward', label: 'Avancer', title: 'Monter d’un cran (Alt + Maj + F)' },
  { move: 'backward', label: 'Reculer', title: 'Descendre d’un cran (Alt + Maj + B)' },
];

/** Ordre de dessin, comme « Disposition » de draw.io : parmi les éléments de même parent (calque, conteneur). */
function OrderSection({ onOrder }: { onOrder: (move: OrderMove) => void }) {
  return (
    <Section title="Disposition">
      {[ORDER_ACTIONS.slice(0, 2), ORDER_ACTIONS.slice(2)].map((actions, row) => (
        <div key={row} className="field-row order-row">
          {row === 0 ? 'Plan' : 'D’un cran'}
          <span className="order-buttons">
            {actions.map(({ move, label, title }) => (
              <button key={move} type="button" className="button" title={title} onClick={() => onOrder(move)}>
                {label}
              </button>
            ))}
          </span>
        </div>
      ))}
    </Section>
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
  const text = preset.fontColor ?? '#000000';
  return (
    <svg viewBox="0 0 40 28" aria-hidden="true">
      <g
        fill={preset.fillColor}
        stroke={preset.strokeColor}
        dangerouslySetInnerHTML={{ __html: defaultShapeRegistry.swatch(shape) }}
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
