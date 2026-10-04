# Forme imposée par `spatial.kind`

> Itération — format (attributs spatiaux) ; reprise de 65

- Un attribut `spatial.kind` (style ou objet, comme les autres attributs spatiaux) impose la forme utilisée par
  Drawio Spatial (`ShapeModel.kind`), sans toucher au style draw.io : `shape=note;spatial.kind=cylinder3;` est
  dessinée comme une BDD ici et reste une note dans draw.io. Absent ou vide : le nom est deviné du style comme avant
  (`resolveShapeKind`).
- **Fini quand :** une forme avec `spatial.kind` prend la définition de ce nom (palette, panneau, rendu), une forme
  sans le garde son nom deviné ; SPEC §14.3 à jour ; `make check` vert.
- Fait : `format/parse.ts` prend `spatialValue(cellule, SPATIAL.kind)` (style puis objet, vide ignoré) avant
  `resolveShapeKind` ; clé `kind` ajoutée à `SPATIAL` (`spatial.ts`). Test dans `tests/engine/spatial/spatial.test.ts`
  (style, objet, valeur vide, absent ; la forme imposée est résolue par le registre). SPEC §14.3 et
  `AJOUTER_UNE_FORME.md` (§ « Le nom de la forme ») à jour. Non vérifié à l'œil dans l'appli (il aurait fallu modifier
  le fichier ouvert) : couvert par le test de lecture ; `make check` vert.
