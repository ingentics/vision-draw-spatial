# Ombre des barres latérales repliées

> Itération — barres latérales (`Sidebar.tsx`, `main.css`).

- Repliée, une barre latérale perd son ombre sur la zone de dessin : l'ombre (`--bar-shadow`, réglage
  `panels.shadow`) est posée sur le contenu (`.palette`, `.diagnostics`, panneau de droite) et pas sur la bande
  `.sidebar-strip`.
- La bande repliée porte la même ombre, tournée vers le plan (`4px 0 12px` à gauche, `-4px 0 12px` à droite), au
  réglage « Ombre sur la zone de dessin ».
- **Fini quand :** dans l'appli, avec les deux barres repliées, l'ombre reste visible sur le plan, et suit le
  réglage (aucune à 0).
- Fait : `main.css` — la bande `.sidebar-strip` est positionnée (comme `.sidebar`) et porte `box-shadow` vers le plan
  (`4px 0 12px` à gauche, au-dessus de la zone de dessin par `z-index: 1` ; `-4px 0 12px` à droite), à la couleur
  `--bar-shadow` du réglage. Vérifié dans l'appli, les deux barres repliées : ombre visible sur le plan, qui suit le
  réglage (renforcée puis à 0).
