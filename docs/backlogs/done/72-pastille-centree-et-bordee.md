# Pastille de flux : taille, chiffre centré, bordure

> Itération — mode Séquences (habillage) ; reprise de 71

- Pastille d'une flèche avec texte : 1,5 fois la taille d'origine au lieu de 2 (rayon 12, chiffre 15).
- Chiffre centré au milieu du rond, en hauteur comme en largeur (centre des chiffres, pas de la ligne de texte).
- Bordure noire autour du rond (toutes les pastilles).
- **Fini quand :** sur `sequences.drawio`, la pastille de « login » est 1,5 fois plus grosse qu'à l'origine, chiffre
  centré à l'œil, bordure noire ; `make check` vert.
- Fait : `render/decorations.ts` — `EDGE_BADGE.labelled` rayon 12, chiffre 15 ; bordure noire (`strokeMesh`, 1,5 px
  avec texte, 1 px sans) ; chiffre posé par sa ligne de base (`bottom-baseline`) à une demi-hauteur de chiffre
  (Roboto : 0,71 em) sous le centre, au lieu du milieu de la ligne. Test du rendu mis à jour (taille 15). Vérifié
  dans l'appli sur `sequences.drawio`, zoomé : chiffres centrés dans le rond, bordure noire.
