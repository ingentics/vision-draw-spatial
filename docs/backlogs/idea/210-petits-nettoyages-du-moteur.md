# Petits nettoyages du moteur

> Idée — dette technique du moteur

- Paramètres : ajouter un réglage touche toujours quatre fichiers (`settings/types`, `defaults`, `limits`,
  `merge/*`, ce dernier découpé en `view`, `shapes`, `navigation`, `workspace`) ; piste d'un schéma unique par
  réglage (défaut, bornes, type).
- `Engine` / `Config` : `get/setViewSettings`, `get/setControls`, `get/setTransitionSettings`,
  `get/setPreloadSettings` doublonnent `updateSettings` et ne servent plus nulle part (ni app, ni `react/`, ni
  tests) ; à retirer (changement cassant de l'API publique ; `setControls` figure encore en SPEC §4.3).
- `GRAPH_PAGE_ID` testé dans 10 fichiers de `core/`, `transitions.active` 29 fois dans `core/` : un garde central
  (`canInteract`), dans la lignée de `EditTargets.editablePage` / `writablePage` qui couvrent déjà « page
  modifiable ».
- `core/types.ts` : le commentaire « Champ d'édition de label » est au-dessus de `CommentEditRequest` au lieu de
  `LabelEditRequest`.
