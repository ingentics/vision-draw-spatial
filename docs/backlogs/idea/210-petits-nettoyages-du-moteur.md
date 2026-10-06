# Petits nettoyages du moteur

> Idée — dette technique du moteur

- Paramètres : ajouter un réglage touche quatre fichiers (`types`, `defaults`, `limits`, `merge/*`) ; piste d'un
  schéma unique par réglage (défaut, bornes, type).
- `Config` : `get/setViewSettings`, `get/setControls`, `get/setTransitionSettings`, `get/setPreloadSettings`
  doublonnent `updateSettings` ; à retirer s'ils ne servent plus.
- `GRAPH_PAGE_ID` testé dans 11 fichiers, `transitions.active` 29 fois dans `core/` : un garde central
  (`canInteract`, page modifiable).
- `core/types.ts` : le commentaire « Champ d'édition de label » est au-dessus de `CommentEditRequest` au lieu de
  `LabelEditRequest`.
