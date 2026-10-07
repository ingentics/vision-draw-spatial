# RDD : supprimer un champ

> Milestone — mode RDD (comportements des modèles) ; dépend de 249

- Champ sélectionné, **Suppr / Retour arrière** le retire (et non la table) ; la sélection passe à la table.
- La clé primaire ne se supprime pas (touche sans effet).
- La table rétrécit (hauteur, et largeur si c'était la ligne la plus longue) ; une étape d'annulation.
- **Fini quand :** un champ sélectionné disparaît à Suppr, la table s'ajuste ; sur `id`, rien ne se passe ; ⌘Z le
  remet à sa place ; `make check` vert.
- Fait : `ModeParts.remove(edit, shape, part)` (`modes/types.ts`) ; `ShapeParts.removeSelected()` : avec une partie
  sélectionnée, Suppr / Retour arrière (`deleteSelection` des contrôles) la fait retirer par le mode en une étape
  d'annulation, la sélection revient à la forme ; la forme n'est jamais supprimée à sa place, et un refus du mode
  (aucune écriture) laisse la partie sélectionnée (`PageModes.editPageMode` renvoie maintenant si quelque chose a
  changé). RDD : `removeField` (`operations.ts`, jamais la clé primaire, la taille suit), `fieldParts.remove`. Couper
  (⌘X) avec un champ sélectionné coupe toujours la table entière (non traité ici). Tests `rdd.test.ts` (champ retiré,
  hauteur et largeur qui suivent, clé primaire et partie inconnue refusées). SPEC §14.5, `AJOUTER_UN_MODE.md`.
  Vérifié dans l'appli : `Field1` d'Orphan sélectionné, Retour arrière le retire et la table rétrécit ; Suppr sur `id`
  sans effet (champ toujours sélectionné, table intacte) ; ⌘Z remet `Field1`.
