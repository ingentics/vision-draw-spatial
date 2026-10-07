# Cadre de sélection avec l'onglet de la région

> Itération — sélection des formes, reprise de 227 (onglet de la région RDD)

- Le cadre pointillé d'une forme sélectionnée entoure son emprise prise au clic (`hitBounds`) au lieu de ses seules
  bornes : pour une région RDD, le rectangle et son onglet. L'écart existant du cadre (3 px à l'écran) sert de marge.
- Les poignées restent sur les bornes de la forme (ce qu'on redimensionne). Les autres formes ne changent pas (sans
  `hitBounds`, l'emprise est leurs bornes).
- **Fini quand :** une région sélectionnée a un cadre qui englobe aussi son onglet, avec une petite marge, sur la
  fixture `rdd-region-pointillee`.
- Fait : `core/domains/selection/highlight.ts` : le cadre pointillé d'une forme entoure `registry.hitBounds(shape)` au
  lieu de ses bornes ; la marge est l'écart existant du cadre (3 px à l'écran). Doc du contrat `hitBounds`
  (`core/shapes/types.ts`). Changement de comportement : seules les formes qui ont un `hitBounds` (région RDD) ont un
  cadre plus grand ; poignées inchangées (sur les bornes). Vérifié dans l'appli sur `rdd-region-pointillee` ; pas de
  test du cadre (aucun test ne monte le moteur), l'emprise onglet compris est couverte par le test de la région.
