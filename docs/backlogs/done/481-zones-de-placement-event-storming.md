# Event storming : cases où poser le post-it glissé, échange en lâchant sur un autre

> Mode Event storming (475) ; s'appuie sur l'aimantation bord à bord (477). Moteur : nouveau point d'entrée de mode
> pour les places d'un glisser.

- **Pendant le glisser d'un seul post-it du mode** (pas d'une sélection multiple ; rien avec Alt), le moteur montre les
  **cases** où il peut se poser selon la grammaire ci-dessous : une case a la taille du post-it glissé, collée (écart 0)
  au côté d'un post-it voisin, alignée sur lui (même haut à gauche / à droite, même gauche dessus / dessous).
- **Grammaire** (A | B : A collé à gauche de B ; « sous » : collé dessous). Chaque règle vaut dans les deux sens
  (glisser un Command montre les cases à droite des Actor et à gauche des Domain Event) :
  - Actor | Command ; Command | Domain Event ; Domain Event | Domain Event (suite chronologique) ;
  - Command | Constraint, Constraint | Domain Event ; Command | System, System | Domain Event ;
  - Policy sous Domain Event ; Policy | Command ;
  - Domain Event | Query Model ; Query Model | Actor ;
  - Hotspot : n'importe quel côté de n'importe quel post-it, et tout post-it sur n'importe quel côté d'un Hotspot.
- **Cases montrées** : celles des post-it voisins du post-it glissé (à moins de 160, une taille de post-it, de sa
  position courante) ; une case qui chevaucherait un autre post-it (au-delà de 0,5) n'est pas montrée ; une case en
  double, une seule fois. Aspect : contour pointillé et fond léger de la couleur d'accent ; la case visée, fond plus
  marqué.
- **Case visée** : le centre du post-it glissé dans une case ; le post-it s'y place aussitôt (aperçu) et, lâché, s'y
  pose exactement (une étape « Déplacement »). Hors d'une case : glisser normal (grille, aimantation bord à bord).
- **Depuis la palette** : dès qu'un post-it de la palette est glissé au-dessus de la page, mêmes cases (autour des
  post-it proches de l'endroit où il se poserait), la visée plus marquée ; lâché le centre dans une case, le nouveau
  post-it s'y pose exactement. Pas d'échange (le post-it n'a pas encore de place) ; pas avec Alt.
- **Échange** : centre du post-it glissé sur un autre post-it du mode, hors de toute case : l'autre est mis en valeur
  et une case pointillée montre, à la place d'origine du post-it glissé, où il ira ; lâché, les deux échangent leur
  place (coin haut-gauche de chacun à celui de l'autre), une étape « Échange de place ».
- **Fini quand :** sur `eventstorming-commande.drawio`, glisser une Command près d'un Actor montre une case à sa droite
  (et à gauche d'un Domain Event voisin), le post-it s'y met et s'y pose ; glisser une Policy près d'un Domain Event
  montre la case dessous ; un Hotspot voit des cases sur tous les côtés ; avec Alt, aucune case ; lâcher un post-it sur
  un autre les échange, ⌘Z les remet ; tests de la grammaire, des cases (voisinage, chevauchement, doublons) et de
  l'échange ; `make check` vert.
- Fait : point d'entrée `gestures.dragPlaces(page, shape, bounds)` → `ModeDragPlaces` (`places`, `swapWith`)
  (`core/modes/types.ts`, réexporté par l'API des plugins ; hôte `PageModes.dragPlaces` / `hasDragPlaces`). Place
  visée : `core/edit/dragPlaces.ts` (`placeUnder`, centre de la forme ; la plus proche si plusieurs). Glisser
  (`move.ts`, `followPlaces`) : pour une forme seule sans rien d'emporté (`MoveDrag.places`, posé dans `gesture.ts`,
  coupé pour un pas au clavier), après la grille et l'aimantation bord à bord, sans Alt ; échange au lâcher
  (`commitSwap` : coins haut-gauche échangés, une étape « Échange de place »). Dessin `dragPlacesMarks`
  (`render/decorations.ts`, montré par `ConnectorPreview.showPlaces`) : pointillé et fond d'accent (0,08, visée 0,3),
  échange : cible cernée d'un trait plein, future place en pointillé. Mode : `places/dragPlaces.ts` (grammaire
  `BESIDE` / `BELOW`, `sidesFor`, voisins dans le cadre élargi de 160, cases chevauchant un post-it écartées, doublons
  fusionnés, échange avec le post-it sous le centre) ; `overlapping` exporté par `contacts/contacts.ts`. Tests
  `tests/engine/core/edit/dragPlaces.test.ts`, `tests/engine/plugins/modes/eventstorming/dragPlaces.test.ts` ; doc
  `AJOUTER_UN_MODE.md` (avec `snapTargets` ajouté au résumé du contrat, oublié en 477), SPEC §14.5. Vérifié à l'œil
  sur `eventstorming-commande.drawio` : Query Model glissé, cases à droite du Domain Event « Paiement refusé », au-dessus
  et à droite du Hotspot ; lâché dans la première, il s'y pose collé ; lâché sur le Hotspot, les deux échangent, ⌘Z les
  remet ; aperçu de l'échange vu (cible cernée, place d'origine en pointillé). Alt (aucune case), Command entre Actor et
  Domain Event, Policy sous un Domain Event : vérifiés par les tests seulement. Pas de test du moteur pour le glisser
  ni l'échange (aucun test existant ne monte un glisser complet).
  Depuis la palette : `Engine.paletteDragOver(template, screen, snap)` / `paletteDragEnd()` et `addShape(…, snap)`
  (`ElementCommands` : places pour la forme que le modèle créerait, `shapeFromStyle` dans `core/format/parse.ts`, et
  dépôt dans la place visée) ; la palette signale le modèle glissé (`onDragTemplate`), le canvas l'utilise au survol
  (`Viewer.tsx` : `onDragOver`, `onDragLeave`, `onDrop`), le navigateur ne donnant les données du glisser qu'au lâcher.
  Test `shapeFromStyle` dans `tests/engine/core/format/parse.test.ts`. Vérifié à l'œil (glisser simulé par
  événements) : Domain Event de la palette au-dessus de la page, cases à gauche du Query Model, à droite de « Paiement
  refusé » (visée), autour du Hotspot ; lâché, il s'y pose collé sur trois côtés.
