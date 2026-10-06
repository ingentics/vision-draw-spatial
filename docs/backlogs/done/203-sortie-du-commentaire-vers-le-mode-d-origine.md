# Sortie de l'édition du commentaire : retour au mode d'origine

> Itération — commentaire (édition) ; reprise de 202

- Commentaire ouvert depuis la navigation libre (« C » sans sélection, sur l'élément survolé, qui est alors
  sélectionné) : à la sortie de l'éditeur (validation ou annulation), la sélection est retirée et l'on revient en
  navigation libre.
- Commentaire ouvert depuis l'édition d'une forme ou d'une flèche (élément déjà sélectionné, « C » ou bouton du
  panneau) : à la sortie, l'élément reste sélectionné, on reste en édition.
- **Fini quand :** sans sélection, « C » sur une forme survolée puis Échap ou validation : plus rien de sélectionné ;
  forme sélectionnée puis « C » et sortie : elle reste sélectionnée ; `make check` vert.
- Fait : `CommentEditRequest.fromNavigation` (`src/engine/core/types.ts`), posé par `PointerInput.editHoveredComment`
  quand « C » sélectionne l'élément survolé faute de sélection (`Properties.editComment(id, fromNavigation)`) ;
  `src/app/Viewer.tsx` appelle `clearSelection` à la validation comme à l'annulation de l'éditeur dans ce cas.
  Vérifié dans l'appli : sans sélection, « C » sur une forme survolée puis Échap, plus rien de sélectionné ; forme
  sélectionnée, « C » puis Échap, le panneau « Forme » reste ouvert sur elle.
