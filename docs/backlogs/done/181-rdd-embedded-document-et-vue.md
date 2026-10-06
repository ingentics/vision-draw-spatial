# RDD : embedded, document JSONB et vue

> Milestone — mode RDD ; dépend de 179 (modèle abstrait)

Trois formes qui étendent le modèle (entête, champs, couleur, table secondaire), sans champ `id` imposé ; chacune
porte sa mention au-dessus du nom :

- **Embedded** (`rdd-embedded`, `«embedded»`) : objet incorporé dans une entité, sans table propre ; bordure en
  tirets pour le distinguer d'une table.
- **Document** (`rdd-document`, `«jsonb»`) : document déstructuré mais nommé (colonne JSONB) ; le nom est
  obligatoire (un document sans nom affiche « Document » et est signalé dans Diagnostics) ; la zone des champs
  liste les clés connues, en italique (indicatif, sans contrainte).
- **Vue** (`rdd-view`, `«view»`) : vue construite sur d'autres modèles ; coins arrondis.
- Palette RDD : « Embedded », « Document JSONB », « Vue », après les entités.
- **Fini quand :** les trois formes se posent depuis la palette RDD, chacune reconnaissable (mention, tirets,
  italique, coins arrondis) ; couleur et table secondaire fonctionnent ; elles se rouvrent dans draw.io en
  swimlane de la bonne couleur ; `make check` vert.
- Fait : `TABLE_KINDS` gagne `rdd-embedded`, `rdd-document`, `rdd-view` (options `italicFields`, `requiredName`,
  `style` : clés du style d'une table neuve, `dashed=1` et `rounded=1;absoluteArcSize=1;arcSize=16`, que le rendu et
  draw.io suivent) ; formes `rdd/shapes/embedded|document|view/` (icônes : tirets, clés en pointillé, coins arrondis).
  Rendu commun : contour arrondi avec `rounded=1`, entête coupé dans le contour, champs en italique, nom de
  remplacement ; `check` signale un document sans nom (`missingName`). Fixture `rdd.drawio` : Address, Settings, un
  document sans nom, ActiveUsers (réenregistrée par draw.io 24.7.5 : tirets et coins arrondis visibles, swimlanes de
  la bonne couleur). Tests `rdd.test.ts`, `palette.test.ts` ; SPEC §14.5. Vérifié dans l'appli : palette à cinq
  tables, mentions, tirets, italique, « Document », coins arrondis, deux signalements dans Diagnostics.
