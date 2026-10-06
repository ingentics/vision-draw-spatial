# Mains de l'Actor sur sa pancarte

> Itération — formes (Actor debout) ; reprise de 170

- Les bras s'arrêtent au bord de la pancarte : on ne voit pas les mains qui la tiennent. De chaque côté, un petit
  trait (la main), de la couleur et de l'épaisseur de la bordure de la forme, passe **devant** le panneau, à
  cheval sur son bord, à la hauteur des bras.
- **Fini quand :** en iso et en 3D, on voit deux petites mains agripper les bords de la pancarte ; `make check` vert.
- Fait : `actor/standing.ts` (`createSign`) — de chaque côté, un trait de 1,5 × l'épaisseur du trait, couleur de la
  bordure, devant le panneau : 12 % de sa largeur posés dessus, 4 % au-delà du bord, à la hauteur des bras. Test dans
  `tests/engine/shapes/actor.test.ts`. Vérifié dans l'appli sur `flows.drawio` en 3D : deux petites mains visibles
  aux bords de la pancarte.
