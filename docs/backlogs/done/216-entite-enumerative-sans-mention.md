# Entité énumérative sans mention « «enum» »

> Itération — mode RDD (tables) ; reprise de 180 et 215

- L'entité énumérative (`rdd-enum`) n'affiche plus la mention `«enum»` : son cadre double autour de l'entête suffit à
  la reconnaître. Son entête reprend la hauteur d'une table sans mention (26 px, `startSize=26`, 46 px de haut avec
  `id`) ; nom droit, comme l'entité.
- **Fini quand :** une entité énumérative posée depuis la palette montre son nom dans un entête à cadre double, sans
  `«enum»`, à la hauteur de l'entité ; `make check` vert.
- Fait : `rdd-enum` perd sa mention dans `TABLE_KINDS` (entête 26 px, `startSize=26`, 46 px avec `id`) ; icône de
  palette à entête à cadre double, pour la distinguer de l'entité. Fixture `rdd.drawio` (Role) ramenée à l'entête de
  26 px et réenregistrée par draw.io ; tests `rdd.test.ts` et SPEC §14.5 à jour. Vérifié dans l'appli : Role sans
  `«enum»`, cadre double, à la hauteur de User.
