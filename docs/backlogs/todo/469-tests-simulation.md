# Tests de la simulation des états (trace, vue)

> Audit 464 — tests (reprise de 462, 463) ; les tests des briques du tronc sont dans 467

- Constats :
  - Aucun test de `simulationTrace`, `stepLook` ni `entryName` (463).
  - `simulationLayer.test.ts` cherche les éléments par `page.shapes.find` au lieu de `shapeOf` / `edgeOf`.
- Ce qu'on veut : des tests sur `states.drawio` pour :
  - la trace : lignes, ×N, pas courant, « —→ » sans nom, lignes non cliquables (465) ;
  - `stepLook` : états et ensembles teintés ;
  - `entryName`.

  Le test de la couche passe par `shapeOf` et `edgeOf`.
- Écart de comportement : aucun.
- **Fini quand :** ces tests existent et passent, et `make check` est vert.
