# Geste et éditeur de texte : logique pure sortie, un sujet par fichier

> Architecture du moteur — responsabilité par fichier (`coding.md` §3, §6). Audit du 2026-10-08 (`AUDIT.md`).

- `domains/edit/drag/gesture.ts` (363 lignes, 26 membres du cœur touchés) :
  - `movePlan`, `moveBounds`, `resizeBounds` (`173-249`) ne prennent que la page, son arbre, les obstacles et formes
    emportées : vers `core/edit/movePlan.ts`, testés seuls ;
  - filtre « formes déplaçables de la sélection » recopié (`117-131`, `256-259`) ; même test
    `!isLocked && canMoveCell` dans `arrange.ts:70` et `pageModes.ts:154` : une garde partagée ;
  - deux aiguillages parallèles sur `drag.kind` (`295-301`, `324-332`) : une table
    `Record<Drag['kind'], { follow, commit }>` ;
  - `afterGeometryEdit` (`342-355`) refait `arrangement.distributeAfterEdit` (`arrangement.ts:34-44`) : l'appeler ;
  - `resetDocument` remet `partDrags` à zéro (`:37`) : `PartDrags` s'inscrit lui-même dans `resetDocumentState`.
- `domains/edit/text/labelEditor.ts` (508 lignes) mêle demandes d'édition, ≈ 150 lignes de géométrie écran
  (`labelEditScreen`, `labelEditPlane`, `signPlane`, `textScale`, `revealTarget` : `276-341`, `455-507`) et aperçu :
  la géométrie va dans `edit/text/labelEditGeometry.ts` (pure).
- `domains/selection/picking.ts` : la projection (`screenOfPoint`, `screenRectOf`, `groundPointAtHeight`,
  `standingPlane`, `screenFootprint`) sort dans un fichier de projection ; `drawnTextBox` / `drawnGlyphQuads`
  (`265-307`, lisent Three.js) vont dans `render/` ; la boîte 120×32 (`picking.ts:251`, `EDGE_TEXT_BOX`
  `labelEditor.ts:23`) devient une constante unique.
- Écart : aucun. Tests existants intacts sauf imports ; `movePlan` et la géométrie de l'éditeur testés seuls.
- **Fini quand :** aucun des trois fichiers ne dépasse ~300 lignes ni ne mêle deux sujets ; déplacer, redimensionner,
  glisser une partie RDD, éditer un texte en 2D, iso et 3D identiques à l'œil ; `make check` vert.
