# Poignées de la flèche masquées pendant l'édition de son texte

> Itération — édition du texte en place (flèches)

- Pendant l'édition du texte du milieu d'une flèche sélectionnée, ses poignées (bouts, points, milieux de segments)
  sont masquées et ne réagissent plus au pointeur ; elles réapparaissent à la fin de l'édition (validée ou annulée).
- **Fini quand :** flèche sélectionnée, double-clic sur son milieu : les poignées disparaissent pendant la saisie et
  reviennent après Entrée ou Échap ; `make check` vert.
- Fait : `src/engine/Engine.ts` : `edgeHandlesSelection()` renvoie la flèche sélectionnée sauf pendant l'édition de
  son texte du milieu ; l'affichage des poignées (`updateSelectionOutline`) et leur saisie (`edgeEndAt`,
  `pointHandleAt`) passent par elle, et l'ouverture comme la fermeture de l'édition redessinent la sélection.
  Vérifié dans l'appli sur `fixtures/links.drawio` : flèche sélectionnée, double-clic au milieu, les poignées des
  bouts disparaissent ; Échap les fait revenir ; `make check` vert.
