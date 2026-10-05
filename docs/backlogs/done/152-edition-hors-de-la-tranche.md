# Édition du texte hors de la tranche étiquetée

> Itération — formes (Architecture) ; reprise de 151

- En édition, le texte d'un process à tranche étiquetée (event consumer, tâche de fond, tâche récurrente) déborde
  sur la tranche : il doit rester dans la zone où il s'affiche, à gauche de la ligne (de l'autre côté si la forme est
  orientée autrement).
- **Fini quand :** en éditant le texte de ces formes, en 2D comme en iso, le texte ne passe pas sur la tranche et ne
  bouge pas entre affichage et édition ; `make check` vert.
- Fait : l'éditeur en place appliquait une marge fixe de 2 px et ignorait `spacingTop` / `spacingRight` /
  `spacingBottom` / `spacingLeft` (ici `spacingRight=16`, la tranche) ; les marges du label viennent maintenant d'une
  seule fonction, `labelInsets` (`render/labelPosition.ts`), partagée par le label dessiné (`createLabel`) et
  l'éditeur (`app/LabelEditor.tsx`) : toute forme à marges en profite. Vérifié dans l'appli : texte long sur une
  tâche de fond, même retour à la ligne à gauche de la tranche en édition et à l'affichage, en 2D et en iso.
