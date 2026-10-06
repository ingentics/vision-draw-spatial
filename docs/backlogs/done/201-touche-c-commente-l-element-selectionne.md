# Touche C : commenter l'élément sélectionné

> Itération — commentaire (édition) ; reprise de 192

- Édition activée ou non, avec une forme ou une flèche sélectionnée seule, la touche « C » (raccourci
  `editComment`) ouvre l'éditeur de commentaire en place de cet élément, vide s'il n'avait pas de commentaire. Le
  survol d'un élément commenté garde la priorité (comportement de 192), lui aussi hors du mode édition.
- **Fini quand :** en mode édition ou non, clic sur une forme ou une flèche sans commentaire puis « C » : l'encart
  s'ouvre vide en édition, le texte saisi devient son commentaire ; `make check` vert.
- Fait : `PointerInput.editHoveredComment` se replie sur la forme ou la flèche sélectionnée seule quand aucun
  commentaire n'est affiché au survol ; `EditTargets.writablePage` (page modifiable sans tenir compte du mode
  édition) sert à `editComment` et `setComment`. Libellé du raccourci : « Éditer le commentaire (survolé ou
  sélectionné) ». Vérifié dans l'appli : clic sur une forme sans commentaire puis C, l'encart s'ouvre vide et reçoit
  la saisie.
