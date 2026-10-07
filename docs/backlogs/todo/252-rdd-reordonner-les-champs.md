# RDD : réordonner les champs au glisser

> Milestone — mode RDD (comportements des modèles) ; dépend de 249

- Glisser un champ verticalement dans sa table le déplace ; un trait d'insertion montre la place visée.
- La clé primaire reste toujours en tête : elle ne se glisse pas, et rien ne se dépose au-dessus d'elle.
- Les séparateurs (253) se glissent comme les champs.
- Une étape d'annulation ; glisser hors de la table annule le geste (pas de déplacement entre tables à ce stade).
- **Fini quand :** un champ glissé de la 4ᵉ à la 2ᵉ ligne y reste, `id` ne bouge jamais ; ⌘Z remet l'ordre ;
  `make check` vert.
