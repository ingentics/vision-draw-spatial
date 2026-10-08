# Vue graphe : plus de raccourci clavier par défaut

> Itération — raccourcis clavier (SPEC §9.2), vue graphe (SPEC §12)

- La touche G n'ouvre plus la vue graphe : le raccourci « Vue graphe ↔ dernière page » n'a **aucune touche par
  défaut**. Il reste attribuable dans Paramètres › Raccourcis, où il s'affiche « Aucune » tant qu'il n'est pas
  attribué.
- Les infobulles de l'onglet « Vue graphe » et du bouton « Vue graphe » du mode navigation ne mentionnent plus la
  touche G.
- **Fini quand :** G ne fait plus rien ; l'onglet « Vue graphe » ouvre toujours le graphe ; une touche attribuée dans
  les paramètres bascule graphe ↔ dernière page.
- Fait : `toggleGraph` vaut `''` par défaut (`controls/shortcuts.ts`) ; le champ `code` (`settings/fields.ts`)
  accepte une chaîne vide seulement pour un raccourci dont le défaut est vide ; « Aucune » affiché dans le panneau
  (`keyLabel`). Infobulles de l'onglet et du bouton du mode navigation sans « (touche G) ». SPEC §9.2, §12 et §13.
  Tests (`settings.test.ts`) : G sans action par défaut, seul ce raccourci peut être vide. Non vérifié à l'œil : les
  paramètres enregistrés dans le navigateur gardent `toggleGraph: "g"` (dette 364).
