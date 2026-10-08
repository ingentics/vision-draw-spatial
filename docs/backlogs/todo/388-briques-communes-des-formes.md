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
