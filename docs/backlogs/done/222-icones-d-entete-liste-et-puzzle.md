# Icônes d'entête : liste pour l'énumération, pièce de puzzle pour l'embedded

> Itération — mode RDD (tables) ; reprise de 220 et 221

- Les jumelles de la vue deviennent un cas d'une **icône d'entête** commune : même place (en haut à droite, à 7 px du bord,
  centrée dans l'entête), agrandie pour se lire : 21 × 13,5 px, même trait (1 px, couleur de la bordure, 100 %), même zone du
  titre réduite des deux côtés.
- **Entité énumérative** : icône **liste** (trois puces rondes et leurs lignes).
- **Embedded** : petite **pièce de puzzle** droite, aux coins arrondis (tenons en haut et à droite, encoche en bas,
  côté gauche droit), d'après le modèle fourni.
- L'icône est une option du **modèle de base** des tables (déclarée par chaque forme de table, dessinée et réservée
  dans la zone du titre par la base commune), avec un réglage **« Icône »** dans le panneau des tables qui en ont
  une : cochée par défaut ; décochée, `spatial.icon=0` masque l'icône et le titre reprend toute la largeur (une étape
  d'annulation).
- **Fini quand :** vue (jumelles), énumération (liste) et embedded (puzzle) montrent leur icône en haut à droite, le
  titre ne les chevauche pas ; les autres tables n'en ont pas ; « Icône » décochée la masque et rend
  au titre toute la largeur ; `make check` vert.
- Fait : `TableKind.mark` (`HeaderMark` : `binoculars`, `list`, `puzzle`) remplace `binoculars` ; posé sur la vue,
  l'énumération et l'embedded. Base commune (`rdd/shapes/common/table.ts`) : `headerMark()` trace les chemins de
  `MARK_PATHS` dans un cadre 14 × 9 agrandi `TABLE.mark.zoom` = 1,5 (trait de 1 px, couleur de la bordure), et
  `nameZone()` réserve 7 + 21 + 4 = 32 px de chaque côté. Liste : trois puces et leurs lignes ; puzzle :
  `puzzlePiece()` (carré aux coins arrondis, cercle sur col étroit pour tenons et encoche, centré). Réglage « Icône »
  du mode (`spatial.icon=0`, `shownMark()`), proposé aux seules tables à icône. Tests `rdd.test.ts` (icônes, place,
  taille, couleur, réglage, zone du titre) ; SPEC §14.5. Vérifié dans l'appli : jumelles, liste et puzzle lisibles ;
  puzzle comparé à l'aperçu agrandi.
