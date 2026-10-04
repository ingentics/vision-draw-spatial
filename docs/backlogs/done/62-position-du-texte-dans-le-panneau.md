# Position du texte d'une forme dans le panneau contextuel

> Itération — panneau contextuel (texte d'une forme) ; reprise de 31

- Le panneau contextuel d'une forme (section « Texte ») et celui d'une sélection de plusieurs formes proposent la
  **position du texte** dans une grille 3 × 3, comme le menu « Position » de draw.io : en haut à gauche, dessus,
  en haut à droite, à gauche, **au milieu** (dans la forme, défaut), à droite, en bas à gauche, dessous, en bas à
  droite. Chaque case montre la forme et la place du texte ; la position courante est cochée.
- Écrit comme draw.io : `labelPosition` (left / right), `verticalLabelPosition` (top / bottom), et l'alignement
  opposé pour que le texte touche la forme (`align` right / left, `verticalAlign` bottom / top) ; les valeurs par
  défaut (center, middle) sont retirées du style. Au milieu : texte centré dans la forme. Une étape d'annulation
  (« Position du texte ») par changement, sur toutes les formes sélectionnées.
- **Fini quand :** depuis le panneau, le texte d'une forme passe aux 8 places autour et revient au milieu, en 2D
  comme en iso / 3D ; le fichier enregistré s'ouvre de la même façon dans draw.io ; `make check` vert.
- Fait : `engine/edit/labelPosition.ts` (`LABEL_PLACES`, `labelPlaceOf`, `labelPlacePatch`, `labelPlaceName`) ;
  `ContextPanel` : `LabelPlaceGrid` dans la section « Texte » d'une forme et d'une sélection multiple (cases avec
  la forme et la place du texte, la place courante cochée, un clic sur la place courante ne fait rien) ;
  `onShapeStyle` prend le nom de l'étape d'annulation (« Position du texte »). Style CSS `.label-place-grid`. SPEC
  §14 (tableau des gestes) mise à jour. Tests : `tests/engine/edit/labelPosition.test.ts` (neuf places, clés de
  draw.io, aller-retour style → place). Vérifié dans l'appli : dessous → à droite → au milieu depuis le panneau,
  texte déplacé aussitôt, case cochée qui suit, annulation disponible ; placement en iso / 3D repris de 31. Pas
  dans le format du texte pendant l'édition en place.
