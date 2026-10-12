# Grille cachée par le mode de la page

> Itération — moteur, modes de page ; nécessaire au mode Story telling (474)

- `page.grid: false` dans la définition d'un mode : la grille du fond n'est pas dessinée sur les pages du mode, quel
  que soit le paramètre « Grille » ; absent : le paramètre décide. Rien n'est écrit dans le fichier.
- Suivi au changement de page et au passage d'une page dans le mode ou hors du mode.
- **Fini quand :** une page Story telling n'a pas de grille, une page normale la garde, passer d'une page à l'autre
  l'affiche ou la cache ; test du registre ; `make check` vert.
- Fait : `ModePage.grid` (`core/modes/types.ts`), `PageModeRegistry.showsGrid`, lu par `Rendering.gridOptions`
  (`core/domains/runtime/rendering.ts`). Doc `AJOUTER_UN_MODE.md`. Test dans
  `tests/engine/plugins/modes/storytelling.test.ts`. Vu dans l'appli : page Story telling sans grille, grille revenue en
  passant la page en « Aucun ».
