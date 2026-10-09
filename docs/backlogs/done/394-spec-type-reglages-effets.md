# Type des réglages des effets dans la SPEC

> Itération — documentation (SPEC §13) ; dette vue au sujet 380

- SPEC §13, bloc des paramètres : `effects` est typé `Record<string, Record<string, number>>` alors que les réglages
  d'un effet peuvent aussi être booléens, couleurs ou textes (`PluginSettings`, `FieldValue`). L'écrire
  `Record<string, Record<string, number | boolean | string>>`, comme `modes` et `shapeCategories`, avec l'exemple de la
  forêt (`forest.size`…).
- **Fini quand :** la ligne `effects` de la SPEC a le même type que celles des modes et des catégories de formes.
- Fait : ligne `effects` de `docs/SPEC.md` §13 typée `number | boolean | string`, avec l'exemple des réglages de la
  forêt. Documentation seule.
