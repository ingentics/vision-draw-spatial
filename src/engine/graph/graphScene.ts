import { embedIn } from '../interaction/transitionMath';
import type { DocumentModel, PageModel } from '../model/types';
import { buildPageScene } from '../render/pageScene';
import type { PageScene } from '../render/pageScene';
import type { ShapeRegistry } from '../shapes/registry';
import type { SceneLevel } from '../shapes/types';
import { setLocalEmbedding } from '../render/space';
import type { RenderContext } from '../render/types';
import { cardId } from './graphPage';
import type { GraphLayout } from './graphPage';

/**
 * Ordre de dessin des miniatures : au-dessus du reste de la page graphe. Elles sont à
 * l'intérieur des cartes, où rien d'autre n'est dessiné.
 */
const THUMBNAIL_ORDER = 1_000_000;

/**
 * Scène de la vue graphe : la page graphe (cartes, titres, flèches) et, dans chaque carte, la vraie
 * page en miniature — nette à tous les zooms. Elle est posée exactement comme le fera la transition
 * de lien (`embedIn`, même marge) : plonger dans une carte est donc continu.
 */
export function buildGraphScene(
  graphPage: PageModel,
  layout: GraphLayout,
  document: DocumentModel,
  registry: ShapeRegistry,
  ctx: RenderContext,
  level: SceneLevel,
): PageScene {
  const scene = buildPageScene(graphPage, registry, ctx, level);
  const pages = new Map(document.pages.map((p) => [p.id, p]));
  for (const card of layout.cards) {
    const page = pages.get(card.pageId);
    if (!page || page.bounds.width + page.bounds.height === 0) continue;
    const thumbnail = buildPageScene(page, registry, ctx, level);
    setLocalEmbedding(thumbnail.root, embedIn(page.bounds, card.bounds));
    thumbnail.root.name = `thumbnail:${page.id}`;
    // Mise en valeur de la sélection : la miniature suit sa carte.
    thumbnail.root.userData.highlightWith = cardId(page.id);
    thumbnail.root.traverse((object) => {
      object.renderOrder += THUMBNAIL_ORDER;
    });
    scene.root.add(thumbnail.root);
  }
  // `scene.dispose` libère tout le sous-arbre, miniatures comprises.
  return scene;
}
