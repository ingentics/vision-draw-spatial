# Tables RDD sans mention « «…» », document au coin plié

> Itération — mode RDD (tables) ; reprise de 179, 181 et 216

- Plus aucune table n'affiche de mention au-dessus de son nom (`«abstract»`, `«embedded»`, `«jsonb»`, `«view»`) :
  chacune se reconnaît à sa marque propre (nom en italique du modèle abstrait, tirets de l'embedded, clés en italique
  du document, coins arrondis de la vue, cadre double de l'énumération). Tous les entêtes font 26 px
  (`startSize=26`) ; la bande de la mention disparaît du code.
- Le document JSONB se nomme « Document » dans la palette et a un **coin plié** en haut à droite (comme une page
  cornée : coin coupé en biais, rabat triangulaire dessiné par-dessus, 10 px × l'échelle) ; rendu de l'appli
  seulement, draw.io montre un swimlane droit.
- **Fini quand :** aucune mention dans l'appli, palette comprise ; les tables posées ont un entête de 26 px ; le
  document s'appelle « Document » et montre son coin plié ; `make check` vert.
- Fait : `TableKind.stereotype` et la bande de la mention retirés (`TABLE.stereotype*`, `headerHeight(secondary)`,
  `tableHeight(secondary, count)`) ; entêtes de 26 px partout, icônes de palette sans trait de mention. Document :
  `TableKind.folded`, contour au coin coupé (`TABLE.fold`, 10 px × l'échelle, au plus la moitié de l'entête), rabat
  triangulaire plus sombre que l'entête (`fill-fold`) et cerné du trait de la bordure ; nommé « Document » dans la
  palette, icône au coin plié. Fixture `rdd.drawio` ramenée aux entêtes de 26 px (réenregistrée par draw.io). Tests
  `rdd.test.ts` ; SPEC §14.5 réécrit. Vérifié dans l'appli : plus aucune mention, coin plié sur les documents.
