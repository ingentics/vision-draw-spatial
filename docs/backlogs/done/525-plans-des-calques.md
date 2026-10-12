# Plans des calques en iso et en 3D

> Itération — calques (reprise de 523, 524)

- En vue iso et 3D (scène en volume), sur une page avec calques, chaque **niveau** d'élévation non nul des calques
  visibles est montré par un plan translucide : un seul plan par niveau (deux calques à la même élévation n'en font
  qu'un) ; par défaut aucun au sol (élévation 0 : la grille suffit).
- Tous les plans ont la même emprise : celle de tout le contenu de la page (`page.bounds`), élargie de 20 px ; rien
  si la page est vide.
- Aspect : fond gris neutre (opacité 0,06) et contour (0,3) ; le plan du niveau du calque courant prend la couleur
  d'accent (`selection.accentColor`, fond 0,12, contour 0,6). Les plans sont sous le contenu (ne le cachent pas) et ne
  se cliquent pas. Ils suivent la hauteur des volumes pendant la bascule 2D ↔ iso.
- Réglage `view.layerPlanes` « Plans des calques » (Paramètres › Vue › Volumes), **activé par défaut**.
- Réglage `view.layerGroundPlane` « Plan des calques au sol (niveau 0) », **désactivé par défaut** : coché, le
  niveau 0 a aussi son plan (s'il a un calque visible).
- Le plan se met à jour quand on change de calque courant, d'élévation, de visibilité, ou de contenu.
- **Fini quand :** en iso sur `fixtures/layers.drawio`, avec deux calques à 40 et un à 80, on voit deux plans à la
  taille de tout le schéma, celui du calque courant teinté ; en changeant de calque courant la teinte suit ; le
  réglage décoché les retire ; en 2D, aucun plan.
- Fait : `render/layerPlanes.ts` (un plan par niveau, emprise de la page + 20 px, accent pour le calque courant),
  posé par `PageLayers.decorate` dans la scène en volume (`domains/view/scene.ts`), refait seul au changement de
  calque courant ; réglages `view.layerPlanes` (activé) et `view.layerGroundPlane` (désactivé, demandé en cours de
  route), scènes reconstruites à leur changement (`levels.ts`), Paramètres › Vue › Volumes. Tests : `layerPlanes`.
  Vérifié à l'œil en iso (deux plans, teinte qui suit le calque courant) ; réglages cochés seulement par les tests.
