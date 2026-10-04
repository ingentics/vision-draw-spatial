# Position du texte d'une forme dans le panneau contextuel

> Itération — panneau contextuel (format du texte) ; reprise de 31

- Le panneau contextuel d'une forme (section « Texte », et le format du texte pendant l'édition) propose la
  **position du texte** : dedans (défaut), dessus, dessous, à gauche, à droite (grille de boutons).
- Écrit comme la palette de draw.io : dessous = `verticalLabelPosition=bottom;verticalAlign=top`, dessus =
  `verticalLabelPosition=top;verticalAlign=bottom`, gauche = `labelPosition=left;align=right`, droite =
  `labelPosition=right;align=left` ; dedans retire `labelPosition` / `verticalLabelPosition` et remet l'alignement
  centré. Une étape d'annulation par changement, sur toutes les formes sélectionnées.
- **Fini quand :** depuis le panneau, le texte d'une forme passe dessous, dessus, à gauche, à droite et revient
  dedans, en 2D comme en iso / 3D ; le fichier enregistré s'ouvre de la même façon dans draw.io ; `make check` vert.
