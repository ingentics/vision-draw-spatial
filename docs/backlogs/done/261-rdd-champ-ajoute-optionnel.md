# RDD : un champ ajouté est optionnel par défaut

> Itération — mode RDD (champs) ; reprise de 250 et 256

- Un champ ajouté par le « + » est **optionnel** (`nullable: true`) ; son icône a donc le petit losange blanc, et
  « Optionnel » est coché dans le panneau. La clé primaire, elle, n'est jamais optionnelle.
- **Fini quand :** un clic sur « + » ajoute `FieldN` optionnel (icône trouée, case cochée) ; `make check` vert.
- Fait : `addField` crée un champ `nullable: true` (`operations.ts`). Corrigé en passant (défaut du 248, vu en
  vérifiant) : le remplissage des icônes de champ avait l'ordre de dessin du fond de la table, qui pouvait le couvrir
  (losanges vides de `id` et `Field1` une fois Orphan agrandie sur Document) ; il passe à `PART_ORDER.fill + 0.6`
  (`shapes/common/fieldRow.ts`). Tests `rdd.test.ts` (Field1…3 optionnels, ordre de dessin du remplissage). SPEC §14.5.
  Vérifié dans l'appli : « + » sur Orphan → `Field3`, « Optionnel » coché ; losanges de nouveau pleins.
