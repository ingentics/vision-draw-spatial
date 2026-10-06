# Touche C : éditer le commentaire affiché

> Itération — commentaire (survol) ; reprise de 191

- Quand un commentaire est affiché au survol d'un élément (flèche ou forme), la touche « C » (raccourci
  `editComment`, réglable dans les raccourcis clavier) sélectionne cet élément et passe son commentaire en édition
  en place, comme le bouton Modifier du panneau. Sans commentaire affiché, ou sur une page non modifiable : rien.
- **Fini quand :** survol d'une flèche ou d'une forme commentée puis « C » : le commentaire est en édition dans
  l'encart, le panneau montre son format et « ← Flèche » / « ← Forme » revient à l'élément sélectionné ; `make check`
  vert.
- Fait : raccourci `editComment` (« c », réglable) ; `PointerInput.editHoveredComment` sélectionne l'élément survolé
  et `PropertyEdits.editComment` émet `commentEdit` (aussi utilisé par le bouton Modifier via `Engine.editComment`).
  Test dans `controls.test.ts` ; vérifié dans l'appli (survol d'une forme commentée puis C).
