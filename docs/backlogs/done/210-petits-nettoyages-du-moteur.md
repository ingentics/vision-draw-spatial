# Petits nettoyages du moteur

> Dette technique du moteur ; le schéma unique des réglages part en idée 245

- `Engine` / `Config` : retirer `get/setViewSettings`, `get/setControls`, `get/setTransitionSettings`,
  `get/setPreloadSettings`, doublons de `getSettings` / `updateSettings` que rien n'appelle (ni app, ni `react/`,
  ni tests). Changement cassant de l'API publique : SPEC §4.3 mise à jour.
- Un garde central `canInteract()` (pas de transition en cours) à la place des `transitions.active` répétés dans
  `core/`, et un `pages.isGraphPage()` (ou équivalent) à la place des `=== GRAPH_PAGE_ID` dispersés, dans la lignée
  de `EditTargets.editablePage` / `writablePage`.
- `core/types.ts` : le commentaire « Champ d'édition de label » remis au-dessus de `LabelEditRequest`.
- **Fini quand :** les huit méthodes ont disparu (`Engine`, `Config`, SPEC) ; `transitions.active` et
  `GRAPH_PAGE_ID` ne sont plus lus que par leur garde (et le domaine propriétaire) ; navigation, transitions et vue
  graphe inchangées dans l'appli ; `make check` vert.
- Fait : `get/setViewSettings`, `get/setControls`, `get/setTransitionSettings`, `get/setPreloadSettings` retirés
  d'`Engine` et de `Config` (SPEC §4.3 : `getSettings` / `updateSettings`). Garde `EngineCore.canInteract()` à la
  place des 26 `transitions.active` de `core/` (`Transitions.active` devenu privé, `transitions.abort()`) ;
  `graph.isGraph(id)` et `graph.invalidateWithScenes()` : `GRAPH_PAGE_ID` n'est plus lu que par `graph/graphPage.ts`
  et `core/view/graph.ts`. En plus : `targets.editablePageById(pageId)` regroupe la garde à cinq conditions répétée
  par les quatre réglages de page (mode, effet, sauts, ancrage). Commentaire de `LabelEditRequest` remis en place.
  Aucun changement de comportement. Vérifié : `make check` ; dans l'appli, changement de page, transitions et vue
  graphe (aller-retour).
