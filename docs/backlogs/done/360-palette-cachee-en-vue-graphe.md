# Palette de formes cachée en vue graphe

> Itération — panneaux latéraux

- En vue graphe, le panneau gauche « Formes » (palette) n'est plus affiché, comme le panneau droit déjà caché : la
  zone de dessin prend toute la largeur. Il revient en quittant la vue graphe, avec sa largeur et son état replié.
- **Fini quand :** dans l'appli, ouvrir la vue graphe cache les deux panneaux latéraux ; revenir sur une page les
  réaffiche.
- Fait : dans `src/app/Viewer.tsx`, la barre gauche « Formes » n'est rendue que hors de la vue graphe
  (`pageId !== GRAPH_PAGE_ID`), comme la barre droite ; sa largeur et son état replié restent dans les réglages.
  Vérifié à l'œil dans l'appli (`fixtures/parent-pages.drawio`) : la vue graphe cache les deux barres, revenir sur
  une page réaffiche la palette.
