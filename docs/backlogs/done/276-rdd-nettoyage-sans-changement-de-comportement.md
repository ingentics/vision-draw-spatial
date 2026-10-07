# RDD : nettoyage du mode sans changement de comportement

> Refactor — mode RDD ; issu de l'analyse 273 (constats B1 à B8, patterns A4 et A5) ; après 275.

- **Géométrie** (`regions.ts`) : `cornerIn` → `rectContains` ; `fits` → `rectContainsRect` ; bornes englobantes de
  `fitRegion` → `unionOf` ; `overlaps` → `rectsOverlap` ajouté à `model/geometry.ts`, avec son test.
- **Échelle et arrondi** : `isSecondary(shape) ? SECONDARY_SCALE : 1` (7 fois) → `tableScale(shape)` dans le module
  des tables ; `round` de `operations.ts` et l'arrondi de `tableSize` → une seule fonction.
- **Frontière logique / rendu** : `TYPE_COLOR` (et les autres couleurs du mode) sortent de `shapes/common/fieldRow.ts`
  vers un module pur ; `fieldParts.ts` n'importe plus de fichier Three.js.
- **Fichiers** : `tables.ts` (415 lignes) → `fields.ts` (modèle d'un champ, JSON, clé primaire), `tableKinds.ts`,
  `tableLayout.ts` (tailles, largeurs, `fieldRow`) ; `shapes/common/table.ts` → `MARK_PATHS` et `headerMark` dans
  `headerMarks.ts`.
- **Cibles et sélection** (A4) : `shapeTarget`, `edgeTarget`, `tableOf`, `rowOf`, `fieldOf`, `relationFieldOf` dans un
  seul module (`tableTargets.ts`) ; plus de `'kind' in target` / `'sourceId' in target` ailleurs ; `fromField` de
  `relations/index.ts` disparaît.
- **Réglage conditionnel** (A5) : `onlyWhen(properties, predicate)` remplace les trois enveloppes de `hidden`
  (`FIELD_PROPERTIES`, `RELATION_PROPERTIES`, `RELATION_FIELD_PROPERTIES`).
- **`index.ts` assemble** : réglages de région → `regions.ts` ; secondaire, clé primaire, bouton séparateur →
  `tableProperties.ts` ; touche « - » et bouton partagent `addDividerAfter(edit, target, part)`.
- **Redites** : `isPrimaryKey` partout (plus de `kind === 'pk'`) ; type `FieldKind` dérivé de `FIELD_KINDS` ; patch
  de `setField` typé `Partial<Field>` ; `shapeName(shape)` pour `« label || id »` (`check`, `forbiddenLinks`) ;
  largeur du label d'un séparateur mesurée une fois (`dividerWidth` / `addDividerRow`) ; `markInset` en constante ;
  `isModeShape` par `tableKindOf(shape) || isRegion(shape)` au lieu du préfixe `rdd-` ; plus d'assertion `!` sur
  `requiredName`.
- **Recherches** : `shapeById` commun, `leavingDirection` reçoit la table des formes au lieu de la reconstruire ;
  `syncRelations` calcule ses index (formes, flèches, champs de relation) une fois par appel. Pas de cache au niveau
  du module (BONNES_PRATIQUES § 3).
- **Fini quand :** aucun test existant modifié hors imports ; plus aucun fichier du mode au-delà de 400 lignes ; à
  l'œil sur `rdd.drawio` (tables, séparateurs, relations, cardinalités masquées, embedded, régions) rien ne change ;
  `make check` vert.
- Fait : `tables.ts` découpé en `fieldModel.ts` (modèle d'un champ, JSON, clé primaire ; `fields.ts` était déjà pris
  par `settings/fields.ts`), `tableKinds.ts` (formes de table, nom obligatoire, `tableName`) et `tableLayout.ts`
  (tailles, échelle `tableScale` / `secondaryScale`, arrondi `roundSize` partagé avec `operations.ts`, `MARK_INSET`,
  `dividerLabelWidth` mesuré une fois pour la largeur et le dessin d'un séparateur) ; couleurs dans `tableColors.ts`
  (`fieldParts.ts` n'importe plus de fichier Three.js) ; icônes d'entête dans `shapes/common/headerMarks.ts`. Cibles
  dans `tableTargets.ts` (`shapeTarget`, `edgeTarget`, `tableOf`, `rowOf`, `fieldOf`, `relationFieldOf`, `fieldIndex`,
  `shapeById`, `shapeName`, `onlyWhen`) : plus de `'kind' in` / `'sourceId' in` ailleurs. `index.ts` assemble :
  réglage et touche « f » de la région dans `regions.ts`, réglages de table et `addDividerAfter` (bouton et touche
  « - ») dans `tableProperties.ts`. `regions.ts` passe par `rectContains`, `rectContainsRect`, `unionOf` et
  `rectsOverlap` (ajouté à `model/geometry.ts`, testé). `syncRelations` indexe formes et flèches une fois
  (`relationIndex`), passé à `writeRelationEdge` et aux bouts (`leavingDirection` reçoit la table des formes) ;
  `writeEnds` reçoit la flèche. `FieldKind` dérivé de `FIELD_KINDS`, `setField` typé `Partial<Field>`, `isPrimaryKey`
  partout. Tests : seuls les imports changent (plus le test de `rectsOverlap`). Écart : les bornes de « f » sont
  calculées par `unionOf` + marge, ce qui peut différer de l'ancien calcul au dernier bit sur des bornes fractionnaires
  (0,6 % des cas sur 200 000 tirages ; aucun sur des bornes entières). Vu dans l'appli sur `rdd.drawio` : tables,
  séparateurs, icônes, table secondaire, région inchangés.
