# Côtés d'une forme et ancrages : une seule définition

> Architecture du moteur — mutualisation (`coding.md` §4). Audit du 2026-10-08 (`AUDIT.md`).

- Constat :
  - deux types identiques `AnchorSide` (`core/edit/edgeEnds.ts:24`) et `ConnectSide` (`core/edit/handleKinds.ts:9`) ;
    trois listes `['n','e','s','w']` (`edgeEnds.ts:41`, `handleKinds.ts:14`, `edit/anchoring/manual/variants.ts:27`) ;
    deux tables de normales (`SIDE_NORMALS`, `edgeEnds.ts:27` ; `CONNECT_DIRECTIONS[].direction`,
    `handleKinds.ts:17-22`) ;
  - `onSide` (`edgeEnds.ts:57`) = `pointOnSide` (`edit/anchoring/auto/distribute.ts:34`) ; `sideMiddle`
    (`distribute.ts:41`) = `CONNECT_DIRECTIONS[].exit` ; segments d'un côté recopiés dans
    `domains/edit/drag/preview.ts:48-60` ;
  - `Anchors.anchorPosition` (`domains/edit/edges/anchors.ts:179-188`, sans `this`) recopié dans `variants.ts:35-45` ;
    `Anchors.nearestFreeAnchor` (`anchors.ts:116-131`) recopié dans `variants.ts:86-94` ;
  - « poignée la plus proche à l'écran » recopiée cinq fois : `domains/modes/modeHandles.ts:36-41`,
    `domains/edit/shapeHandles.ts:28-33`, `domains/edit/edges/edgeHandles.ts:29-34` et `:81-87`, `anchors.ts:72-79` ;
  - `toTerminal`, pure, vit dans `core/render/edges/edge.ts:333-341` (qui importe `three`) : quatre fichiers purs de
    `edit/anchoring/` dépendent ainsi du rendu.
- Ce qu'on veut : un type `Side`, une liste `SIDES`, `SIDE_NORMALS`, `sideMiddle`, `pointOnSide`, `sideSegment` dans
  `edit/edgeEnds.ts` (`CONNECT_DIRECTIONS` en dérive) ; `anchorPosition` et `nearestFreeAnchor` purs (dans `edit/`),
  appelés par le domaine et par `variants.ts` ; `nearestOnScreen(items, pointOf, …, tolérance)` dans
  `domains/selection/picking.ts` (ou la projection, cf. 384) ; `toTerminal` dans `render/edges/terminal.ts` sans Three.
- Écart à annoncer : `modeHandles` prenait la **première** poignée dans la tolérance, il prendra la plus proche (ne
  change que si deux poignées de mode se chevauchent).
- Tests : `edgeEnds`, `anchors`, `variants` intacts sauf imports ; un test de `nearestOnScreen`.
- **Fini quand :** `grep -rn "'n', 'e', 's', 'w'" src/engine` ne trouve qu'une liste ; accroche manuelle, automatique
  et Typon identiques à l'œil sur les fixtures `edge-ends` et `edge-points` ; `make check` vert.
- Fait :
  - **Côtés** : `edit/edgeEnds.ts` porte le type `Side` (remplace `AnchorSide` et `ConnectSide`), `SIDES` (seule liste
    `['n','e','s','w']` du moteur), `SIDE_NORMALS`, `pointOnSide` (remplace `onSide` local et celui de `distribute.ts`),
    `sideMiddle` (sorti de `distribute.ts`) et `sideSegment` (remplace la table de segments de
    `domains/edit/drag/preview.ts`). `CONNECT_SIDES` et `CONNECT_DIRECTIONS` sont **supprimés** plutôt que dérivés :
    `handleKinds.ts`, `render/handleMeshes.ts`, `shapes/registry.ts`, `domains/edit/drag/connect.ts` lisent directement
    `SIDES`, `SIDE_NORMALS[side]` et `sideMiddle(side)` (mêmes valeurs). `ConnectHandle` = `` `connect-${Side}` ``.
  - **Ancrages** : `anchorPosition(shape, constraint)` et `nearestFreeAnchor(shape, anchors, toward, side?)` purs dans
    `edit/edgeEnds.ts` ; `edit/anchoring/manual/variants.ts` les appelle (copies locales retirées) ; le domaine
    `Anchors` perd sa méthode `anchorPosition` (appelants : `connect.ts`, `preview.ts`, `anchors.ts`) et sa méthode
    `nearestFreeAnchor` ne fait plus que lui passer `anchorsOf(…)`.
  - **Poignée la plus proche** : `nearestOnScreen(items, screenOf, screen, tolerance, bias?)` exportée par
    `domains/selection/picking.ts` (fonction pure, le placement écran est passé par l'appelant), utilisée par
    `modeHandles.handleAt`, `shapeHandles.handleAt`, `edgeHandles.edgeEndAt` / `pointHandleAt` (biais 0,5 px des
    poignées en transparence) et `Anchors.endAttachmentAt` (candidats aplatis forme × ancre, tolérance 1,5 ×).
  - **`toTerminal`** déplacée dans `render/edges/terminal.ts` (sans Three.js) ; `edge.ts`, les quatre fichiers de
    `edit/anchoring/`, `anchors.ts`, `edgeHandles.ts` et `edgeEnds.ts` l'importent de là.
  - **Écart** : `modeHandles.handleAt` prenait la **première** poignée de mode dans la tolérance, il prend la plus
    proche (ne change que si deux poignées de mode se chevauchent). Aucun autre.
  - Comparaison avant suppression (test jetable, retiré) : anciennes `anchorPosition` (domaine et `variants.ts`) et
    les deux anciennes recherches du point libre le plus proche contre les nouvelles sur toutes les formes de
    `edge-ends`, `edge-points`, `shapes`, `anchor-routing`, `flows` (20 tirages par forme : contrainte, ancres prises,
    cible, côté) ; ancienne `placementVariants` contre la nouvelle sur toutes leurs flèches reliées ;
    `CONNECT_DIRECTIONS` contre `SIDE_NORMALS` / `sideMiddle`, `onSide` contre `pointOnSide`, table de `preview.ts`
    contre `sideSegment` ; boucle « plus proche » d'origine contre `nearestOnScreen` sur 2000 tirages : tous égaux.
  - Tests : `tests/engine/core/edit/edgeEnds.test.ts` (côtés, `anchorPosition`, `nearestFreeAnchor` ajoutés),
    `tests/engine/core/domains/selection/picking.test.ts` (`nearestOnScreen`), `tests/engine/core/render/edges/terminal.test.ts` ;
    les autres tests ne changent que par leurs imports (`toTerminal`, `sideMiddle`, `Side as AnchorSide`). Tests de
    pixels (fixtures de flèches, `shapesFixture`) inchangés et verts. `coding.md` §4 cite les nouvelles briques.
  - Validation : tests seulement (`make check` vert). À vérifier à l'œil : accroche manuelle (points d'ancrage, cercle
    du point retenu), automatique (côté surligné) et Typon sur `edge-ends` et `edge-points` ; poignées de connexion
    (flèches orientées) et de redimensionnement ; touche F ; poignées de mode RDD.
