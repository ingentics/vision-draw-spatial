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
