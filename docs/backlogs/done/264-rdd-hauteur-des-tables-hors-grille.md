# RDD : hauteur des tables hors grille

> Itération — mode RDD (taille des tables) ; reprise de 263

- La hauteur calculée d'une table n'est plus arrondie au pas de grille : elle reste celle du contenu (entête et
  lignes), au centième près, comme avant 263. La largeur, elle, reste au pas de grille supérieur.
- Vaut partout où la taille suit le contenu (modification des champs, table secondaire, ouverture, aperçu) et pour le
  modèle de la palette.
- **Fini quand :** sur la fixture RDD, la largeur des tables est multiple de 10 et leur hauteur est celle des lignes
  (sans espace en plus en bas) ; `make check` vert.
- Fait : `fitTable` (`modes/rdd/operations.ts`) écrit la hauteur au centième près, sans `tableSize` ; le modèle de la
  palette (`shapes/common/table.ts`) prend la hauteur des lignes ; `tableSize` (`tables.ts`) ne sert plus qu'à la
  largeur (commentaire ajusté). Tests RDD : hauteurs d'avant 263 (46, 52.8, 68.8, 86…), le test de grille vérifie la
  hauteur inchangée en grille 10 / 20 / sans grille. Validé dans l'appli par l'utilisateur.
