# Plugins : modèle en lecture seule

> Architecture du moteur — étanchéité des plugins. Audit du 2026-10-07. Le gel du modèle à l'exécution est sorti dans
> le sujet 312 (il demande d'abord de revoir les aperçus des gestes du tronc).

- Les plugins reçoivent le modèle vivant : `ModeEdit.page`, `dressing`, `parts.*`, `current.*`, `gestures.*`,
  `effect.volume(page)`, et les formes reçoivent `ShapeModel` et un `RenderContext` partagé par toute la scène. Un
  `page.shapes.push(…)` ou un changement de `attributes` modifierait le document sans écriture dans le fichier ni
  annulation.
- Contrats (`core/modes/types.ts`, `core/effects/types.ts`, `core/shapes/types.ts`) typés en lecture seule
  (`DeepReadonly<PageModel>`…), réexportés par `core/plugins`.
- `RenderContext` gelé une fois par scène.
- Définitions enregistrées gelées au `register` (une forme, un mode ou un effet ne modifie pas un autre plugin).
- **Fini quand :** un plugin qui modifie le modèle reçu ne compile pas (test de typage) ; une définition enregistrée
  ne se modifie plus ; `make check` vert ; l'appli affiche comme avant une page RDD, une page Séquences et la forêt.
- Fait :
  - `core/model/readonly.ts` (nouveau) : `DeepReadonly<T>` (objets et tableaux en lecture seule, fonctions telles
    quelles), `ReadonlyPageModel`, `ReadonlyShapeModel`, `ReadonlyEdgeModel`.
  - L'API des plugins (`core/plugins`) exporte ces types sous les noms `PageModel`, `ShapeModel`, `EdgeModel` : le code
    des plugins n'a pas changé, il est désormais typé en lecture seule. Les contrats des modes, des effets et des
    formes les emploient aussi (`ModeEdit.page` compris).
  - Briques du tronc données aux plugins, et ce qu'elles appellent, acceptant une forme en lecture seule (le tronc,
    qui passe un modèle modifiable, n'est pas touché) : `createBox`, `flatBox`, `isoBlock`, `blockHeight`, le repli de
    la mini-carte, le placeholder, le registre des formes, `textFormat` et la mise en page du texte riche
    (`richLayout`, `troikaText`), les aperçus des parties (`ShapeParts`, glisser d'une partie, édition d'une partie,
    `rebuildShapeObject`, `createShapeObject`, `labelTop`).
  - `freezePlain` (`core/model/freeze.ts`, nouveau) : gel en profondeur des objets littéraux et tableaux, sans toucher
    aux fonctions ni aux objets d'une classe (Three.js, fabrique de textes). Appliqué :
    - aux définitions, à l'enregistrement dans les trois registres ;
    - au `RenderContext` de chaque scène (`SceneView.renderContext`), sauf la fabrique de textes, partagée.
  - Défaut corrigé en passant (sujet 301) : un mode sans `namespace` (hors du typage) passait la validation, car
    `NAMESPACE_PATTERN.test(undefined)` lit la chaîne « undefined » ; refusé désormais (test ajouté).
  - Essai du gel du modèle à l'exécution (pages gelées en sortie de `documentFromTree`) : 11 tests en échec, dont deux
    fonctions du tronc qui modifient le modèle en place par conception (`translateMoveSet`, `applyEndAttachment`) ;
    le tronc le fait aussi pour d'autres aperçus (redimensionnement, points de flèche, texte en édition, ancrage). Gel
    retiré, suite dans le sujet 312.
  - Tests : `tests/engine/core/model/readonly.test.ts` (nouveau : quatre écritures sur le modèle d'un plugin refusées
    par TypeScript, `@ts-expect-error` vérifié par `make check`) ; `tests/engine/core/model/freeze.test.ts` (nouveau :
    gel des objets simples, objets Three.js intacts, définitions des trois registres gelées).
  - Validation dans l'appli (navigateur intégré, serveur 5173, après un rechargement complet) : page Séquences (flux,
    barre, pastilles), page RDD, forêt en iso ; une forme déplacée en 2D puis le déplacement annulé.
