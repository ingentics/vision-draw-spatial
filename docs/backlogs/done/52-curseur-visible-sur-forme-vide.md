# Curseur visible à l'édition d'une forme sans texte

> Itération — édition du texte en place ; reprise de 51

- Sur une forme sans texte, le champ de saisie faisait 0 px de large (`min-width: max(1em, min-content)` est
  invalide en CSS, donc ignoré) : le curseur ne s'affichait qu'après la première lettre. Le champ vide garde une
  largeur minimale pour que le curseur bleu clignote dès l'ouverture.
- **Fini quand :** forme neuve, double-clic : le curseur bleu clignote au centre de la forme avant toute saisie ;
  `make check` vert.
- Fait : `src/app/main.css` (`.label-editor-text` : `min-width: min-content`, et une largeur minimale de 1 px quand
  le texte est vide ou réduit au `<br>` laissé par un effacement). Vérifié dans l'appli sur un rectangle neuf : le
  champ vide fait 1 px au lieu de 0, et le curseur, élargi temporairement pour être visible à la capture, clignote au
  centre de la forme dès le double-clic, puis encore après avoir tapé et effacé une lettre ; `make check` vert.
