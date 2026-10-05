# Arbres de la forêt plus petits et plus nombreux

> Itération — effets de page (Forêt) ; reprise de 143

- Taille des arbres divisée par 4 (hauteur 10 à 30 px au lieu de 40 à 120, feuillage et tronc d'autant).
- Plus d'arbres : grille de 28 px au lieu de 64 (environ 5 fois plus de cases), écart au schéma ramené à 8 px.
- **Fini quand :** en iso / 3D, la forêt est faite de petits arbres serrés autour du schéma, toujours sans arbre sur
  une forme, un tracé ou un texte ; `make check` vert.
- Fait : `effects/forest/index.ts` (`CELL` 28, `CLEARANCE` 8, hauteur 10 + 20·t²) et `trees.ts` (tronc mini 0,6 px,
  dépassement du tronc réduit d'autant). Vérifié à l'œil en iso sur `fixtures/simple.drawio` : petits arbres serrés,
  aucun sur le schéma.
