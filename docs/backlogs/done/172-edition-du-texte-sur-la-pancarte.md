# Édition du texte de l'Actor sur sa pancarte

> Itération — édition en place (Actor debout) ; reprise de 170

- En iso et en 3D, avec la pancarte, l'éditeur en place du texte de l'Actor s'ouvrait au sol, là où le texte serait
  sans pancarte. Il s'ouvre sur la pancarte : cadre du panneau projeté à l'écran (face à la caméra), texte centré et
  ajusté comme celui dessiné ; il suit la vue pendant l'édition.
- Sans pancarte (`spatial.sign=0`) ou en 2D, rien ne change.
- **Fini quand :** en iso et en 3D, double-cliquer un Actor à pancarte ouvre l'éditeur sur la pancarte, le texte
  dessiné masqué ; `make check` vert.
- Fait : `Picking.standingPlane` (`core/selection/picking.ts`) projette le plan d'une silhouette debout à l'écran
  (partagé avec le clic) ; `LabelEditor` (`core/edit/text/labelEditor.ts`) prend pour cadre et plan de l'éditeur les
  coins du panneau, et pour affichage le style du texte de la pancarte (`signLabelStyle`, exposé par la silhouette,
  `actor/standing.ts`), recalculé quand le format change pendant l'édition. Nouveau champ `displayStyle` de la
  demande d'édition (`core/types.ts`, `app/LabelEditor.tsx`) : le panneau de format garde le style de la cellule.
  Vérifié dans l'appli sur `flows.drawio` : en iso et en 3D, le double-clic ouvre l'éditeur sur la pancarte, texte
  centré, panneau « Texte » au format de la forme.
