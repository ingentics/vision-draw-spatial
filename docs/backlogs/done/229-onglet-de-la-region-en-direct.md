# RDD : l'onglet de la région suit la saisie du nom

> Itération — mode RDD (région) ; reprise de 228

- Pendant l'édition en place du nom d'une région, l'onglet se redimensionne à chaque frappe (largeur du nom, S au
  plus près) ; Échap remet l'onglet du nom d'origine, la validation écrit le nom (une étape d'annulation, comme avant).
- L'éditeur en place du nom n'a pas de fond (transparent), même sur une région qui porte un `labelBackgroundColor`.
- Cadre : aperçu en direct du texte saisi pour les formes qui placent elles-mêmes leur label (`editStyle`), sans
  écriture dans le fichier.
- **Fini quand :** en tapant dans l'onglet, il s'allonge et se raccourcit avec le texte ; Échap le remet à la taille
  du nom d'origine ; `make check` vert.
- Fait : `LabelEditor` envoie le texte saisi à chaque changement (`onTextInput`, `readContent`), `Viewer` le passe à
  `Engine.previewEditedLabel` ; `LabelEditing.previewLabel` (formes à `editStyle`) change le label du modèle en
  mémoire, redessine l'objet (`live.rebuildShapeObject`), garde le nom dessiné masqué et recale l'éditeur ;
  `closeLabelEdit` rétablit le nom d'origine (la validation écrit ensuite le nouveau). Fond de l'éditeur pris du style
  affiché (`displayStyle`) ; `editStyle` de la région met `labelBackgroundColor=none`. Tests `rdd.test.ts`. Vérifié dans
  l'appli : l'onglet s'allonge en tapant, Échap le remet, la validation donne le nouvel onglet, éditeur sans fond.
