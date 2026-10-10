# États : point d'entrée ou de sortie sur le bord d'un ensemble

> Dette vue à l'audit 464 (reprise de 435, 460)

- `compositeOf` (`states/composites/compositeLayout.ts:68-78`) range un élément par son coin haut gauche. Un point de
  sortie posé sur le bord d'un ensemble, comme en UML, peut compter hors de l'ensemble : la simulation finit alors
  en « sortie attendue » au lieu de quitter l'ensemble, et l'export PlantUML le place au premier niveau. On pourrait
  prendre le centre du point, ou une tolérance.
- Ce qu'on veut (repris le 2026-10-10) : un point d'entrée ou de sortie appartient à l'ensemble qui contient son
  centre. Posé à cheval sur le bord, il n'agrandit pas l'ensemble. La simulation, l'export PlantUML, le contenu emporté
  et « f » suivent.
- **Fini quand :** une sortie posée sur le bord d'un ensemble est à lui, et l'ensemble garde sa taille ; testé ;
  `make check` vert.
- Fait :
  - `composites/compositeLayout.ts` :
    - `anchorOf` : coin haut-gauche, ou centre d'un point d'entrée ou de sortie, utilisé par `compositeOf` (donc
      `compositeAncestors`, `compositeContent`, l'agrandissement, l'ordre de dessin) ;
    - `extentOf` réduit un point à son centre : il n'agrandit pas l'ensemble, et « f » ajuste autour de son centre.
  - Commentaires de `shapes/composite/index.ts` et SPEC §14.5 (Ensemble) mis à jour.
  - Écarts de comportement :
    - un point dont le centre est dans un ensemble mais pas le coin est désormais à lui (et l'inverse) ;
    - un point qui dépasse ne fait plus agrandir son ensemble ;
    - « f » laisse une marge de 40 px autour du centre d'un point plutôt que de ses bornes, soit jusqu'à 12 px de
      moins ;
    - une sortie posée sur le bord quitte l'ensemble dans la simulation (au lieu de « Terminé : sortie attendue ») et
      s'écrit dans son bloc PlantUML.
  - Test : `compositeLayout.test.ts` (entrée et sortie sur le bord, sortie juste dehors, taille gardée, simulation qui
    quitte l'ensemble). Export PlantUML de la fixture inchangé. `make check` vert.
  - Vérifié dans l'appli sur `states.drawio` :
    - l'entrée de State3 glissée sur son bord gauche : l'ensemble ne s'agrandit pas ;
    - une simulation depuis State3 y entre bien par cette entrée (« Pas 1 · Accumulate Enough Data Long State Name ») ;
    - le déplacement a ensuite été annulé.
