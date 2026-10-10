# Aimantation bord à bord déclarée par un mode

> Moteur — gestes (`core/domains/edit/drag/move.ts`, `resize.ts`) ; demandé par le mode Event storming (475)

- Nouveau point d'entrée de mode, par ex. `gestures.snapTargets(page, shape)` : les emprises contre lesquelles la forme
  déplacée ou redimensionnée se colle.
- Pendant le geste : un bord à moins de 8 px écran d'un bord parallèle d'une cible, qui la recouvre sur l'autre axe,
  s'y colle exactement (écart 0). Alt maintenu : pas d'aimantation, comme les autres.
- Le mode Event storming le déclare : tous les autres post-it du mode.
- **Fini quand :** sur `eventstorming.drawio`, approcher un post-it d'un autre le colle bord à bord, pas avec Alt ;
  tests de la règle (seuil écran, recouvrement, Alt) ; `make check` vert.
- Fait : point d'entrée `gestures.snapTargets(page, shape)` (`core/modes/types.ts`, hôte `PageModes.snapTargets`) ;
  règle pure `core/edit/edgeSnap.ts` (`snapMove`, `snapResize`, seuil `EDGE_SNAP_PIXELS` = 8 px écran ramené à la
  page par le zoom ; seuls les bords qui se font face, recouvrement non nul sur l'autre axe ; redimensionnement : seuls
  les côtés tirés, sans passer sous la taille minimale). Cibles relevées au début du glisser (`gesture.ts`,
  `snappingOf`, formes déplacées exclues), appliquées après la grille dans `move.ts` et `resize.ts` ; pas avec Alt
  (`snap` faux), ni pour un pas au clavier (il ne pourrait plus éloigner la forme). Mode Event storming : tous les
  autres post-it. Tests `tests/engine/core/edit/edgeSnap.test.ts`, cibles du mode dans
  `tests/engine/plugins/modes/eventstorming/index.test.ts` ; doc `AJOUTER_UN_MODE.md` (point d'entrée et table des
  garanties), SPEC §14.5. Vérifié à l'œil sur `eventstorming.drawio` : glisser et redimensionner à 6 px d'un post-it
  le colle (contact listé dans le panneau), pas avec Alt. Seuil écran et Alt vérifiés seulement à l'œil.
