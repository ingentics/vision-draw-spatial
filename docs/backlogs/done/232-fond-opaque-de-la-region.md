# RDD : fond opaque pour la région

> Itération — mode RDD (région) ; reprise de 182

- Le fond d'une région est opaque (couleur de la palette, plus de `fillOpacity=10`) : région et onglet. Le nom reste
  noir ou blanc selon le contraste avec ce fond.
- Changer la couleur d'une région retire aussi un ancien `fillOpacity` (régions posées avant).
- **Fini quand :** une région neuve a un fond plein de sa couleur, ses tables devant elle ; draw.io montre le même fond ;
  `make check` vert.
- Fait : `REGION.fillOpacity` retiré : la région de la palette n'a plus de `fillOpacity` (`shapes/region/index.ts`),
  `setRegionColor` retire celui des régions d'avant ; `regionTextColor(color, opacity)` lit le fond tel qu'il est
  dessiné (opaque par défaut, plus léger si le fichier porte encore un `fillOpacity`). Fixture `rdd.drawio`
  réenregistrée par draw.io. Tests `rdd.test.ts` (style sans `fillOpacity`, texte blanc sur fond sombre, ancien
  `fillOpacity` retiré). SPEC §14.5. Vérifié dans l'appli : région neuve au fond plein, entité posée devant.
