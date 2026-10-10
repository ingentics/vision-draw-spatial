import { useRef } from 'react';
import {
  anchorOf,
  commentOf,
  edgeTexts,
  endLabelOf,
  isBlockArrow,
  SPATIAL,
  styleFlag,
  styleNumber,
} from '../../engine';
import type { EdgeModel, EdgeTextAnchor } from '../../engine';
import { NumberField, TextField } from '../Fields';
import { OrderSection } from '../OrderSection';
import { Section } from '../PanelSection';
import { useTooltip } from '../Tooltip';
import { CommentField } from '../comment';
import { useEnginePlugins } from '../pluginsContext';
import type { EdgeStylePatch } from './EdgeLineSections';
import { BlockArrowSection, EdgeEndsSection, EdgeLineSection, EdgeSplitFields } from './EdgeLineSections';
import { ElementModeSection } from './ModeSections';
import { DeleteButton, LabelRow } from './contextFields';
import type { ContextPanelProps } from './types';

/** Sections du panneau contextuel pour une flèche sélectionnée seule : texte, ancres des textes. */

export function EdgeSections({ edge, ...props }: ContextPanelProps & { edge: EdgeModel }) {
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
      {isBlockArrow(edge.style) ? (
        <BlockArrowSection edge={edge} onChange={props.onEdgeStyle} />
      ) : (
        <>
          <EdgeLineSection
            edge={edge}
            edgeLines={props.edgeLines}
            pageJumps={props.pageJumps}
            defaultJumpSize={props.defaultJumpSize}
            onChange={props.onEdgeStyle}
            onResetRoute={props.onResetRoute}
          />
          <EdgeEndsSection edge={edge} onChange={props.onEdgeStyle} onReverse={props.onReverse} />
        </>
      )}
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
            <span className="field-value label-value" data-tip={text.label}>
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
          data-tip={`Texte du milieu posé le long du trait de la flèche (${SPATIAL.labelFollow}) ; draw.io le garde horizontal`}
        >
          <input
            type="checkbox"
            checked={styleFlag(edge.style, SPATIAL.labelFollow)}
            onChange={(event) => onChange(() => ({ [SPATIAL.labelFollow]: event.target.checked ? '1' : undefined }))}
          />
          Texte du milieu : suit la flèche
        </label>
      )}
      {edge.label.trim() && styleFlag(edge.style, SPATIAL.labelFollow) && (
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
  const shift = styleNumber(edge.style, SPATIAL.labelFollowShift, 0) || undefined;
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
