# Cadre de renvoi d'une flèche coupée : briques communes

> Itération — rendu des flèches coupées (`render/edges/edge.ts`) ; dette vue au sujet 383

- Coins du cadre (`splitLabel`) par `rectPath` au lieu de quatre points écrits à la main autour du centre.
- Texte du cadre par `labelObject` (`render/flat/box.ts`) au lieu de `ctx.text.create` + `renderOrder` à la main.
  Ce texte n'est pas celui d'une cellule (il n'est pas édité en place, ni cliqué comme un label) : `labelObject` prend
  la cellule porteuse en option, sans elle aucun `labelCellId` n'est posé.
- Aucun changement visible.
- **Fini quand :** une flèche coupée (`spatial.split`) garde ses cadres de renvoi identiques dans l'appli (dessin,
  survol, ligne directe) ; `make check` vert.
- Fait : `splitLabel` (`render/edges/edge.ts`) prend ses coins de `rectPath` et son texte de `labelObject`, dont la
  cellule porteuse devient optionnelle (`render/flat/box.ts`) : sans elle, pas de `labelCellId`. Vérifié à l'œil
  (fixture `spatial.drawio`, 2D : cadres « depuis A » / « vers B », survol).
