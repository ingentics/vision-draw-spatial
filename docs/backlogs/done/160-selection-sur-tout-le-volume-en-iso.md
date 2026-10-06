# Sélection sur tout le volume en iso et en 3D

> Itération — interaction (sélection des formes) ; reprise du test « debout » de l'Actor

- En iso et en 3D, une forme se prend au clic sur tout son volume (dessus et côtés), du dessus à sa base, et plus
  seulement sur son dessus. Même test pour le survol, les liens et l'accroche des flèches.
- Le volume est testé hauteur par hauteur, au pas d'une unité de page entre le point visé au dessus et celui visé à
  la base (rien raté sur les grands blocs), après un rejet rapide par les bornes.
- **Fini quand :** en iso et en 3D, un clic sur la face latérale d'un bloc le sélectionne ; à plat rien ne change ;
  `make check` vert.
- Fait : `pickElement` (`src/engine/interaction/pick.ts`) teste tout volume dont la base est sous le dessus avec
  `volumeContains` : rejet par les bornes, puis les points visés entre dessus et base au pas d'une unité de page
  (256 au plus). `Engine.volumeBase` (ex-`standingBase`) donne la base de tout élément en iso / 3D, plus seulement
  de l'Actor debout ; il sert au clic, au survol et à l'accroche des flèches (`shapeAt`). Test dans
  `tests/engine/interaction/pick.test.ts`. Vérifié dans l'appli : un clic sur la face latérale d'un bloc le
  sélectionne en iso et en 3D.
