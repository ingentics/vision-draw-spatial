# Édition du commentaire en place, en texte riche

> Itération — commentaire (panneau et encart du rendu) ; reprise de 188 et 190

- « Modifier » sur la ligne Commentaire n'ouvre plus de zone de texte : le commentaire passe en édition directement
  dans l'encart en bas à gauche du rendu (texte sélectionné), qui reste affiché pendant toute l'édition.
- Même liberté que le texte d'une forme : gras, italique, souligné, barré, taille, couleur, styles de texte, sur la
  sélection ou sur tout le commentaire ; Ctrl+B / I / U ; Entrée ajoute une ligne, Ctrl+Entrée ou un clic ailleurs
  valide, Échap annule.
- Pendant l'édition, le panneau de droite montre le format du texte (sans alignement ni position, propres au texte
  d'une forme), avec le retour à l'objet (« ← Flèche » / « ← Forme ») qui valide.
- Stockage : texte brut dans `tooltip` ; avec une mise en forme partielle, HTML dans `tooltip` et
  `spatial.commentHtml="1"`. L'encart du survol affiche la mise en forme.
- **Fini quand :** un commentaire s'édite dans l'encart avec le panneau de format, sa mise en forme se garde à
  l'enregistrement et s'affiche au survol ; le texte d'une forme s'édite toujours comme avant ; `make check` vert.
- Fait : saisie riche sortie de `LabelEditor` dans `src/app/richEditor.ts` (`useRichEditor`), partagée avec
  `comment/CommentEditor.tsx` (tout le texte sélectionné à l'ouverture, commandes sur tout le commentaire sans
  sélection). Panneau de format en mode commentaire (`TextEdit.comment` : sans alignement, position ni ajustement ;
  titre « Commentaire »). Modèle `ElementComment` (`engine/edit/comment.ts`) : HTML marqué par
  `spatial.commentHtml` ; `setComment` l'écrit, l'encart du survol l'affiche. Test de lecture dans
  `editing.test.ts` ; vérifié dans l'appli (gras sur deux lignes, retour à la forme, survol). Non vérifié : l'affichage
  d'un `tooltip` HTML dans draw.io.
