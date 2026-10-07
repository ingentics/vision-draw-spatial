# Étanchéité : trois brèches par lesquelles un plugin peut encore écrire ou sortir de sa boîte

> Architecture du moteur — étanchéité des plugins ; suite de 300, 301, 303, 312. Audit du 2026-10-07 (seconde passe).
> Trois sujets indépendants réunis parce qu'ils touchent la même règle : « un plugin lit, il n'écrit que par
> `ModeEdit`, et il ne voit ni le DOM ni les objets vivants du moteur ». Chaque partie est faite et testée seule.

## A. Copie de travail d'un geste remise aux plugins sans gel

- Constat : `livePage()` (`src/engine/core/domains/document/file.ts:92-106`) renvoie un `structuredClone` que rien ne
  gèle avant `settleLivePage` / `closeLivePage` (`freezeModel`, `file.ts:118-124`). Pendant un geste, cette copie est
  passée telle quelle aux points d'entrée des plugins :
  - `pageModes.dressing(page)` depuis `domains/edit/drag/liveEdit.ts:76` (flèches retracées pendant un glisser) ;
  - `shapeParts.dropAt` et `shapeParts.dragPreview` depuis `domains/edit/drag/part.ts:34,37` (glisser d'une partie) ;
  - `pageModes.endAccepts` (→ `edges.connects`) depuis `domains/edit/drag/connect.ts:34` et
    `domains/edit/drag/edgeEnd.ts:28` ;
  - `renderer.create` d'une forme via `createShapeObject` depuis `liveEdit.ts:44` (`rebuildShapeObject`).
  - Cas voisin : `followUp` (`domains/modes/pageModes.ts:288`) passe une page `documentFromTree` fraîche, jamais gelée.
  Une écriture d'un plugin sur ces pages ne lève donc aucune exception, même en dev, alors que la garantie du sujet 312
  (« une écriture lève une exception, traitée comme une panne du point d'entrée ») est documentée dans
  `AJOUTER_UN_MODE.md` §2. La copie devient ensuite la page du document.
- Ce qu'on veut : **toute page, forme ou flèche remise à un point d'entrée de plugin (mode, forme, effet) est, en dev
  et en test, inviolable** : gelée (`Object.isFrozen`) ou vue en lecture seule qui lève à l'écriture. En production,
  rien ne change (pas de coût).
- Comment (choix recommandé, à confirmer en lisant le code) :
  - `core/model/freeze.ts` gagne `readonlyModel<T>(value: T): T` : en dev / test, un `Proxy` **en lecture seule et
    paresseux** (les sous-objets sont enveloppés à la lecture, cache `WeakMap` pour rendre toujours le même proxy ;
    `set`, `deleteProperty`, `defineProperty` lèvent une `TypeError` au même message que le mode strict ; un objet déjà
    gelé ou une fonction est rendu tel quel) ; en production, `value` lui-même. Pas de copie : le geste continue
    d'écrire dans la copie de travail, seuls les plugins reçoivent la vue.
  - Les vues sont posées **aux passerelles uniques** vers les plugins, pas aux sites d'appel : `PageModes` (hôte unique
    des points d'entrée de mode, `domains/modes/pageModes.ts`, `modeCurrents.ts`, `modeHandles.ts`, `shapeParts.ts`),
    `ShapeRegistry` (méthodes protégées, `core/shapes/registry.ts`) et `PageEffectRegistry.active/volume`
    (`core/effects/registry.ts`). Une page déjà gelée (cas courant hors geste) est rendue telle quelle : coût nul.
  - `applyModeEdit` : `edit.page` reçoit la même vue ; vérifier qu'`applyModeEdit` lui-même n'écrit pas dans `page`
    (sinon faire la vue après ses propres calculs). Pour `followUp`, `freezeModel(fresh)` suffit si rien n'y écrit.
  - Alternative écartée : geler la copie de travail et refaire une copie pour chaque geste — le geste doit écrire dedans.
- Écart de comportement : aucun en production ; en dev / test, un plugin qui écrivait dans la page pendant un geste
  est maintenant signalé (Diagnostics « Mode <id> : erreur dans <point d'entrée> ») et son point d'entrée traité comme
  absent.
- Tests (`tests/engine/core/domains/edit/drag/…` ou `tests/engine/core/modes/registry.test.ts`, mode de test de
  `fixtures/test/`) :
  - un mode de test dont `dressing` fait `page.shapes[0].bounds.x = 0` : pendant un glisser (début, mouvement, fin),
    la copie de travail n'est pas modifiée, une erreur est signalée une fois, le glisser aboutit ;
  - idem pour `edges.connects` pendant le tirage d'une flèche, et `parts.dropAt` pendant le glisser d'une partie ;
  - une forme de test dont `flat.create` écrit `shape.label = 'x'` : placeholder dessiné, erreur signalée, label intact ;
  - `readonlyModel` : lecture transparente (égalité des valeurs, `Array.isArray`, itération, `JSON.stringify`),
    écriture refusée à tous les niveaux, même proxy rendu deux fois, objet gelé rendu tel quel.

## B. `setElementAttribute` ignore le verrou

- Constat : `core/modes/modeEdits.ts:77-98` n'appelle pas `isLocked(element)`, contrairement à `setElementStyle`
  (l.106), `setShapeBounds` (l.115) et `setEdgeEndText` (l.132). Un mode écrit donc un attribut (donc dans le style
  draw.io de l'élément, ou sur son `<object>`) d'un élément verrouillé, alors que la doc du contrat
  (`core/modes/types.ts`, bloc `ModeEdit`, et `AJOUTER_UN_MODE.md` §3 : « Un élément verrouillé ne change ni de
  style… ») dit l'inverse.
- Ce qu'on veut : `setElementAttribute` **ignore** un élément verrouillé (retour silencieux, comme ses voisins : pas
  d'exception, l'opération continue). `setPageAttribute` n'est pas concerné (la page n'a pas de verrou).
- Écart de comportement à annoncer dans le « Fait : » : une table RDD ou une flèche Séquences verrouillée dans
  draw.io (`locked=1`) ne reçoit plus les écritures d'attribut du mode (remise en ordre à l'ouverture, `placed`,
  `relabeled`, réglages du panneau…). Vérifier à l'œil qu'une table verrouillée ne casse pas l'ouverture d'une page RDD
  (le `check` du mode peut la signaler, mais rien ne doit lever).
- Doc : `AJOUTER_UN_MODE.md` §3 (phrase du verrou : ajouter « ni d'attribut du mode ») et §8 ligne « Opération ».
- Test (`tests/engine/core/modes/modeEdits.test.ts`) : une opération qui écrit un attribut sur un élément `locked=1`
  n'écrit rien (style et `<object>` inchangés, pas d'étape d'annulation si c'était la seule écriture) ; sur un élément
  non verrouillé de la même opération, l'écriture passe.

## C. Contexte 2D de la mini-carte remis aux formes

- Constat : `MinimapPainter` (`core/shapes/types.ts:63`) reçoit un vrai `CanvasRenderingContext2D`. Par
  `context.canvas.ownerDocument.defaultView`, une forme atteint le DOM et `window`, ce que la lint interdit par les
  identifiants (`PLUGIN_GLOBALS`, `.eslintrc.cjs`) sans pouvoir l'empêcher ici. Un seul plugin l'utilise :
  `plugins/shapes/general/actors/common/definition.ts:68-85` (polygones fermés des pièces, polylignes des traits,
  trait 0,75 px `#5f6368`). Le tronc dessine lui-même par `outlinePainter` (`core/shapes/minimapOutline.ts`) et
  `drawEdge` (`core/interaction/minimapLayout.ts:203`).
- Ce qu'on veut : la forme reçoit un **pinceau restreint** à la place du contexte, sans accès au canvas :
  ```ts
  /** Dessin d'une forme dans la mini-carte, en pixels de la mini-carte (`map.toMinimap`). */
  export interface MinimapBrush {
    /** Polygone fermé : rempli de `fill` (rien si absent), bordé de `stroke` (rien si absent), trait `lineWidth` (défaut 0,75). */
    polygon(points: readonly Point[], look: { fill?: string; stroke?: string; lineWidth?: number }): void;
    /** Polyligne ouverte, trait `stroke` d'épaisseur `lineWidth` (défaut 0,75). */
    polyline(points: readonly Point[], look: { stroke: string; lineWidth?: number }): void;
  }
  export type MinimapPainter = (brush: MinimapBrush, shape: ShapeModel, map: MinimapMapping) => void;
  ```
  - Une implémentation unique du tronc sur le vrai contexte : `core/interaction/minimapBrush.ts` (nouveau,
    `canvasBrush(context): MinimapBrush`), qui reproduit exactement `paintPolygon` (`minimapOutline.ts:22-45` :
    `beginPath` / `moveTo` / `lineTo` / `closePath`, remplissage puis trait) ; une couleur de remplissage invalide
    reste ignorée par le canvas comme aujourd'hui (le blanc par défaut est posé avant, voir le commentaire de
    `paintPolygon`).
  - `outlinePainter` et `drawEdge` passent par le pinceau (une seule façon de dessiner un polygone) ; l'acteur aussi :
    `polygon(part, { stroke: '#5f6368' })` par pièce, `polyline(stroke, { stroke: '#5f6368' })` par trait.
  - `ShapeRegistry.minimapPainter` (`core/shapes/registry.ts:204-220`) garde `save` / `restore` autour de chaque forme
    (sujet 300) : il reçoit toujours le contexte, construit le pinceau et le passe à la définition. La signature de
    `paintShape` côté `Minimap` peut rester sur le contexte.
  - `MinimapBrush` est exporté par l'API des plugins (`core/plugins/index.ts`) ; `MinimapMapping` aussi s'il ne l'est
    pas déjà.
- Rendu inchangé : mêmes chemins, mêmes épaisseurs, mêmes couleurs. À vérifier à l'œil dans la mini-carte sur la
  fixture des formes (acteurs compris) et une page RDD.
- Doc : `AJOUTER_UNE_FORME.md` (section mini-carte : signature, exemple de l'acteur) ; `coding.md` §5 une ligne : « une
  forme ne reçoit jamais un objet du DOM (canvas, contexte 2D) : un pinceau restreint ».
- Tests : `tests/engine/core/interaction/minimapBrush.test.ts` (nouveau) : un faux contexte enregistre les appels ;
  `polygon` avec et sans `fill` / `stroke`, `polyline`, `lineWidth` par défaut 0,75 ; `levels.test.ts` et les tests
  de la mini-carte adaptés (leur faux contexte garde `save` / `restore`). Un test de type (`expectTypeOf` ou une
  assignation qui ne compile pas, en commentaire `@ts-expect-error`) : `MinimapPainter` n'accepte pas un
  `CanvasRenderingContext2D`.

## Fini quand

- A : les trois tests de plugin « qui écrit pendant un geste » passent (erreur signalée une fois, modèle intact, geste
  abouti) ; `grep -rn "readonlyModel\|freezeModel"` montre que chaque passerelle vers un plugin pose la vue ou vérifie
  le gel ; dans l'appli (serveur 5173, fixture `rdd.drawio` et `sequences.drawio`), glisser une table, tirer une
  relation, glisser un champ et déplacer une flèche de flux fonctionnent comme avant, sans ligne dans Diagnostics.
- B : le test du verrou passe ; une table RDD verrouillée dans le fichier (fixture temporaire ou `locked=1` posé à la
  main, retiré ensuite) s'ouvre, est signalée au plus par le `check` du mode, et le panneau n'y écrit rien.
- C : la mini-carte est identique à l'œil (acteurs, formes, RDD) ; `MinimapPainter` ne mentionne plus
  `CanvasRenderingContext2D` ; `AJOUTER_UNE_FORME.md` montre le pinceau.
- `make check` vert (`COMPOSE_PROJECT_NAME=drawio-claude`). Aucun fichier `.drawio` touché : pas de `make drawio-check`.

- Fait :
  - **A.** `readonlyModel` (`core/model/freeze.ts`) : en dev / test, proxy paresseux en lecture seule (même proxy par objet,
    `TypeError` à l'écriture, objet gelé rendu tel quel) ; production : la valeur elle-même. Posé aux passerelles :
    `PageModes` (tous les points d'entrée de mode, `followUp` gèle sa page fraîche), `ShapeParts`, `ModeCurrents`,
    `ModeHandles`, `ShapeRegistry` (formes et styles remis aux définitions), `PageEffectRegistry.decorate` et
    `applyModeEdit` (`edit.page`). Pendant un geste la copie de travail *est* la page courante du document : toutes les
    passerelles recevant une page courante étaient donc concernées, pas seulement les sites listés. Tests : `freeze.test.ts`,
    `pageModes.test.ts` (habillage, accroche, glisser de partie qui écrivent), `registry.test.ts` (forme qui écrit).
    Les trois tests de geste complet ne sont pas faits : le test se fait à la passerelle, par où passent tous les gestes.
  - **B.** `setElementAttribute` ignore un élément verrouillé (`modeEdits.ts`) ; doc `AJOUTER_UN_MODE.md` §3 et §8,
    contrat `ModeEdit`. Test dans `modeEdits.test.ts` (la cellule `free` ajoutée à son XML sert au test de panne en route).
    Écart : une table RDD / flèche Séquences `locked=1` ne reçoit plus d'écriture d'attribut du mode.
  - **C.** `MinimapBrush` (`polygon`, `polyline`), implémentation unique `core/interaction/minimapBrush.ts` ; `outlinePainter`,
    `drawEdge`, le placeholder (polygone rempli à la place de `fillRect`) et l'acteur passent par lui ; `MinimapBrush` et
    `MinimapMapping` exportés par l'API des plugins ; `AJOUTER_UNE_FORME.md` §3.3 et `coding.md` §5. Test :
    `minimapBrush.test.ts`. Rendu à l'œil sur la fixture `rdd-region-pointillee.drawio` (mini-carte et glisser d'une région,
    aucune erreur) ; acteurs, formes et page Séquences non vérifiés à l'œil.
