# Ordre de dessin d'une colonne de post-it

> Audit 500 — mode Event storming (reprise de 484), tronc `format/order.ts`

- Constats :
  - `stackPlaced` (`plugins/modes/eventstorming/places/stacking.ts:11-16`) ne remet en ordre que les contacts du
    post-it posé. Colonne V, W, U, L de haut en bas, ordre XML `[L, V, W, U]`, U posé : `placeBehind(U, L)` donne
    `[U, L, V, W]`, puis `placeBehind(W, U)` donne `[W, U, L, V]`. V passe devant W, et son ombre le recouvre.
  - `placeBehind(page, id, id)` (`core/format/order.ts:57-70`) déplace la cellule : `order.indexOf(referenceId)` vaut
    -1 et `splice(-1, 0, id)` l'insère avant la dernière ; la page est marquée modifiée. `ModeEditWriter.placeBehind`
    ne filtre pas ce cas.
- Ce qu'on veut :
  - Le mode remet en ordre toute la colonne touchée par un post-it posé (les post-it reliés par des contacts haut / bas,
    de proche en proche) : chaque post-it derrière celui qui est collé sous lui. Les post-it hors de ces colonnes
    gardent leur ordre.
  - `placeBehind` renvoie faux, sans rien changer, quand `cellId === referenceId`.
- Écart de comportement : aucun hors des colonnes de trois post-it ou plus, où l'ordre devient juste.
- Tests : `stacking.test.ts`, colonne de 3 et de 4 post-it posés au milieu, en haut, en bas, et deux colonnes voisines ;
  `order.test.ts`, `placeBehind` sur elle-même.
- **Fini quand :** sur une colonne de quatre post-it collés, poser celui du bas ou du milieu laisse chaque ombre sous le
  post-it qui suit (vu à l'œil) ; `make check` vert.
