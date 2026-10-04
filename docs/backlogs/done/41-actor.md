# Actor

> Milestone 5 — Formes géométriques

- Forme : `src/engine/shapes/impl/general/actor/`, `id: 'actor'`, `kinds: ['umlActor']` ; « Acteur » dans la palette
  (catégorie « Général »). Tout son rendu, silhouette debout en iso / 3D comprise, vit dans son dossier (pas
  d'extension de `generic/box`) ; clic et accroche sur les bornes : `contains: () => true`.
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
  tous les angles, se crée depuis la palette ; `spatial.kind=actor` le dessine.

Fait : forme `src/engine/shapes/impl/general/actor/` (`kinds: ['umlActor']`, « Acteur » dans « Général », style et
taille de la palette de draw.io, valeur « Actor »). `figure.ts` : le bonhomme de `UmlActorShape` (tête sur le quart
du haut, corps, bras, jambes), comparé à l'export SVG de draw.io ; 2D orientée par `orientedPath`. `standing.ts` :
en iso / 3D, silhouette debout (`userData.billboard`) au centre de l'emprise, hauteur de la forme ou
`spatial.height`, tête opaque et traits en lignes d'épaisseur constante. Orientation face à la caméra remise en
place dans `render/billboard.ts`, appelée avant chaque image (`Engine.requestRender`) : direction de visée en
orthographique (bas de l'écran vu d'aplomb), position exacte de la caméra en perspective. Clic sur les bornes, sur
toute la hauteur en iso / 3D (`userData.standing`, option `baseOf` de `pickElement`) ; flèches sur les bornes ;
mini-carte : sa silhouette ; label sous la forme, au sol en iso. Tests `tests/engine/shapes/actor.test.ts`.
Vérifié dans l'appli : palette, 2D, iso, 3D après rotation de la caméra, clic sur les jambes.
