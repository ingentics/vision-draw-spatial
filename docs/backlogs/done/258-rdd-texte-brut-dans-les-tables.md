# RDD : texte brut, sans mise en forme, dans les tables

> Itération — mode RDD (édition des textes) ; reprise de 179 et 249

- Sur les tables du mode RDD (toutes les formes qui étendent le modèle), tout texte qu'on écrit sur place — nom de la
  table, label d'un champ, texte d'un séparateur — est du **texte brut** : pas de panneau « Texte » (format) pendant
  la saisie, pas de mise en forme (⌘B / ⌘I / ⌘U sans effet, collage sans format), le texte est écrit sans HTML.
- Cadre : une forme peut déclarer son texte brut (`ShapeDefinition.plainText`) ; le texte d'une partie est toujours
  brut ; la demande d'édition le dit (`LabelEditRequest.plain`), l'appli n'ouvre alors pas le format.
- **Fini quand :** double-clic sur le nom d'une table, un champ ou un séparateur : l'éditeur s'ouvre sans panneau de
  format, ⌘B ne met rien en gras, le texte validé est écrit tel quel ; les formes hors RDD gardent leur format ;
  `make check` vert.
- Fait : `ShapeDefinition.plainText` et `ShapeRegistry.isPlainText` ; tables RDD `plainText: true`
  (`shapes/common/table.ts`). `LabelEditRequest.plain` : posé par `LabelEditor.editLabel` pour une forme en texte brut
  (sans HTML de départ) et toujours par `editPartLabel`. Appli : pas de panneau de format (`textEdit`) pour une
  édition en texte brut ; raccourcis ⌘B / ⌘I / ⌘U sans effet (`richEditor.ts`, option `plain`) ; validation sans
  HTML (`Viewer`), le texte écrit étant échappé par `setCellLabel` (`html=1`). Le collage était déjà sans format. La
  région RDD garde l'éditeur normal (seules les tables sont des « modèles »). Test `rdd.test.ts` (tables en texte
  brut, région non). SPEC §14.5, `AJOUTER_UNE_FORME.md` (avec `connectSides`, ajouté au 250 sans y être documenté).
  Vérifié dans l'appli : double-clic sur le nom d'Orphan → panneau « Forme » (pas de format), ⌘B puis « X » →
  « OrphanX » sans gras ; double-clic sur `Field1`, ⌘I puis « Y » → texte brut, panneau « Forme ».
