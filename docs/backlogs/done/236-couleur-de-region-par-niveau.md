# RDD : couleur d'une région neuve selon ses sœurs

> Itération — mode RDD (région) ; reprise de 233

- À l'ajout d'une région (palette), on compte les autres régions du même niveau : celles de la même région parente,
  ou celles du premier niveau de la page pour une région hors de toute région. Sa couleur est celle de la palette des
  régions (sujet 233) au rang `nombre modulo 6` : la première rose, la deuxième lavande… la septième rose de nouveau.
- Même étape d'annulation que l'ajout ; un déplacement ne change pas la couleur.
- **Fini quand :** trois régions posées à la suite sur la page sont rose, lavande, bleu ; une région posée dans la
  rose est rose (première de son niveau), la suivante dans la rose lavande ; `make check` vert.
- Fait : `colorNewRegion` (`rdd/regions.ts`) : sœurs = régions de même `regionOf` (ou sans région), couleur
  `REGION_COLORS[n % 6]` écrite par `setRegionColor` ; appelée par `placeInRegions` pour une région ajoutée (crochet
  `placed` sans page d'avant), avant l'agrandissement et l'ordre. Tests `rdd.test.ts` (sept régions de premier niveau :
  la palette puis rose ; deux dans la première : rose puis lavande ; un déplacement ne change rien). SPEC §14.5.
  Vérifié dans l'appli : à côté de « Comptes », deux régions lavande puis bleue ; une région posée dans la lavande est
  rose et la lavande s'agrandit.
