# Curseur clignotant en fin de texte à l'édition

> Itération — édition du texte en place ; reprise de 14.1 (SPEC)

- À l'ouverture de l'édition d'un texte (double-clic, F2, « Modifier »), le texte n'est plus entièrement
  sélectionné : le curseur bleu clignotant est posé après le dernier caractère, comme sur un texte de flèche vide.
  La saisie s'ajoute au texte ; ⌘A / Ctrl+A sélectionne tout.
- **Fini quand :** en éditant une forme qui a déjà un texte, le curseur bleu clignote en fin de texte et rien n'est
  surligné ; `make check` vert.
- Fait : `src/app/LabelEditor.tsx` (à l'ouverture, la plage couvrant le texte est repliée sur sa fin :
  `range.collapse(false)` au lieu de tout sélectionner) et `docs/SPEC.md` (ligne « Éditer un texte »). Vérifié dans
  l'appli : F2 sur « Cassé » montre le curseur bleu clignotant après le « é », sans surlignage, et la saisie s'ajoute
  au texte ; `make check` vert.
