# Ombre portée de la palette sur la zone de dessin

> Itération — interface (barres latérales)

- La palette (barre de gauche) projette sur la zone de dessin la même ombre douce que les panneaux de droite
  (`box-shadow` de 12 px, opacité 0,06), en miroir : vers la droite.
- **Fini quand :** à l'œil, la bordure entre palette et zone de dessin a le même flou que celle de droite ;
  `make check` vert.
- Fait :
  - `main.css` : `.palette` reçoit `box-shadow: 4px 0 12px rgba(0, 0, 0, 0.06)` (miroir de `.side-panel`) ;
    `.sidebar-left` passe en `z-index: 1` pour que l'ombre se peigne au-dessus de la zone de dessin, qui la suit
    dans le DOM.
  - Vérifié dans l'appli : ombre calculée sur la palette, la barre gauche au-dessus du canevas.
