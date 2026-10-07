# RDD : options de champ et de table déclaratives

> Refactor — mode RDD (champs, panneau) ; issu de l'analyse 273 (patterns A2, A3) ; après 276. Prépare 269 (document
> sans champs) et 272 (« Matérialisé », champ de vue sans Optionnel ni Gouvernance).

- **Options de champ** : une table `FIELD_OPTIONS`, une entrée par option (`unique`, `nullable`, `comment`, `pgName`,
  `pgType`, `gdpr`, `personal`, `prefix`) : `{ key, type: 'flag' | 'text', label, title, section?, multiline?,
  on(table, field) }`. Elle remplace `OPTIONAL_FLAGS` / `OPTIONAL_TEXTS`, la chaîne de gardes de `setField` et les
  fabriques `flag()` / `text()` de `fieldProperties.ts` : lecture et écriture du JSON, filtre de `setField` (option
  hors `on` refusée) et réglages du panneau (`hidden` = `!on`) s'en déduisent.
- **Forme de table** : `TableKind = { look, rules }` ; `look` : `italic`, `doubleHeader`, `folded`, `wavy`, `mark`,
  `style`, `italicFields` ; `rules` : `primaryKey`, `uniqueFields`, `requiredName`, `fields` (vrai partout pour
  l'instant), `options`. `type TableKindId` et `TABLE_KINDS: Record<TableKindId, TableKind>`.
- **Options de table** au même format (`TABLE_OPTIONS`, `on(kind)`, effet éventuel) : « Table secondaire » y passe
  (son effet : taille et `startSize`, `fontSize`) ; le réglage du panneau s'en déduit.
- **Écart de comportement** (à reporter dans « Fait : ») : « Unique » n'est plus accepté par `setField` sur une table
  sans `uniqueFields` (modèle, document, vue), et il est retiré à la remise en ordre d'un fichier qui le porte.
- **Fini quand :** aucune règle d'option de champ ou de table hors de `FIELD_OPTIONS` / `TABLE_OPTIONS` ; un test par
  règle `on` ; « Unique » refusé sur une vue par `setField` (test) ; à l'œil, le panneau d'un champ d'entité, d'enum,
  d'embedded, de document et de vue montre les mêmes réglages qu'avant ; `make check` vert.
- Fait : `FIELD_OPTIONS` (`fieldModel.ts`) déclare les huit options d'un champ (`nullable`, `unique`, `comment`,
  `pgName`, `pgType`, `gdpr`, `personal`, `prefix`) avec leur règle `on(table, field)` ; s'en déduisent la lecture et
  l'écriture du JSON (ordre des clés écrites inchangé), le filtre de `setField` (`optionValue`) et les réglages du
  panneau (`optionProperty` de `fieldProperties.ts`, `hidden` = `!on` ; le préfixe, `panel: false`, reste au formulaire
  de sa relation). `OPTIONAL_FLAGS` / `OPTIONAL_TEXTS`, la chaîne de gardes de `setField` et les fabriques `flag()` /
  `text()` disparaissent. `TableKind = { look, rules }` (`tableKinds.ts`), `TableKindId`, `TABLE_KINDS:
  Record<TableKindId, TableKind>` (`isTableKindId`) ; `rules.fields` (vrai partout) décide du « + ». `TABLE_OPTIONS`
  (`tableProperties.ts`) : « Table secondaire », son effet `setSecondary`, son réglage déduit. Tests : `tables.test.ts`
  réparti tel quel en `fieldModel.test.ts` et `tableLayout.test.ts` (miroir des fichiers de 276) ; un test par règle
  `on`, la lecture qui écarte une option refusée, « Unique » refusé sur une vue par `setField`, l'option de table.
  Écarts : « Unique » n'est plus accepté par `setField` sur une table sans `uniqueFields` (modèle, document, vue) ;
  à la lecture (`tableFields`), une option hors de sa règle est ignorée, donc retirée du fichier à la première
  écriture de la table : « Unique » sur ces tables, et un préfixe sur un champ qui n'est pas de relation (fichier
  modifié à la main). Vu dans l'appli : panneaux d'un champ de document (sans « Unique ») et d'énumération (avec), et
  de la table (« Table secondaire », clé primaire) inchangés ; entité, embedded et vue couverts par les tests.
