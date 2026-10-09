import type { EdgeModel, ShapeModel } from '../engine';
import { TEXT_FORMAT_ATTRIBUTE } from './LabelEditor';
import { CollapseButton } from './Sidebar';
import { TextFormatSections } from './TextFormat';
import { EdgeSections } from './context/EdgeSections';
import { ElementModeSection } from './context/ModeSections';
import { MultiSections } from './context/MultiSections';
import { PageSections } from './context/PageSections';
import { ShapeSections } from './context/ShapeSections';
import type { ContextPanelProps } from './context/types';

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
