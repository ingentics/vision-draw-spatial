# RDD : icône de kind et type de donnée sur chaque ligne de champ

> Milestone — mode RDD (comportements des modèles) ; dépend de 246, 247

- Chaque champ est précédé de son **icône de kind**, variante « nullable » si `nullable` :
  | kind | non nullable | nullable |
  |---|---|---|
  | `pk` | `primary-key.svg` | — (une clé primaire n'est jamais nullable) |
  | `property` | `property.svg` | `property_opt.svg` |
  | `fk` | `relation.svg` | `relation_opt.svg` |
  | `external-fk` | `external-relation.svg` | `external-relation_opt.svg` |
  Fichiers de `docs/assets/`, déplacés dans le mode (`src/engine/modes/rdd/`), taille à l'échelle de la ligne.
- `primary-key.opt.svg` n'est pas repris.
- Le **type de donnée** (son libellé, 246) s'écrit à droite du label, en gris (`#999999`), même police ; rien si le type est vide.
- Le soulignement de la clé primaire (180) est remplacé par l'icône `pk`.
- La largeur calculée (247) tient compte de l'icône et du type.
- **Fini quand :** sur la fixture, chaque kind et chaque variante nullable montre la bonne icône (pas de variante nullable pour `pk`), le type en gris à
  droite du label ; table secondaire à l'échelle 0,8 ; `make check` vert.
- Fait : nouveau `rdd/shapes/common/fieldRow.ts` (`addFieldRow`) : icône de kind dessinée en vecteurs d'après les SVG
  de `docs/assets/` (losange de la couleur du kind, `#ffd700` / `#4a90e2` / `#e74c3c` / `#3c9641`, cerné de
  `#888888` ; petit losange blanc au centre si nullable), puis label, puis type en gris `#999999`. Les fichiers SVG
  ne sont pas chargés ni déplacés : leur dessin est repris en code, comme les icônes d'entête (`docs/assets/` reste
  tel quel). `rdd/tables.ts` : `TABLE.fieldIcon` (12 px, air de 4), `TABLE.typeGap` (6), `fieldTypeLabel`,
  `fieldLayout(kind, field)` (abscisses de l'icône, du label et du type, largeur de la ligne), partagé par le rendu et
  `tableWidth`. `table.ts` : `addText` remplacé par `addFieldRow` ; plus de soulignement de la clé primaire. Écart :
  une table du fichier garde ses dimensions jusqu'à sa première modification (sujet 247), ses types peuvent donc
  déborder à droite. Tests `rdd.test.ts` (position du label et du type, gris, icônes et trou par kind, couleur de la
  clé primaire, largeurs avec le type). SPEC §14.5. Vérifié dans l'appli : icônes jaune / bleue / rouge, trou blanc sur
  `city` et `author`, types en gris (« Nombre entier », « Phrase », « Dynamique »).
