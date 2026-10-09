# Formes : briques communes entre plugins et conventions typées

> Architecture du moteur — plugins de formes ; suite de 306, 325. Audit du 2026-10-08 (`AUDIT.md`).

- Stencils : `stencilBox` (`generic/stencil/index.ts:36-40`) recopié dans `geometry/pentagon/index.ts:20-24` et
  `geometry/six-point-star/index.ts:28-32` ; écriture XML d'un tracé deux fois (`actors/droid/index.ts:7-15`
  `stencilPath`, `stencil/index.ts:16-22` `stencilXml`) → `stencilOutline(stencil)` et `stencilPathXml(points, closed)`
  exportés par `generic/stencil` (une forme peut étendre une forme, `coding.md` §5).
- Façades d'architecture : BDD (`database/facade.ts:24-34`) et file (`queue/facade.ts:26-42`) partagent le début (toit
  `[SPATIAL.height]`, aussi `building/index.ts:84`, étiquette, trait, plinthe, bande) → `engravedBuilding(...)` dans
  `generic/building` ; rectangle rentré à la main (`facade.ts:26-31`) → `inflate(bounds, -inset)` ; inset borné à
  zéro à la main (`rdd/shapes/common/table.ts:155-160`) → une brique `inset(rect, by)`.
- Coins arrondis : `roundedOpen` (`general/curly-bracket-left/index.ts:23-50`) refait `roundedPolygon`
  (`render/geometry/paths.ts:101-146`) sans fermeture → option `closed` ; `quadTo` ajouté à `render/geometry/curves.ts`.
  `roundCorners` des flèches (`polyline.ts:38-61`) reste distinct (rayon borné par les côtés voisins) : le dire en
  commentaire.
- Conventions `userData` brutes : `part` (posé par `rdd/shapes/common/fieldRow.ts:151`, `table.ts:211`, lu par
  `domains/modes/shapeParts.ts:231`), `billboard` (`render/billboard.ts:24-28`, `standing.ts:68`) → poseurs typés de
  l'API (`markPart(object, part)`, `faceCamera(object, 'axis' | 'screen')`), comme `setStandingFigure` (306) ;
  `userData.height` écrit sans lecteur du tronc (`building/index.ts:60`, `standing.ts:66`) et demandé par le guide
  (`AJOUTER_UNE_FORME.md:268`) : retiré du guide et des plugins qui l'écrivent pour rien (garder les relectures
  entre plugins de `box/index.ts:104`, `tagged-process/index.ts:102` si elles servent).
- `ShapeDefinition.details` (`core/shapes/types.ts:189`) : jamais appelé par le tronc, seulement par
  `generic/box/index.ts:84,105-106` (sans protection) → option de la base `box` ; JSDoc « Rendu à plat,
  obligatoire » mal placée (`types.ts:190`, au-dessus de `contains`).
- Vue graphe : `graph/graphPage.ts:140,156,181` crée des `ellipse` et `text` dessinées par les plugins : définitions du
  tronc (comme `shapes/group.ts`) ou dépendance testée.
- Incohérence à vérifier : `render/pageScene.ts:251` teste `fillColor === 'none'`, `iso/block.ts:87` teste
  `styleColor(...)` nul : une forme sans `fillColor` dont le défaut est `null` est traitée différemment en 2D et en
  iso. Si c'est un écart visible, sujet à part.
- Écart : aucun (rendu au pixel : `shapesFixture`).
- **Fini quand :** recherches relues (`stencilBox`, `userData.part =`, `userData.billboard =`, `userData.height =`)
  sans copie ; formes, acteurs, accolades, architecture, RDD identiques à l'œil dans les trois vues ; `shapesFixture`
  vert sans changement ; `make check` vert.
- Fait : briques communes, sans changement de rendu attendu (`shapesFixture` vert tel quel, `make check` vert ;
  vérifié par les tests seulement, pas à l'œil dans l'appli).
  - Stencils : `generic/stencil` exporte `stencilOutline({ width, height, outline })` (contour étiré et orienté, repris
    par `stencilBox`, `pentagon`, `six-point-star`) et `stencilPathXml(points, closed)` (repris par `stencilXml` et le
    droid) ; type `StencilFrame` (cadre sans nom). Le XML de la prise arrondit désormais au millième comme celui du
    droid : coordonnées entières, valeur de `shape=` identique.
  - Bâtiments : `engravedBuilding(flat, tag, engraveFacade)` dans `generic/building` (toit par `slab`, étiquette,
    trait, plinthe, bande ; `EngravedFacade`) repris par la BDD et la file ; `rectBlock` retiré, `strokeOf` et
    `plinthOf` non exportés. Cache : `inflate(bounds, -inset)`. Nouvelle brique `inset(rect, by)` (`model/geometry.ts`,
    testée, dans l'API) pour le double entête des tables RDD.
  - Coins arrondis : `roundedPolygon(points, arc, { closed, segments })` (option `closed: false` portée de
    `mxShape.addPoints`) remplace `roundedOpen` de l'accolade ; `quadTo` ajouté à `render/geometry/curves.ts`, repris
    par `roundedPolygon`, `roundCorners` et `curveThrough` (mêmes formules, résultat identique au bit) ; commentaire
    de `roundCorners` sur ce qui le distingue. Écart : comparés sur 20 000 accolades tirées au hasard, identiques à
    1e-13 px près ; seuls les cas dégénérés (côté de moins de 1 px : tige à moins d'1 px d'un bord, hauteur < 2 px)
    diffèrent, et suivent maintenant draw.io (sommets confondus sautés, longueur minimale 1).
  - Conventions `userData` : `faceCamera(object, 'axis' | 'screen')` (`render/billboard.ts`) et `markPart(object,
    part)` / `partOf` (`render/partMarks.ts`, nouveau) ; `faceCamera` et `markPart` exportés par l'API des plugins,
    repris par l'acteur, la pastille et les textes des flèches, l'anneau de tête, les tables RDD, `shapeParts`. Valeurs
    stockées inchangées (`true` / `'screen'`). `userData.height` retiré de `generic/building` et de l'acteur (aucun
    lecteur) ; gardé dans `isoBlock`, relu par `generic/box` et `tagged-process`.
  - `ShapeDefinition.details` retiré (option de la base `box` seulement) ; JSDoc « Rendu à plat, obligatoire »
    remise au-dessus de `flat`. Le test `shapesFixture` (dessin intérieur) prend les fonctions exportées
    `processBars` (process) et `taggedDetails` (tranche étiquetée) au lieu de `definition.details` : changement de
    test au-delà des imports.
  - Vue graphe : dépendance testée (`graph.test.ts` : toutes les formes de la page graphe sont dessinées par les formes
    par défaut, aucune en placeholder) et dite dans `graphPage.ts`.
  - `fillColor` 2D / iso : pas d'écart visible aujourd'hui (seul `text` a un fond par défaut nul, et il n'a pas
    d'iso) ; dette latente notée en `debt/402`.
  - Dette 392 traitée (forêt : normale par `Vector3`, écart de l'ordre du bit sur l'ombrage) et retirée ; 398 laissée
    (flèches, hors formes).
  - Guides : `AJOUTER_UNE_FORME.md` (briques de stencil, `faceCamera`, `engravedBuilding`, `userData.height` et
    `details` retirés), `AJOUTER_UN_MODE.md` (`faceCamera`, `markPart`).
