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
