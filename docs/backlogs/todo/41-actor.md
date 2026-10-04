# Actor

> Milestone 5 — Formes géométriques

- Style draw.io (palette) : `shape=umlActor;verticalLabelPosition=bottom;verticalAlign=top;html=1;outlineConnect=0;`,
  30 × 60.
- **2D** : bonhomme draw.io (tête ronde remplie de la couleur de fond, corps, bras, jambes en traits), aux proportions
  de draw.io, étiré dans ses bornes ; **label sous la forme** (`verticalLabelPosition=bottom`, dépend de 31).
- **Iso / 3D** : pas d'extrusion (un bonhomme en prisme n'a pas de sens). Le personnage est **debout** : sa silhouette
  2D dans un plan vertical tourné vers la caméra, pieds au centre de l'emprise, hauteur = hauteur de la forme (ou
  `spatial.height`), comme une unité de jeu ; label au sol devant lui. Demande de remettre en place l'orientation des
  objets selon la vue (supprimée avec les arêtes verticales en rubans), de façon exacte en perspective.
- Clic sur ses bornes (bonhomme fin : le contour réel serait trop difficile à viser) ; accroche des flèches sur ses
  bornes, comme draw.io (`outlineConnect=0`) ; mini-carte : sa silhouette.
- **Fini quand :** l'Actor s'affiche comme dans draw.io en 2D, se tient debout face à la caméra en iso et en 3D sous
  tous les angles, se crée depuis la palette.
