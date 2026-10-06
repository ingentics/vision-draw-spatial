# RDD : palette propre aux régions

> Itération — mode RDD (région) ; reprise de 182 et 232

- « Couleur » d'une région propose sa propre palette, dans cet ordre : `#fdebef` (rose), `#eae4f1` (lavande),
  `#e7f5fd` (bleu), `#e7f3e7` (vert), `#fefce8` (jaune), `#feefe3` (pêche) ; une région neuve prend la première.
- Bordure des régions : gris `#969696` quelle que soit la couleur (plus la couleur assombrie), comme sur la maquette.
- Une région neuve (palette) fait **200 × 80** (au lieu de 400 × 260).
- Les tables gardent leur palette (couleurs de l'appli).
- **Fini quand :** le choix de couleur d'une région liste les six couleurs ; une région neuve est rose bordée de gris, en 200 × 80 ;
  draw.io montre les mêmes couleurs ; `make check` vert.
- Fait : `REGION_COLORS` et `DEFAULT_REGION_COLOR` (`rdd/regions.ts`), bordure `REGION.stroke` = `#969696` (fin de
  la couleur assombrie, `regionStroke` retiré) ; réglage « Couleur » propre aux régions (`rdd.regionColor`, la palette
  des régions), celui des tables limité aux tables ; région neuve rose, 200 × 80. Fixture `rdd.drawio` réenregistrée par
  draw.io. Tests `rdd.test.ts` (palette, couleur écrite, bordure grise, taille). SPEC §14.5. Vérifié dans l'appli :
  région neuve rose bordée de gris en 200 × 80, « Couleur » à `#fdebef`.
