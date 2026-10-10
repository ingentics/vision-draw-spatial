# États : contenu d'un ensemble calculé en un seul passage

> Itération — modes Machine à états et RDD, contenu d'un ensemble ou d'une région ; dette vue à l'audit 444 (reprise
> de 435 ; la région RDD, dont l'ensemble est la copie, suit, en attendant 437)

- Constat : `compositeContent` (`states/composites/compositeLayout.ts`) appelle `compositeOf` pour chaque forme, et
  `compositeOf` parcourt toutes les formes de la page : n² par appel. `fitComposite` le rappelle à chaque niveau de la
  chaîne d'ajustement. `regionContent` (`rdd/regions/regionLayout.ts`) fait de même.
- Ce qu'on veut :
  - l'appartenance directe se calcule en un passage sur les seuls ensembles (ou régions) pour chaque forme ;
  - le parcours du contenu utilise un `Set` ;
  - `fitComposite` et `fitRegion` calculent l'appartenance une fois pour toute la chaîne.

  Pas de cache entre les appels : en production, la copie de travail d'un geste est modifiée en place.
- Écart de comportement : aucun (même contenu, même ordre).
- **Fini quand :** les tests sont inchangés et verts ; dans l'appli, un ensemble déplacé emporte son contenu.
- Fait :
  - Dans les deux fichiers :
    - `ownerAmong(candidates, shape)` porte la règle de `compositeOf` / `regionOf`, qui l'appellent sur les formes
      de la page ;
    - `ownedBy(page)` donne les formes contenues directement par chaque ensemble ou région, en ne passant que sur les
      ensembles ou les régions ;
    - `compositeContent` / `regionContent` reçoivent ce résultat en paramètre facultatif et parcourent le contenu avec
      un `Set` ;
    - `fitComposite` / `fitRegion` le calculent une fois.
  - Tests inchangés.
  - `make check` vert.
  - Vérifié dans l'appli (`states.drawio`) : l'ensemble « Traitement », déplacé deux fois, emporte ProcessData et son
    point de sortie, et State3 s'agrandit pour le contenir. Annulé ensuite.
