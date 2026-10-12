# Épaisseur et écart des flèches imposés par l'habillage d'un mode

> Itération — moteur, habillage d'un mode (`PageDressing`) ; nécessaire au mode Story telling (474)

- `PageDressing.edgeStyle(edge)` : clés de style dessinées à la place de celles de la flèche (comme `shapeStyle` pour
  les formes, ex. `strokeWidth`), le style draw.io intact.
- `PageDressing.edgeInset` : écart en px entre le bout d'une flèche accrochée à une forme et cette forme ; le trait
  dessiné (pointe comprise) est raccourci d'autant à chaque bout accroché (au plus un tiers du segment, pour ne
  jamais le retourner). Un bout libre n'est pas raccourci. Le tracé raccourci sert aussi aux textes, à la pastille,
  au clic et à la couche d'un mode.
- Dessin seulement : rien n'est écrit dans le fichier.
- **Fini quand :** une page dont le mode impose une épaisseur et un écart montre des flèches plus épaisses qui
  s'arrêtent avant les formes, en 2D, iso et 3D, aussi pendant un déplacement ; tests du rendu ; `make check` vert.
- Fait : `PageDressing.edgeStyle` et `edgeInset` (`core/modes/dressing.ts`), protégés par `PageModes.dressing` ;
  appliqués par `createEdgeObject` (`render/pageScene.ts`) et `createEdge` (`render/edges/edge.ts`, `insetEnds`). Doc
  `AJOUTER_UN_MODE.md`. Test `tests/engine/core/render/edges/edgeInset.test.ts`. Vu dans l'appli en 2D et 3D sur la
  fixture Story telling ; iso et déplacement d'une forme non vérifiés à l'œil.
