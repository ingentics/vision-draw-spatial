# Flèche pleine (« block arrow » à la Miro)

> Milestone — Palette, catégorie « Général » (`plugins/shapes/categories.ts`). Voir 327 (flèche libre posée depuis
> la palette), 53 (tracé « Droite »). Export draw.io seulement (408).

- Nouvelle entrée « Flèche pleine » dans « Général », après « Flèche » : une flèche dessinée comme une **forme
  pleine** (un seul polygone rempli, sans contour séparé), comme le « block arrow » de Miro :
  - proportions données pour une flèche de 100 px de long :
  - corps **effilé** : pointe fine à la queue (2 px de large), qui s'élargit jusqu'à 12 px à la base de la tête ;
  - tête triangulaire de 28 px de large et 24 px de long, sa base légèrement creusée vers l'arrière (4 px) ;
  - remplissage de la couleur de trait de la flèche (gris foncé par défaut, comme les flèches créées), pas de
    contour.
- **Toujours droite** : le tracé va en ligne droite de la queue à la pointe ; pas de points intermédiaires, pas de
  coudes, pas de choix de tracé (les boutons « Coudes » et l'ajout de points sont absents pour elle).
- Comme la flèche de 327 : posée au centre de la vue au clic (glisser-déposer : au point visé), longueur 100 px,
  horizontale, aimantée à la grille, sélectionnée une fois posée ; ses deux bouts se déplacent librement et peuvent
  se rattacher à une forme (la flèche reste droite, d'un bout à l'autre).
- Réglages : couleur et opacité ; pas de bouts de flèche, d'épaisseur ni de pointillés (inertes pour elle).
- Export : le fichier enregistré s'ouvre dans draw.io (par ex. arête `shape=flexArrow` sans `edgeStyle`) ; le rendu
  dans draw.io n'a pas à être identique.
- La forme de la flèche est étirable : allongée ou raccourcie, elle **garde toutes ses proportions** (largeurs de la
  queue, du corps et de la tête proportionnelles à sa longueur).
- **Fini quand :** dans l'appli, un clic sur « Flèche pleine » pose au centre de la vue une flèche droite effilée à
  tête pleine comme sur la capture Miro ; en déplaçant ses bouts elle reste droite et garde ses proportions ; fixture
  avec une flèche pleine libre et une rattachée à deux formes ; `make check` vert.
- Fait : contour et reconnaissance (`shape=flexArrow`) dans `render/edges/blockArrow.ts` (`blockArrowOutline`,
  proportions pour 100 px, mises à l'échelle de la longueur) ; rendu dans `render/edges/edge.ts` (polygone plein de la
  couleur du trait, ni trait ni pointes ; son contour fermé devient le tracé dessiné, pour le clic) ; voile de
  sélection : trou en forme de la flèche agrandie de la marge (`blockArrowOutline(…, margin)`, `createVeilHoleArea` dans
  `render/veil.ts`, `domains/selection/highlight.ts`), qui garde sa silhouette au dézoom (une bande le long du contour
  la déformait) ; toujours droite :
  `routingKind` rend `straight`, `routeEdgePoints` ignore les points intermédiaires, `edgeRouter` pas de boucle ;
  `pointsEditor` → `none`, aucune poignée entre les bouts (`edit/edgePointEdits.ts`). Clic : un tracé fermé se prend
  aussi à l'intérieur (`interaction/pick.ts`, générique). Palette : `plugins/shapes/general/block-arrow/` (« Flèche
  pleine », `shape=flexArrow;strokeColor=#333333;`) ; `addFreeEdge` ne lui ajoute pas le tracé du réglage
  `shapes.edgeLineStyle` (`domains/edit/commands/elements.ts`). Panneau : section « Flèche pleine » (couleur,
  pastilles, opacité `opacity`) à la place de « Tracé » et « Bouts » (`app/context/EdgeLineSections.tsx`,
  `EdgeSections.tsx` ; `ColorInput` et `STROKE_COLORS` exportés de `BorderSection.tsx`) ; « Inverser » n'y est donc
  pas. Écart au ticket : la ligne ajoutée « garder tous les ratios » l'emporte sur « largeurs fixes ». Tests :
  `tests/engine/core/render/edges/blockArrow.test.ts`, palette. Fixture `tests/fixtures/block-arrow.drawio` (libre,
  longue en biais, rattachée à A et B avec un coude et `edgeStyle` ignorés). Vérifié à l'œil sur le serveur partagé :
  pose depuis la palette, sélection, panneau, étirement par la pointe (proportions gardées, pas de poignée
  intermédiaire). Non fait : `make drawio-check`, glisser-déposer depuis la palette, rattachement d'un bout à l'œil.
