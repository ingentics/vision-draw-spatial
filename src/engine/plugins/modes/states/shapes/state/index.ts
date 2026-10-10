import { Group } from 'three';
import {
  createLabel,
  fillMesh,
  markPart,
  roundedRectPath,
  strokeMesh,
  styleColor,
  styleOpacity,
  styleStroke,
} from '../../../../../core/plugins';
import type { RenderContext, ShapeDefinition, ShapeModel } from '../../../../../core/plugins';
import { STATE_KIND } from '../../kinds';
import { BODY_PART, stateBody } from '../../state/bodyText';
import { STATE, bodyLines, bodyZone, dividerY, titleLines, titleZone } from '../../state/stateLayout';

/**
 * État (sujet 433) : rectangle arrondi à fond blanc et bordure fine, titre en gras centré en haut, puis, s'il a un
 * contenu, un trait et le contenu aligné à gauche. Sa hauteur suit son titre et son contenu (le mode l'ajuste), sa
 * largeur est libre. Dans draw.io, un rectangle arrondi au titre lisible ; le contenu n'y est pas dessiné.
 */

const outline = (shape: ShapeModel) => roundedRectPath(shape.bounds, STATE.radius);

/** Style d'un texte de l'état : sans marge dans sa zone, ses lignes déjà coupées. */
function textStyle(shape: ShapeModel, look: Record<string, string>): Record<string, string> {
  return {
    ...shape.style,
    spacing: '0',
    spacingTop: '0',
    spacingLeft: '0',
    spacingRight: '0',
    spacingBottom: '0',
    whiteSpace: 'nowrap',
    ...look,
  };
}

function createState(shape: ShapeModel, ctx: RenderContext): Group {
  const group = new Group();
  const { style, bounds } = shape;
  const path = outline(shape);
  const fill = styleColor(style, 'fillColor', '#ffffff');
  if (fill) group.add(fillMesh(path, fill, styleOpacity(style, 'fillOpacity')));
  const stroke = styleStroke(style, '#000000');
  const line = (points: typeof path, closed: boolean) => {
    const mesh =
      stroke && strokeMesh(points, stroke.color, stroke.opacity, { width: stroke.width, closed, dash: stroke.dash });
    if (mesh) group.add(mesh);
  };
  line(path, true);
  const divider = dividerY(shape);
  if (divider !== undefined)
    line(
      [
        { x: bounds.x, y: divider },
        { x: bounds.x + bounds.width, y: divider },
      ],
      false,
    );

  // Titre coupé comme pour la hauteur ajustée (`titleLines`), centré dans sa zone ; masqué pendant son édition.
  const zone = titleZone(shape);
  const title = createLabel(
    {
      ...shape,
      style: textStyle(shape, {
        fontSize: String(STATE.titleSize),
        fontStyle: '1',
        align: 'center',
        verticalAlign: 'middle',
      }),
    },
    ctx,
    titleLines(shape.label, zone.width, ctx.measureText).join('\n'),
    zone,
  );
  if (title) group.add(title);

  const body = bodyZone(shape);
  if (!body) return group;
  // Contenu sans retour automatique, tronqué à sa zone ; masqué pendant son édition sur place. Centré en hauteur dans sa
  // zone étendue des marges (même place qu'en haut de la zone) : aligné en haut, le texte prendrait un retrait de plus
  // et la dernière ligne serait tronquée.
  const text = createLabel(
    {
      ...shape,
      style: textStyle(shape, {
        fontSize: String(STATE.bodySize),
        fontStyle: '0',
        align: 'left',
        verticalAlign: 'middle',
      }),
    },
    ctx,
    bodyLines(stateBody(shape)).join('\n'),
    { ...body, y: body.y - STATE.padding, height: body.height + 2 * STATE.padding },
    { truncate: true },
  );
  if (text) {
    markPart(text, BODY_PART);
    group.add(text);
  }
  return group;
}

export const definition: ShapeDefinition = {
  id: STATE_KIND,
  outline,
  flat: { create: createState },
  textZone: (shape) => titleZone(shape),
  // Le titre dessiné : centré dans sa zone, sans marge ; éditeur sans mise en forme (texte brut).
  editStyle: (style) => ({
    ...style,
    align: 'center',
    verticalAlign: 'middle',
    fontStyle: '1',
    fontSize: String(STATE.titleSize),
    spacing: '0',
    spacingTop: '0',
    spacingLeft: '0',
    spacingRight: '0',
    spacingBottom: '0',
  }),
  plainText: true,
  swatch: () => '<rect x="5" y="5" width="30" height="18" rx="5"/><path d="M5 12h30"/>',
  palette: {
    name: 'État',
    category: 'states',
    order: 1,
    keywords: ['state', 'état', 'etat'],
    style:
      `rounded=1;whiteSpace=wrap;html=1;arcSize=${Math.round((STATE.radius * 2 * 100) / STATE.height)};` +
      `fillColor=#ffffff;strokeColor=#000000;fontStyle=1;fontSize=${STATE.titleSize};spatial.kind=${STATE_KIND};`,
    value: 'État',
    width: STATE.width,
    height: STATE.height,
    icon: '<rect x="6" y="4" width="28" height="20" rx="6"/><path d="M6 11h28M10 16h12M10 20h8"/>',
  },
};
