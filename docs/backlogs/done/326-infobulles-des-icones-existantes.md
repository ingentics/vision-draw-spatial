# Infobulles des icônes existantes

Les boutons-icônes d'avant la règle « chaque icône a une infobulle qui dit ce qu'elle fait » (`.claude/rules/coding.md`
§6) n'ont que leur nom, en `title` natif au lieu de `useTooltip` (`Tooltip.tsx`) : aligner et répartir
(`ArrangeSection.tsx`), trait de la bordure (`BorderSection.tsx` : « Plein », « Tirets », « Pointillés »), format
du texte (`TextFormat.tsx`), position du texte (grille 3 × 3), ancre des textes de flèche (`ContextPanel.tsx`).
- Fait : `title` natif remplacé par `useTooltip` (avec `aria-label`) et textes enrichis de ce que fait le bouton et de
  la clé draw.io écrite : boutons d'Aligner et Répartir (`ArrangeSection.tsx` ; le libellé « (à partir de trois
  formes) » des boutons de répartition grisés est gardé), trait de la bordure (`BorderSection.tsx`), boutons du
  format du texte — gras, italique, souligné, barré, taille −/+, « Ajuster », alignements (`FormatButton` de
  `TextFormat.tsx`, nouvelle prop `tip`), grille de position du texte (infobulle tirée de `labelPlacePatch`), ancres
  Début / Milieu / Fin des textes de flèche (`ContextPanel.tsx`). Dans les mêmes sections, aussi : « Aucune
  bordure », pastilles de couleur de bordure et de texte, boutons −/+ de l'épaisseur. Changement visible : les
  libellés lus par un lecteur d'écran sont plus courts (« Gras » au lieu de « Gras (Ctrl+B) », le raccourci passe
  dans l'infobulle). Les boutons restent tels quels (pas de passage à `ChoiceGroup`, dont le style d'icône diffère
  et qui prend le focus de l'édition de texte). Vérifié à l'œil dans l'appli (`sequences.drawio`) : infobulles des
  traits, d'Aligner / Répartir sur trois formes, du format et de la position du texte en édition, des ancres de la
  flèche « login ».
