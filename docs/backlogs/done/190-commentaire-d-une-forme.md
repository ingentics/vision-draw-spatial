# Commentaire d'une forme

> Itération — panneau de la forme et survol du rendu ; reprise de 188

- Une forme peut porter un commentaire, comme une flèche : attribut `tooltip` de son `<UserObject>`, ligne
  « Commentaire » + Modifier dans la section Texte de son panneau, même zone de texte multiligne.
- Au survol d'une forme commentée, le même encart s'affiche en bas à gauche du rendu (réglages `comment`) ; la section
  des paramètres devient « Commentaires ».
- **Fini quand :** un commentaire saisi sur une forme s'affiche au survol de la forme et disparaît à la sortie, comme
  sur une flèche ; `make check` vert.
- Fait : ligne Commentaire dans la section Texte du panneau d'une forme (`ContextPanel.tsx`) ; le survol émet
  `commentHover` pour tout élément commenté (`core/input/pointer.ts`). Vérifié dans l'appli sur une forme.
