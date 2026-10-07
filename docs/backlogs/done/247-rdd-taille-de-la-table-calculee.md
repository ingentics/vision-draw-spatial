# RDD : taille de la table calculée, sans poignées de redimensionnement

> Milestone — mode RDD (comportements des modèles) ; dépend de 246

- Plus de poignées de redimensionnement sur les tables (toutes celles qui étendent le modèle) ; la région garde les
  siennes.
- **Hauteur** = entête + une ligne par champ / séparateur (règle actuelle) ; aucune autre hauteur possible.
- **Largeur** = le plus long du titre et des lignes de champ (icône + label + type), plus les marges ; avec une
  **largeur minimale** de 120 px (× 0,8 en table secondaire).
- Recalculée à chaque changement de contenu (titre, champ, type, secondaire), depuis le coin haut-gauche, dans
  l'étape d'annulation du changement. Une table d'un fichier aux dimensions fausses est recalculée à la première
  modification (pas au chargement, pour ne pas salir le document).
- **Fini quand :** une table sélectionnée n'a plus de poignées ; renommer la table ou allonger un champ l'élargit,
  le raccourcir la rétrécit jusqu'au minimum ; secondaire : minimum × 0,8 ; `make check` vert.
- Fait : tables `resizable: false` (`shapes/common/table.ts`). `rdd/tables.ts` : `TABLE.minWidth` = 120 (remplace la
  largeur fixe de 160), `markInset()` (place de l'icône d'entête, reprise de `nameZone`), `tableContent(shape)` et
  `tableWidth(kind, content)` : nom en gras (plus marge de 6 px et icône de chaque côté) ou plus long champ (marge de
  6 px de chaque côté), au moins 120, mesurés par `measureText` à l'échelle 1 puis × 0,8 en secondaire.
  `operations.ts` : `fitTable(edit, shape, changes)` recalcule largeur et hauteur depuis le coin haut-gauche ;
  appelé par `setFields`, `setSecondary` (qui ne met plus à l'échelle les bornes d'avant : une table au mauvais
  format reprend sa taille calculée) et `setIcon` (nouveau, « Icône » du panneau). Cadre : accroche de mode
  `relabeled(edit, elementId)` (`modes/types.ts`), appelée par `TextEdits.setLabel` via
  `PageModes.elementRelabeled`, dans la même étape d'annulation. Palette : largeur calculée sur le nom par défaut
  (mesure approchée au chargement). Écarts : les tables neuves font 120 px de large au lieu de 160 ; « Table
  secondaire » ne garde plus une largeur choisie à la main. Tests `rdd.test.ts` (poignées, minimum, champ long,
  rétrécissement, secondaire, nom avec et sans icône, renommage). Docs : SPEC §14.5, `AJOUTER_UN_MODE.md`. Vérifié
  dans l'appli : plus de poignées de redimensionnement sur une table ; un champ long puis un nom long élargissent
  Orphan ; ⌘Z remet nom et largeur ensemble.
