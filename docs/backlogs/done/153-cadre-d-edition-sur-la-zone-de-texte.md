# Cadre d'édition sur la zone de texte, marges du style comprises

> Itération — édition du texte ; reprise de 152

- Le cadre bleu pointillé de l'éditeur en place entoure la zone où va le texte (comme sur la BDD, sous l'ellipse).
  Sur un process à tranche étiquetée, il entoure aujourd'hui toute la forme, tranche comprise : il doit s'arrêter à
  la ligne de la tranche.
- Même technique partout : le cadre = la zone de texte de la forme (`textZone`), réduite des marges propres du style
  (`spacingTop`, `spacingRight`, `spacingBottom`, `spacingLeft`) ; à l'intérieur, les marges communes (`spacing`, et
  celles de draw.io en haut et en bas). Le texte ne bouge pas entre affichage et édition.
- **Fini quand :** en éditant le texte d'une tâche (event consumer, tâche de fond, tâche récurrente), le cadre
  pointillé s'arrête à la ligne de la tranche, en 2D comme en iso ; BDD, file et formes sans marges inchangées ;
  `make check` vert.
- Fait : `render/labelPosition.ts` sépare les marges du label en deux : `labelMargins` (propres au style,
  `spacingTop/Right/Bottom/Left`) et `labelPadding` (communes : `spacing`, `BASE_SPACING`) ; `labelInsets` reste leur
  somme pour le label dessiné. L'éditeur en place a pour cadre `Engine.labelEditZone` (zone de texte de la forme
  réduite de `labelMargins`, en 2D comme sur le plan en perspective) et garde `labelPadding` à l'intérieur
  (`app/LabelEditor.tsx`). Vérifié dans l'appli sur une tâche de fond : cadre pointillé arrêté à la ligne de la
  tranche en 2D et en iso, texte au même endroit qu'à l'affichage.
