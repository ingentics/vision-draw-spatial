# Touche C : la sélection d'abord, sinon l'élément survolé

> Itération — commentaire (édition) ; reprise de 192 et 201

- « C » (raccourci `editComment`) ouvre l'éditeur de commentaire, vide si l'élément n'en a pas :
  - avec une forme ou une flèche sélectionnée seule, sur elle, même si la souris survole un autre élément ;
  - sans sélection, sur la forme ou la flèche sous le curseur, commentée ou non ;
  - sans sélection et sans élément sous le curseur, ou avec plusieurs éléments sélectionnés : rien.
- Avec une sélection, le survol n'affiche plus le commentaire des autres éléments, seulement celui d'un élément
  sélectionné ; sans sélection (navigation libre), le survol montre le commentaire de tout élément, comme avant.
- **Fini quand :** sans sélection, survol d'une forme sans commentaire puis « C » : l'encart s'ouvre vide ; curseur
  sur le vide : rien ; avec une forme sélectionnée, survol d'une autre puis « C » : c'est la sélectionnée qui est
  éditée, et le survol des autres formes n'affiche pas leur commentaire ; `make check` vert.
- Fait : `PointerInput` retient l'élément sous le curseur (`hovered`), commenté ou non ; `editHoveredComment` prend
  la sélection seule d'abord, sinon cet élément, sinon rien. `syncHoverComment` masque le commentaire survolé d'un
  élément hors de la sélection ; `Selections.selectItems` le rappelle à chaque changement de sélection. Libellé du
  raccourci : « Éditer le commentaire (sélectionné, sinon survolé) ». Vérifié dans l'appli : C sur le vide sans
  sélection ne fait rien ; sur une forme survolée sans sélection, l'encart s'ouvre vide ; avec une forme
  sélectionnée, C édite celle-ci et le survol d'une autre forme commentée n'affiche pas son commentaire.
