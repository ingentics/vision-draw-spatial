# Sauts des flèches en relief en iso et en 3D

> Itération — rendu des flèches ; reprise de 129

- En vue iso ou 3D (niveau de rendu en volume), les sauts `arc` et `sharp` (Arc, Marche) se lèvent hors du plan de
  la page : l'arc ou la marche monte à la verticale au-dessus du croisement, au lieu de se déporter sur le côté dans
  le plan. Même taille qu'à plat ; le relief pousse et s'aplatit avec la bascule 2D ↔ volume, comme les blocs.
- `gap` (Coupure) et `line` (Ligne) ne changent pas ; la vue de dessus et le fichier draw.io non plus.
- Une page dont les flèches sautent en Arc ou Marche passe en volume même sans forme en volume.
- **Fini quand :** deux flèches croisées en `jumpStyle=arc` (puis `sharp`), vues en iso et en 3D, montrent l'arc ou
  la marche debout au-dessus de la flèche du dessous, visible de côté ; en 2D, rendu inchangé ; `make check` vert.
- Fait : `withJumps` (`render/edges/jumps.ts`) prend `raised` : l'arc (même Bézier, contrôles à 1,3 ×) et la marche
  gardent le tracé de la ligne et montent en `z` ; Coupure et Ligne restent dans le plan. `createEdge` sépare les
  morceaux dans le plan (ruban `strokeMesh`) des segments levés, tracés en `edgeLines` (rubans face à la caméra,
  visibles de côté). `RenderContext.raisedJumps` posé par `buildPageScene` au niveau `iso` et par
  `Engine.retraceEdges` ; `Engine.hasRaisedJumps` fait passer en volume une page dont une flèche saute en Arc ou
  Marche. Tests dans `jumps.test.ts`. Vérifié dans l'appli sur `line-jumps.drawio` : arcs et marches debout en iso et
  en 3D, coupures inchangées, 2D inchangée.
