# Réglages d'édition et de navigation encore codés en dur

> Itération — paramètres (édition, navigation) ; reprise de 123 et 124

- Paramètres globaux, section Édition :
  - `edit.undoLimit` : nombre d'étapes d'annulation (10 à 1000, défaut 100) ;
  - `edit.pasteOffset` : décalage d'un collage quand la page n'a pas de grille, en pixels de page (0 à 100, défaut 10) ;
  - `edit.edgePointAlignTolerance` : distance sous laquelle un point intermédiaire de flèche ramené dans
    l'alignement de ses voisins est retiré, en pixels écran (0 à 30, défaut 4 = `mxGraph.tolerance` de draw.io) ;
  - `edit.connectHandleOffset` : écart des poignées de connexion au bord de la forme, en pixels écran (6 à 60,
    défaut 18) ;
  - `edit.middleHandleMinSpan` : taille à l'écran sous laquelle les poignées du milieu d'un côté sont masquées
    (0 à 120, défaut 32).
- Section Formes et flèches : `shapes.edgeLoopMargin`, marge d'une boucle (flèche d'une forme vers elle-même), en
  pixels de page (5 à 100, défaut 20).
- Section Navigation :
  - `controls.clickSlop` : déplacement au-delà duquel un clic devient un glisser, en pixels écran (1 à 20, défaut 4) ;
  - `controls.maxReleaseSpeed` : vitesse maximale transmise par un glisser rapide (500 à 10000 px/s, défaut 3000) ;
  - `controls.releaseWindowMs` : fenêtre de mesure de cette vitesse (20 à 300 ms, défaut 80) ;
  - `controls.stopSpeed` : vitesse sous laquelle la glissade s'arrête (1 à 100 px/s, défaut 8).
- **Fini quand :** chaque réglage apparaît dans les paramètres, agit aussitôt et est gardé au rechargement ; les
  valeurs par défaut ne changent rien au comportement actuel ; `make check` vert.
- Fait : `EditSettings` (`undoLimit`, `pasteOffset`, `edgePointAlignTolerance`, `connectHandleOffset`,
  `middleHandleMinSpan`), `ShapeSettings.edgeLoopMargin` et `ControlSettings` (`clickSlop`, `maxReleaseSpeed`,
  `releaseWindowMs`, `stopSpeed`), avec défauts, bornes et relecture dans `settings.ts` (SPEC §13). Les constantes
  du moteur deviennent des paramètres : `UndoStack.setLimit()` (appelé à la création et à chaque changement),
  `handlePoints(…, layout)` et `HandleStyle.layout` (`edit/handles.ts`, `render/handles.ts`), marge passée à
  `loopWaypoints` et aux variantes de placement (`edit/variants.ts`), `decelerate` / `releaseVelocity` paramétrés
  (`interaction/controls.ts`). En découvrant le code, le 4 px d'`EDGE_POINT_TOLERANCE` s'est révélé être la
  tolérance d'alignement (retrait d'un point intermédiaire), pas une tolérance de clic : réglage nommé en
  conséquence. Panneau : sous-section Navigation › Glisser, Édition › Annuler, coller, et curseurs ajoutés à Clic,
  Poignées et Formes et flèches. Tests : défauts, bornes, `setLimit`, disposition des poignées, vitesse au lâcher.
  Vérifié dans l'appli : les dix réglages s'affichent, l'écart des poignées de connexion passé à 60 px les éloigne
  aussitôt de la forme sélectionnée, valeur gardée dans le stockage, remise à 18.
