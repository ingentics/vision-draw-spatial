# RDD : sélectionner un champ dans une table

> Milestone — mode RDD (comportements des modèles) ; dépend de 246 ; socle de 250 à 254

- Table sélectionnée, un clic sur une ligne de champ **sélectionne ce champ** (ligne surlignée) ; un clic sur
  l'entête ou hors de la table revient à la table entière. Échap désélectionne le champ.
- Le panneau montre, pour le champ sélectionné : label, kind (choix parmi les quatre), nullable (case), type (lecture
  seule, voir 250) ; la clé primaire n'a ni kind ni nullable modifiables.
- Double-clic sur un champ : édition du label sur place (comme le nom d'une forme) ; Entrée valide, Échap annule ;
  un label vide est refusé (label précédent conservé).
- Chaque modification est une étape d'annulation et recalcule la largeur (247).
- **Fini quand :** on sélectionne un champ au clic, on change son label sur place, son kind et nullable au panneau
  (l'icône suit) ; ⌘Z annule chaque changement ; `make check` vert.
