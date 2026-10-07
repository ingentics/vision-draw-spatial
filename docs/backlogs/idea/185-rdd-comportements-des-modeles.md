# RDD : comportements des modèles

> Milestone — mode RDD ; après 179 à 181

Édition des champs sur la forme (ajout, suppression, ordre, type, nullabilité, clés), héritage entre modèles,
relations entre tables… à préciser une fois les bases du mode en place.


- Il n'est pas possible de changer la hauteur d'une shape model (top & bottom, enlever les handlers)
- Il n'est pas possible de changer la largeur d'une shape model (enlever les handlers), la largeur dépend du contenu le plus long (titre ou champ). On mettra un min-width (qui sera proportionnel au secondaire)
- Pouvoir ajouter un champ : ajouter un handler vert dédié "Field1", "Field2...".
- Je peux réordonner les champs d'un shape model. l'id est toujours le premier champ (si il y en a un - ne peut être supprimé).
- Je peux supprimer un champ d'un shape model
- Pouvoir ajouter des "divider" entre les champs du model (un label "-"). Je peux également mettre un texte au milieu du divider (7pt, grey), si je met un texte vide, ca supprime le divider.
- Un champ est forcément précédé d'une icone (me demander les médias): Primary Key, property, foreign key, foreign key from another domain, avec leur variantes NULL. docs/assets/*.svg.
- Un champ a un label, et un type de données (liste que je te donnerai). Le type de données est écrit à droite du label en gris.
- Donc un champ a un type (que l'on ne contrôle pas, il est connu à la création), un label, nullable? et un kind.
- On fera l'aspect relationnel dans un second temps (arrête toi à l'ajout des autres champs)


---- POUR APRES: JUSTE l'idée:
Quand un champ est sélectionné, dans la sidebar, on affiche les blocs suivants:
- Postgres: field name, field type (psql)
- Gouvernance: isGDPR?, sensitivity?