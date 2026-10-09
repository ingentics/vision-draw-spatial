# Séquences : flèche d'un flux sélectionnée sans voile ni contour

> Itération — mode Séquences (sélection)

- Une flèche d'un flux sélectionnée seule est mise en valeur en `none` : ni voile ni contour, ses poignées restent.
  Sélectionnée avec d'autres éléments, ou hors flux : le style de la page (paramètre `selection.style`).
- Un mode peut imposer la mise en valeur d'une flèche sélectionnée (`edges.selectionStyle(page, edge, taille de la
  sélection)`), comme une forme le fait déjà (sujet 330).
- **Fini quand :** en mode Séquences, cliquer une flèche d'un flux la sélectionne sans voile ni contour, avec ses
  poignées ; une flèche hors flux garde le voile ; `make check` vert.
- Fait : `core/modes/types.ts` — `ModeEdges.selectionStyle(page, edge, selectionSize)` ;
  `core/domains/selection/highlight.ts` — `itemStyle` demande au mode de la page le style d'une flèche sélectionnée,
  comme au registre celui d'une forme ; `engine/modes/sequences/index.ts` — `none` pour une flèche d'un flux
  sélectionnée seule. Point d'entrée ajouté au contrat de `docs/AJOUTER_UN_MODE.md`. Test `sequences.test.ts`.
  Vérifié dans l'appli (fixture `sequences.drawio`) : la flèche « login » sélectionnée n'a ni voile ni contour, ses
  poignées restent ; flèche hors flux vérifiée par le test seulement.
