# Commentaire d'une flèche

> Itération — panneau de la flèche et survol du rendu

- Une flèche peut porter un commentaire : texte libre sur plusieurs lignes, rangé dans l'attribut `tooltip` de son
  `<UserObject>` (celui de draw.io, qui l'affiche lui aussi en infobulle au survol). Vide = attribut retiré.
- Panneau de la flèche, section Texte : une ligne « Commentaire » (aperçu, ou « aucun ») avec un bouton Modifier qui
  ouvre une zone de texte multiligne ; quitter la zone ou ⌘/Ctrl + Entrée valide, Échap annule. Une étape d'annulation.
- Survol d'une flèche commentée dans la fenêtre de rendu : un encart en bas à gauche montre le commentaire ; il
  apparaît en fondu et disparaît en fondu quand la souris quitte la flèche.
- **Fini quand :** un commentaire saisi dans le panneau s'affiche au survol de la flèche et disparaît à la sortie,
  survit à l'enregistrement et se lit comme infobulle dans draw.io ; `make check` vert.
- Fait : commentaire rangé dans l'attribut `tooltip` de l'enveloppe (`engine/edit/comment.ts`), écrit par
  `setCellWrapperAttribute` (`format/create.ts`, qui sert aussi au lien) via `Engine.setComment` (une étape
  d'annulation « Commentaire »). Panneau : ligne « Commentaire » + Modifier et zone multiligne (`CommentRow`,
  `ContextPanel.tsx`). Survol : `PointerInput.handleHover` émet `commentHover` au changement ; `CommentCard`
  (`Viewer.tsx`, `.comment-card`) apparaît et disparaît en fondu en bas à gauche du rendu. Test d'écriture et de
  relecture dans `editing.test.ts` ; vérifié dans l'appli (saisie sur deux lignes, survol, sortie, annulation).
