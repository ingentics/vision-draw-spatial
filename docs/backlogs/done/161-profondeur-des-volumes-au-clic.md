# Profondeur des volumes au clic

> Itération — interaction (sélection des formes) ; reprise de 160

- En iso et en 3D, quand plusieurs éléments sont sous le clic, le plus proche de la caméra gagne : celui que le rayon
  touche le plus haut (la caméra est au-dessus de la scène, le rayon descend), et non plus le plus haut dans l'ordre
  de dessin. À hauteur égale, l'ordre de dessin départage (un enfant posé sur son conteneur, une flèche au sol).
- À plat, tout est à hauteur 0 : rien ne change.
- **Fini quand :** deux blocs qui se chevauchent à l'écran, un clic sur le bloc de devant le prend même s'il est
  dessiné avant l'autre, en iso et en 3D ; `make check` vert.
- Fait : `pickElement` (`src/engine/interaction/pick.ts`) ne s'arrête plus au premier élément touché : `hitHeight`
  donne la hauteur où le rayon touche chaque élément (son dessus, ou le point d'entrée sur ses côtés que renvoie
  désormais `volumeHit`), et le plus haut gagne ; à égalité, le premier dans l'ordre de dessin. Les éléments dont
  le dessus n'atteint pas le meilleur point touché sont sautés. Vaut pour le clic, le survol et l'accroche des
  flèches. Test dans `tests/engine/interaction/pick.test.ts` (bloc de devant dessiné avant celui de derrière, et
  ordre de dessin à plat).
