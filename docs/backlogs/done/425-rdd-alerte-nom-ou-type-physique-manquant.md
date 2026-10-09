# RDD : icône d'alerte rouge pour un nom ou un type physique manquant

> Itération — mode RDD, couche physique des tables (reprise de 414)

- En couche physique, un champ sans `dbName` **ou** sans `dbType` montre une **icône d'alerte rouge** (`#e53935`,
  triangle de 12 × 12 avec un point d'exclamation blanc), calée à droite de sa ligne (marge de droite de la table).
  Les valeurs manquantes restent affichées comme avant (la logique, en rouge italique).
- La couche logique ne change pas ; la largeur des tables réserve la place de l'icône (même taille dans les deux
  couches).
- **Fini quand :** sur `rdd-couches.drawio`, en couche physique (Tab), les champs auxquels manque un nom ou un type
  physique ont une icône d'alerte rouge au bout de leur ligne, ceux qui ont les deux n'en ont pas ; en couche
  logique, l'affichage est inchangé.
- Fait : `physicalMissing` (`tables/physicalLayer.ts`) : champ sans `dbName` ou sans `dbType` ; icône d'alerte
  (`warningIcon`, `shapes/common/fieldRow.ts`) dessinée en couche physique contre la marge de droite de la table
  (`table.ts` passe le bord droit) ; place réservée dans `fieldLayout` (`TABLE.warning` : 6 d'air + 12,
  `tables/tableLayout.ts`). Changement de comportement : une table qui a une couche physique et un champ incomplet
  s'élargit de 18 px, aussi en couche logique (même taille dans les deux couches). Tests : `physicalLayer.test.ts`
  (règle et largeur), largeurs attendues des aides RDD (`physicalRowWidth`). Vérifié dans l'appli sur
  `rdd-couches.drawio` : icônes sur les champs incomplets en couche physique, aucune sur `user_id` /
  `email_address`, rien en couche logique.
