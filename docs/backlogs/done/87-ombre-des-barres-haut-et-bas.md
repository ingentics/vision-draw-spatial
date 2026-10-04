# Ombre portée des barres du haut et du bas sur la zone de dessin

> Itération — interface (barres) ; suite de 86

- La barre d'outils (haut) et la barre des pages (bas) projettent sur la zone de dessin la même ombre douce que la
  palette et les panneaux (12 px, opacité 0,06), vers le bas pour la première, vers le haut pour la seconde.
- **Fini quand :** à l'œil, les quatre bords de la zone de dessin ont le même flou ; les menus de la barre d'outils
  restent au-dessus de tout ; `make check` vert.
- Fait :
  - `main.css` : `.toolbar` reçoit `box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06)`, `.bottom-bar`
    `0 -4px 12px rgba(0, 0, 0, 0.06)` ; les deux passent en `position: relative; z-index: 8`, au-dessus de la
    zone de dessin et de ses outils flottants (`.text-tools` à 7), pour que l'ombre se voie et que le menu
    « Retour » reste devant.
  - Vérifié dans l'appli : ombres calculées sur les deux barres, z-index 8.
