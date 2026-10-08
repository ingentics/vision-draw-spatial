# RDD : types de donnée date simple, date et heure

> Itération — mode RDD (champs) ; reprise de 246, 248

- Deux types ajoutés à `FIELD_TYPES` (`rdd/tables/fieldModel.ts`), identifiant écrit dans le fichier → libellé
  affiché :
  | identifiant | libellé |
  |---|---|
  | `date` | Date simple |
  | `datetime` | Date et heure |
- Ils apparaissent dans la liste des types du panneau d'un champ, à la suite des types existants ; le libellé
  s'affiche en gris à droite du label (248) et compte dans la largeur de la table (247).
- Pas de type défini par l'utilisateur : la liste reste fermée.
- **Fini quand :** sur une fixture, un champ de chacun des deux types montre son libellé en gris ; le type choisi au
  panneau est enregistré dans le fichier et relu à la réouverture ; `make check` vert.
- Fait : `date` → « Date simple » et `datetime` → « Date et heure » ajoutés à la fin de `FIELD_TYPES`
  (`rdd/tables/fieldModel.ts`) ; la liste du panneau, le libellé gris et la largeur suivent sans autre changement.
  Fixture `rdd-types-date.drawio` (entité Event : `id`, `day` en date simple, `starts_at` en date et heure, largeur
  170) ; tests : liste des neuf types au panneau, libellés, largeur et relecture après enregistrement ; l'exemple de
  type inconnu passe de `date` à `timestamp`. Vu dans l'appli ; `make drawio-check` : draw.io conserve les types.
