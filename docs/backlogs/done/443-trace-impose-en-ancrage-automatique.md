# Tracé imposé en ancrage automatique

> Itération — ancrage des flèches ; reprise de 441

- L'ancrage automatique ne permet plus qu'un tracé, comme le Typon : Arrondi (coudes à 90° arrondis,
  `edgeStyle=orthogonalEdgeStyle;rounded=1`). Seul l'ancrage manuel laisse choisir le tracé.
- Sur une page en automatique, les lignes « Tracé des flèches » (panneau Page) et « Coudes » (panneau d'une flèche)
  sont masquées ; les flèches créées sont arrondies.
- Chaque flèche répartie par l'ancrage (au passage de la page en automatique, puis à chaque répartition) prend le
  style de son tracé : en automatique `edgeStyle=orthogonalEdgeStyle`, `rounded=1`, sans `curved` ; en Typon, sans
  `edgeStyle`, `rounded` ni `curved` (comme en 441). Les flèches pleines ne sont pas touchées.
- **Fini quand :** une page en manuel avec une flèche droite et une courbe, passée en automatique, n'a plus que des
  flèches arrondies ; ni « Tracé des flèches » ni « Coudes » n'apparaissent ; une flèche créée est arrondie ;
  `make check` vert.
- Fait : `edgeLinesOf` (`edit/anchoring/mode.ts`) : `auto` → `['rounded']`. `Router.straight` remplacé par
  `Router.edgeStyle`, clés écrites sur les flèches réparties (`ORTHOGONAL_ROUTER` : `edgeStyle=orthogonalEdgeStyle`,
  `rounded=1`, sans `noEdgeStyle` ni `curved` ; Typon : sans `edgeStyle`, `rounded` ni `curved`) ;
  `routerStyleChanges` / `withStyleChanges` (`auto/anchorArrangement.ts`) remplacent `straightStyle`, appliqués par
  `EdgeArrangement.applyArrangement` et `arrangementConflicts`. Changement de comportement en Typon : le style est
  appliqué à toute flèche répartie, plus seulement à celles qui ont un tracé calculé. Tests :
  `auto/anchorArrangement.test.ts`, `pcb/octilinear.test.ts`, `domains/edit/edges/edgeLine.test.ts`. Vérifié dans
  l'appli sur `simple.drawio` : une flèche courbe devient orthogonale arrondie au passage en automatique, la ligne
  « Tracé des flèches » disparaît.
