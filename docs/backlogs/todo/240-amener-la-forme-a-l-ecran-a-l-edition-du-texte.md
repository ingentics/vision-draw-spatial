# Amener à l'écran la forme dont on édite le texte

> Itération — édition du texte ; `src/engine/core/edit/text/labelEditor.ts`

- Bug : quand on passe en édition de texte sur une forme (ou un texte de lien) qui n'est pas entièrement affichée,
  la zone d'édition est décalée par rapport à la forme.
- À l'entrée en édition, si la boîte de la forme (ou du texte édité) est déjà entièrement visible dans le canvas, la
  caméra ne bouge pas. Sinon, elle se déplace juste ce qu'il faut pour que la boîte soit visible avec une marge de
  20 px écran au bord du canvas : pas de recentrage, translation seule, zoom et orientation inchangés (pour une
  boîte plus grande que le canvas, on aligne son coin haut-gauche avec la marge).
- Le déplacement est animé (`animateCameraTo`, ~200 ms) ; la zone d'édition suit la caméra pendant l'animation et
  finit calée sur la forme.
- Vaut pour toutes les entrées en édition (double-clic, Entrée / F2, frappe directe, texte de lien).
- **Fini quand :** sur une forme coupée par le bord du canvas, le double-clic fait glisser la vue juste assez pour la
  montrer en entier avec 20 px de marge, et la zone d'édition est exactement sur la forme ; sur une forme déjà
  visible, la vue ne bouge pas ; `make check` vert.
