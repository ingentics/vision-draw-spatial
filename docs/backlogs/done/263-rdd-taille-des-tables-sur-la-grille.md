# RDD : taille des tables sur la grille

> Itération — mode RDD (taille des tables) ; reprise de 247 et 255

- La taille calculée d'une table (largeur du nom ou du plus long champ, hauteur des lignes) est arrondie au multiple
  supérieur du pas de grille de la page (`gridSize` draw.io, 10 par défaut) : la table s'étend un peu vers la droite
  et vers le bas, depuis son coin haut-gauche. Page sans grille (`grid="0"`) : taille au pixel près, comme avant.
- Vaut partout où la taille suit le contenu : modification des champs, renommage, table secondaire, ouverture du
  document, aperçu de la saisie. Le modèle de la palette est sur la grille par défaut (10) ; la pose ne réajuste
  pas la table (la région qui l'accueille s'agrandirait d'après l'ancienne taille).
- **Fini quand :** sur la fixture RDD, chaque table a une largeur et une hauteur multiples de 10, l'espace en plus
  à droite et en bas ; ajouter un champ ou renommer garde la table sur la grille ; `make check` vert.
- Fait : `ceilToGrid` (`model/geometry.ts`, testé) ; `tableSize` (`modes/rdd/tables.ts`) arrondit au centième puis
  au pas de grille, appelé par `fitTable` (`operations.ts`), l'aperçu de saisie (`fieldParts.ts`) et le modèle de la
  palette (`shapes/common/table.ts`, grille 10). `ModeEdit.gridSize` (lu par `gridSizeOf` dans `modeEdits.ts`) et
  `textPreview(…, gridSize)` (`core/modes/shapeParts.ts`) donnent le pas au mode. Tests RDD adaptés aux tailles sur
  la grille, plus un test grille 10 / 20 / sans grille. Vu dans l'appli sur `rdd.drawio` : les 10 tables ont des
  tailles multiples de 10, bords sur les lignes de la grille.
