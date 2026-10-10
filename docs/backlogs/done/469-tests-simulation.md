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
- Fait :
  - `tests/engine/plugins/modes/states/simulation/simulationView.test.ts`, nouveau :
    - trace sur `states.drawio` : lignes de pas et de transitions, noms, « —→ », ×2 sur la boucle « New Data », un seul
      pas courant, et le pas où mène chaque ligne (aucun pour un pas traversé ni pour le pas courant) ;
    - `stepLook` : états visités sans les ensembles traversés, ensemble parent, numéros des pastilles, transitions
      empruntées ;
    - un ensemble courant sans entrée intérieure est teinté et compté ;
    - `entryName` : première transition valide (une flèche refusée dessinée avant est ignorée), et entrée sans
      transition.
  - `simulationLayer.test.ts` : la scène réduite passe par `shapeOf`, `edgeOf`, `center` et `rectPath`.
  - Aucun changement de code ; les tests des briques du cœur sont dans 467. `make check` vert. Rien à voir dans l'appli.
