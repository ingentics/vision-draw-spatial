# Icône de l'onglet « Vue graphe »

> Itération — onglets des pages (reprise de 11)

- L'icône garde sa forme (trois ronds creux reliés depuis celui de gauche, dessin redessiné plus net), mais le rond
  du milieu, d'où partent les deux liens, devient bleu (couleur d'accent, comme la page de départ dans la vue
  graphe) ; les autres restent en `currentColor`.
- **Fini quand :** l'onglet « Vue graphe » montre la nouvelle icône, lisible en 14 px, dans les deux thèmes.
- Fait : icône redessinée dans `src/app/PageTabs.tsx` (trois ronds creux, deux liens partant du rond de gauche), rond
  du milieu en `var(--accent)` via `.graph-tab-hub` (`src/app/main.css`). Vérifié à l'œil dans l'appli (onglet
  « Vue graphe » d'un fichier à deux pages) ; pas de changement de comportement.
