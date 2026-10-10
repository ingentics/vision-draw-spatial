# Échange de place : forme verrouillée épargnée, bornes d'avant passées au mode

> Audit 500 — tronc, glisser (reprise de 481)

- Constats :
  - `followPlaces` (`core/domains/edit/drag/move.ts:109`) garde le `swapWith` du mode sans `canMoveShape`, et
    `commitSwap` (`move.ts:191-198`) déplace l'autre forme par `moveCell`. Un post-it `locked=1` ou `movable=0` est
    donc déplacé par un échange. Le mode ne peut pas filtrer : `isLocked` n'est pas dans l'API des plugins.
  - `commitSwap` appelle `modeFollowUps.shapesPlaced(pageId, [rootId, otherId])` sans `previous` (`move.ts:200`) :
    pour le mode, l'échange ressemble à l'ajout de deux formes, alors que le commit normal (`move.ts:165-171`) passe
    les bornes d'avant. rdd et states lisent `before` dans `gestures.placed` (latent : ils ne proposent pas de places).
- Ce qu'on veut :
  - Le tronc ignore un `swapWith` qui désigne une forme non déplaçable (`canMoveShape`) ou une forme du déplacement :
    ni échange montré, ni échange au lâcher. La garde est dans le tronc, pas dans le mode.
  - `commitSwap` passe à `shapesPlaced` les bornes d'avant des deux formes.
- Écart de comportement : lâché sur un post-it verrouillé, le post-it glissé n'échange plus ; il se pose où on le lâche.
- Tests : moteur, `commitSwap` (une étape « Échange de place », cible verrouillée sans échange, `previous` reçu par le
  mode) ; c'est le premier test à monter un glisser complet (`MoveDrags`), à construire sur les aides existantes.
- Docs : `AJOUTER_UN_MODE.md`, tableau des garanties, ligne `gestures.dragPlaces` (« une forme verrouillée n'est
  jamais échangée »).
- **Fini quand :** sur `eventstorming-commande.drawio`, un post-it verrouillé ne bouge pas quand on lâche un autre
  post-it dessus, et l'échange entre deux post-it libres marche comme avant ; `make check` vert.
- Fait : `MoveDrags.swapTarget` (`core/domains/edit/drag/move.ts`) : le `swapWith` du mode n'est retenu que pour une
  forme que le moteur peut déplacer (`canMoveShape`) et hors du déplacement ; sinon ni échange montré ni échange au
  lâcher (la forme se pose où on la lâche). `commitSwap` passe à `shapesPlaced` les bornes d'avant des deux formes.
  Test `tests/engine/core/domains/edit/drag/move.test.ts` (premier test d'un glisser complet : échange en une étape,
  bornes d'avant reçues par le mode, `locked=1` et `movable=0` jamais échangés) ; doc `AJOUTER_UN_MODE.md` (texte et
  tableau des garanties de `gestures.dragPlaces`). Vérifié à l'œil sur `eventstorming-commande.drawio` (glisser simulé
  par événements) : « Client prévenu » glissé sur le Hotspot verrouillé, pas d'échange montré, Hotspot immobile ; Hotspot
  déverrouillé, échange montré et fait, ⌘Z le défait.
