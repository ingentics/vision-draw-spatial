import { useRef } from 'react';
import { isHexColor, jumpValue, routingKind, styleFlag, styleNumber } from '../../engine';
import { ColorInput, STROKE_COLORS } from '../BorderSection';
import type { EdgeModel, JumpStyle } from '../../engine';
import { ChoiceGroup } from '../ChoiceGroup';
import { NumberField, TextField } from '../Fields';
import { Section } from '../PanelSection';
import { EDGE_LINE_OPTIONS, JUMP_LABELS, JUMP_OPTIONS, MARKERS, markerOptions } from '../edgeIcons';
import type { EdgeLine } from '../edgeIcons';
import { useTooltip } from '../Tooltip';

/** Sections du tracé d'une flèche : ligne, ancrage, sauts, coupure, bouts. */

/** Tracé d'une flèche : droite, angles droits, coudes arrondis (par défaut des flèches créées), ou courbe. */

/** Clés de style à écrire sur une flèche, d'après son style actuel. */
export type EdgeStylePatch = (style: Record<string, string>) => Record<string, string | undefined>;

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

export function EdgeLineSection({
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
  const current: EdgeLine = styleFlag(edge.style, 'curved')
    ? 'curved'
    : isStraight(edge.style)
      ? 'straight'
      : styleFlag(edge.style, 'rounded')
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
          data-tip={
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
          data-tip={
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
export function EdgeSplitFields({
  edge,
  onChange,
}: {
  edge: EdgeModel;
  onChange: (patch: EdgeStylePatch, merge?: string) => void;
}) {
  const splitSession = useRef(0);
  return (
    <>
      <label className="field toggle" data-tip="Ne dessiner qu’un tronçon au départ et un à l’arrivée (split)">
        <input
          type="checkbox"
          checked={styleFlag(edge.style, 'split')}
          onChange={(event) => onChange(() => ({ split: event.target.checked ? '1' : undefined }))}
        />
        Couper la flèche
      </label>
      {styleFlag(edge.style, 'split') &&
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
export function EdgeEndsSection({
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
                <label className="end-fill" data-tip={`Pointe pleine ou vide (${end}Fill)`}>
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
          data-tip="Inverser le sens de la flèche : le début devient la fin et la fin le début, le tracé reste le même"
          onClick={onReverse}
        >
          Inverser
        </button>
      </div>
    </Section>
  );
}

/**
 * Flèche pleine (sujet 410) : sa couleur (celle du trait, qui la remplit) et son opacité. Toujours droite et sans
 * bouts ni trait, elle n'a ni tracé, ni bouts, ni épaisseur à régler.
 */
export function BlockArrowSection({ edge, onChange }: { edge: EdgeModel; onChange: (patch: EdgeStylePatch) => void }) {
  const { hover, tooltip } = useTooltip();
  const color = isHexColor(edge.style.strokeColor) ? edge.style.strokeColor.toLowerCase() : '#000000';
  const opacity = styleNumber(edge.style, 'opacity', 100);
  return (
    <Section title="Flèche pleine">
      <div className="field-row color-row">
        Couleur
        <ColorInput
          key={color}
          value={color}
          label="Couleur de la flèche"
          onChange={(next) => onChange(() => ({ strokeColor: next }))}
        />
      </div>
      <div className="text-colors">
        {STROKE_COLORS.map((swatch) => (
          <button
            key={swatch}
            type="button"
            className="text-color"
            style={{ background: swatch }}
            aria-label={`Flèche ${swatch}`}
            {...hover(`Flèche ${swatch} (strokeColor)`)}
            aria-pressed={swatch === color}
            onClick={() => onChange(() => ({ strokeColor: swatch }))}
          />
        ))}
      </div>
      <NumberField
        key={`${edge.id}:${opacity}`}
        label="Opacité (%)"
        title="Opacité de la flèche, de 0 (invisible) à 100 (opaque) (opacity) ; vide = 100"
        value={opacity === 100 ? undefined : opacity}
        placeholder="100"
        onCommit={(value) =>
          onChange(() => ({
            opacity: value === undefined || value >= 100 ? undefined : String(Math.round(Math.min(100, value))),
          }))
        }
      />
      {tooltip}
    </Section>
  );
}
