# Poignées de connexion dans les quatre directions

> Itération — interaction (création de flèches) ; reprise de la poignée de connexion (SPEC §14.1)

- La forme sélectionnée montre une poignée de connexion (disque bleu, flèche blanche orientée) sur chacun de ses
  quatre côtés : nord, est, sud, ouest, à 18 px écran du bord, au lieu de la seule poignée à droite.
- Tirer une poignée crée la flèche **partant de ce côté** : aperçu depuis le milieu du côté, sortie fixe écrite
  dans le style (`exitX/exitY/exitDx=0/exitDy=0`, ex. sud = `exitX=0.5;exitY=1`).
- **Fini quand :** sur une forme sélectionnée, quatre poignées de connexion ; tirer celle du bas vers une autre forme
  crée une flèche qui sort par le bas ; `make check` vert.
- Fait : `src/engine/edit/handles.ts` (poignées `connect-n|e|s|w`, `CONNECT_DIRECTIONS` : direction et sortie
  relative de chaque côté), `src/engine/render/handles.ts` (flèche blanche tournée vers l'extérieur du côté),
  `src/engine/Engine.ts` (le glisser retient le côté : aperçu depuis le milieu du côté, `exitX/exitY/exitDx/exitDy`
  écrits sur la flèche créée), `tests/engine/edit/handles.test.ts`, `docs/SPEC.md`. Vérifié dans l'appli : une
  forme sélectionnée montre les quatre poignées ; `make check` vert.
