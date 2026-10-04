# Position du texte dans le format du texte, pendant l'édition

> Itération — édition du texte (panneau de format) ; reprise de 62

- La grille 3 × 3 de position du texte (62) passe du panneau de la forme au **format du texte**, affiché pendant
  l'édition en place d'un texte de forme (section « Alignement », ligne « Position ») ; elle n'est plus dans le
  panneau de la forme ni dans celui d'une sélection multiple.
- Choisir une place écrit les mêmes clés que 62 (une étape d'annulation « Format du texte ») et l'éditeur suit
  aussitôt le texte à sa nouvelle place (2D, iso, 3D) ; la saisie continue (le focus reste dans le texte).
- Pas de grille pour un texte de flèche.
- **Fini quand :** en éditant le texte d'une forme, la grille déplace le texte et l'éditeur avec lui, sans quitter
  l'édition ; le panneau de la forme n'a plus la grille ; `make check` vert.
- Fait : `TextFormat.tsx` : `LabelPlaceGrid` dans la section « Alignement » du format du texte (texte de forme
  seulement), action `{ type: 'place' }` ; `Viewer` l'écrit par `engine.setTextFormat` (`labelPlacePatch`).
  `Engine.setTextFormat` recale l'éditeur (`relocateLabelEdit`) après un changement de style. Grille retirée du
  panneau de la forme et de la sélection multiple (`ContextPanel`). SPEC §14 mise à jour. Vérifié dans l'appli :
  en éditant « Dessous », « En bas à droite » déplace le texte et l'éditeur, l'alignement suit (gauche / haut), la
  saisie continue.
