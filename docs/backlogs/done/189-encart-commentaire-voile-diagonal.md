# Encart du commentaire en voile dégradé

> Itération — survol du rendu ; reprise de 188

- L'encart du commentaire n'est plus une carte : texte posé librement en bas à gauche du rendu, sur un voile gris
  dégradé, dense dans le coin. Pas de flou du rendu derrière.
- Le voile suit le texte : sa courbe (coin arrondi) finit au-dessus et à droite du texte ; son bord est un dégradé
  assez long, de part et d'autre de la courbe, et le texte reste sur la partie sombre. Défauts : courbe 50 px
  au-dessus et 180 px à droite, arrondi 230 px, dégradé 150 px, opacités 75 % (coin) et 45 % (courbe).
- Tout se règle dans les paramètres globaux (section « Commentaire des flèches », réglages `comment`) : couleur et
  opacités du voile (coin, courbe), distances de la courbe au texte (haut, droite), arrondi, longueur du dégradé ;
  couleur, taille, largeur maximale et distance aux bords du texte ; durées des fondus d'apparition et de disparition.
- Sous ces réglages, un aperçu en direct : rendu factice de 400 px de haut sur toute la largeur (fond et grille des
  réglages) avec un commentaire d'exemple, et un bouton pour rejouer le fondu.
- L'encart passe au-dessus du rendu et de ce qui s'y dessine, mais sous les commandes posées sur la vue (mini-carte,
  icône des volumes aplatis, barre du mode, édition du texte).
- Le code du commentaire côté appli est rangé à part (`src/app/comment/` : encart, aperçu, champ du panneau, section
  des paramètres, styles).
- **Fini quand :** au survol d'une flèche commentée, le voile dégradé apparaît en fondu avec le texte, sa courbe
  finit à la distance réglée au-dessus et à droite du texte, il disparaît en fondu à la sortie, et chaque réglage
  agit en direct, dans l'aperçu comme dans le rendu ; `make check` vert.
- Fait : encart réécrit en voile dégradé (forme à coin arrondi floutée sur elle-même, dégradé radial depuis le coin),
  sans flou du rendu ; réglages `comment` (types, défauts, bornes, fusion dans `engine/settings/`) et section
  « Commentaires » des paramètres avec aperçu de 400 px et « Rejouer le fondu ». Encart en z-index 1, mini-carte,
  icône des volumes aplatis et barre du mode en z-index 2. Code rangé dans `src/app/comment/` (`CommentCard`,
  `CommentPreview`, `CommentField`, `CommentSettingsSection`, `comment.css`) ; `Slider` et `ColorField` sortis dans
  `SettingsFields.tsx`. Vérifié dans l'appli (survol, aperçu, mini-carte au-dessus).
