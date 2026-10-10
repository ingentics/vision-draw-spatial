# États : point d'entrée ou de sortie sur le bord d'un ensemble

> Dette vue à l'audit 464 (reprise de 435, 460)

- `compositeOf` (`states/composites/compositeLayout.ts:68-78`) range un élément par son coin haut gauche. Un point de
  sortie posé sur le bord d'un ensemble, comme en UML, peut compter hors de l'ensemble : la simulation finit alors
  en « sortie attendue » au lieu de quitter l'ensemble, et l'export PlantUML le place au premier niveau. On pourrait
  prendre le centre du point, ou une tolérance.
