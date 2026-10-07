# RDD : tables au style gris par défaut

> Itération — mode RDD (tables) ; reprise de 179, 180, 181

- Une table neuve (modèle et toutes les tables qui l'étendent : entité, énumération, embedded, document, vue) prend le
  style « Gris » des styles de forme : entête `fillColor=#f5f5f5`, bordure `strokeColor=#666666`, texte de l'entête
  `fontColor=#333333`. « Couleur » propose le gris en premier.
- Le texte de l'entête suit `fontColor` s'il est écrit (sinon noir ou blanc selon le contraste, comme avant) ;
  changer la couleur d'entête le remet au contraste.
- **Fini quand :** une table posée depuis la palette RDD a l'entête gris clair, bordure et texte gris ; draw.io montre
  le même swimlane ; `make check` vert.
- Fait : `DEFAULT_HEADER_COLOR` = `#f5f5f5` et `DEFAULT_HEADER_TEXT` = `#333333` (`rdd/tables.ts`), écrits par
  `tableStyle` pour toutes les tables (bordure `#666666` déjà en place) ; le rendu de l'entête suit `fontColor` s'il est
  écrit (`shapes/common/table.ts`), « Couleur » le remet au contraste (`setHeaderColor`). Tests `rdd.test.ts` (style des
  cinq tables de la palette, gris en tête des couleurs). SPEC §14.5. Vérifié dans l'appli : entité et document posés
  avec l'entête gris clair et le texte gris.
