# Aimantation bord à bord déclarée par un mode

> Moteur — gestes (`core/domains/edit/drag/move.ts`, `resize.ts`) ; demandé par le mode Event storming (475)

- Nouveau point d'entrée de mode, par ex. `gestures.snapTargets(page, shape)` : les emprises contre lesquelles la forme
  déplacée ou redimensionnée se colle.
- Pendant le geste : un bord à moins de 8 px écran d'un bord parallèle d'une cible, qui la recouvre sur l'autre axe,
  s'y colle exactement (écart 0). Alt maintenu : pas d'aimantation, comme les autres.
- Le mode Event storming le déclare : tous les autres post-it du mode.
- **Fini quand :** sur `eventstorming.drawio`, approcher un post-it d'un autre le colle bord à bord, pas avec Alt ;
  tests de la règle (seuil écran, recouvrement, Alt) ; `make check` vert.
