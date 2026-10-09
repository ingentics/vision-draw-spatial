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
- Fait :
  - Geste (`domains/edit/drag/gesture.ts`, 363 → 322 lignes) : plan de déplacement et bornes (`movePlan`,
    `moveBounds`, `resizeBounds`, types `MovePlan`, `MoveBounds`, `ResizeBounds`) sortis dans `core/edit/movePlan.ts`,
    les obstacles du mode passés en fonction (`ObstaclesOf`) ; `drag/types.ts` et `move.ts` importent ces types. Garde
    partagée `canMoveShape(pageTree, shape)` (`edit/moveSet.ts`) employée par le geste, `arrange.ts`, `pageModes.ts`,
    `targets.ts` (`editableSelection`) et `modeEditWriter.ts` (`setShapeBounds`) ; les formes déplaçables d'une
    sélection lues par une seule méthode (`movableShapes`) au clic et au clavier. Les deux aiguillages sur `drag.kind`
    remplacés par une table typée `{ [K in Drag['kind']]: { follow, commit } }`. `afterGeometryEdit` appelle
    `arrangement.distributeAfterEdit`. `PartDrags.clear()` devient `resetDocument()`, inscrit dans
    `EngineCore.resetDocumentState`.
  - Éditeur de texte (`domains/edit/text/labelEditor.ts`, 490 → 328 lignes) : géométrie à l'écran (emprise, plan,
    pancarte, échelle, angle du texte qui suit sa flèche, bascule, glissement de la vue) en fonctions sans état dans
    `domains/edit/text/labelEditGeometry.ts`, sur une vue réduite (`LabelEditView` : page, caméra, projection, scène)
    que l'éditeur construit une fois avec des accesseurs sur le cœur ; `labelEditScreen` et `textScale` restent des
    méthodes publiques de l'éditeur (appelées par `edgeTexts.ts`) qui délèguent. Aperçu de la saisie (forme qui place
    son label, partie d'une forme) dans `labelEditPreview.ts` (`LabelEditPreview`, tenu par l'éditeur) : l'éditeur
    garde les demandes d'édition, le suivi de la vue et le masquage du label.
  - Pick (`domains/selection/picking.ts`, 310 → 180 lignes) : projection (`screenOfPoint`, `groundPointAtHeight`,
    `screenRectOf`, `screenFootprint`, `standingPlane`, type `StandingPlane`) dans le domaine
    `domains/view/projection.ts` (`ScreenProjection`, `core.projection`) ; appelants passés de `core.picking.*` à
    `core.projection.*`. `drawnTextBox` / `drawnGlyphQuads` dans `render/drawnText.ts`. Boîte 120 × 32 d'un texte de
    flèche : constante unique `EDGE_TEXT_BOX` (`projection.ts`), lue par `screenRectOf` et `revealTarget`.
    `screenFootprint` prend les coins par `rectPath` (même ordre).
  - Écarts : `afterGeometryEdit` passe par `distributeAfterEdit`, qui n'écrit la répartition que si des formes sont
    touchées (`affectedShapes` non vide) et que l'édition est permise — l'ancien code appelait `writeDistribution`
    même sur un ensemble vide (rien à répartir, sans effet attendu). L'aperçu de saisie est tenu par
    `LabelEditPreview` (propriétaire de la copie de travail à la place de l'éditeur : même cycle prise / rendu).
    Aucun autre changement de comportement. `gesture.ts` et `labelEditor.ts` restent un peu au-dessus de 300 lignes
    (table des genres de glisser ; vue de la géométrie).
  - Validation : tests seuls. Nouveaux `tests/engine/core/edit/movePlan.test.ts` (plan, flèches détachées ou
    emportées, conteneur, bornes de déplacement et de redimensionnement), `tests/engine/core/domains/edit/text/
    labelEditGeometry.test.ts` (emprise forme / flèche / pancarte, plan, échelle 2D / 3D, angle, bascule, glissement
    de la vue), `canMoveShape` dans `moveSet.test.ts` ; `labelEditorPart.test.ts` : faux cœur `picking` → `projection`.
    `coding.md` §5 cite la garde `canMoveShape`. Non vérifié à l'œil (déplacer, redimensionner, glisser une partie RDD,
    éditer un texte en 2D, iso et 3D) : à faire sur le serveur partagé. `make check` vert.
