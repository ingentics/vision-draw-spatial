# Lien vers le panneau de l'élément depuis le format du texte

> Itération — édition du texte (panneau de format)

- Pendant l'édition en place, le panneau « Texte » (format du texte) montre en haut un lien vers l'élément qui
  porte le texte : « ← Forme » pour le texte d'une forme, « ← Flèche » pour un texte de flèche (milieu, début,
  fin).
- Le lien valide la saisie (comme Ctrl+Entrée) et rouvre le panneau de cet élément (style, bordure, volume, lien),
  l'élément restant sélectionné.
- **Fini quand :** en éditant le texte d'une forme ou d'une flèche, le lien ramène à son panneau avec le texte
  saisi enregistré ; `make check` vert.
- Fait : `TextFormat.tsx` : lien « ← Forme » / « ← Flèche » (`TextEdit.onOwner`) en haut du format du texte ;
  `RichEditorHandle.commit()` (`LabelEditor`) valide la saisie comme Ctrl+Entrée ; `Viewer` les relie. SPEC §14
  mise à jour. Vérifié dans l'appli sur une forme : texte saisi enregistré, panneau « Forme » rouvert, forme
  toujours sélectionnée, annulation disponible. Texte de flèche : même chemin (libellé « Flèche »), non essayé
  dans l'appli.
