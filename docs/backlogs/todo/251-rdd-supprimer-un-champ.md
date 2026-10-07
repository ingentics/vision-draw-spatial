# RDD : supprimer un champ

> Milestone — mode RDD (comportements des modèles) ; dépend de 249

- Champ sélectionné, **Suppr / Retour arrière** le retire (et non la table) ; la sélection passe à la table.
- La clé primaire ne se supprime pas (touche sans effet).
- La table rétrécit (hauteur, et largeur si c'était la ligne la plus longue) ; une étape d'annulation.
- **Fini quand :** un champ sélectionné disparaît à Suppr, la table s'ajuste ; sur `id`, rien ne se passe ; ⌘Z le
  remet à sa place ; `make check` vert.
