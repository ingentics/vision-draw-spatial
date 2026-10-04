# Catégorie « Géométrie »

> Itération — formes (palette) ; reprise de 67

- Nouvelle catégorie de palette `geometry` (« Géométrie »), affichée en premier : rectangle, rectangle arrondi, ellipse,
  cercle et losange quittent `impl/general/` pour `impl/geometry/` (catégorie mise à jour dans leur `palette`).
  « Général » ne garde que le texte (et l'acteur, ticket 41). Ordre : Géométrie, Général, Architecture.
- Le test du registre ne fige plus la liste des dossiers (chaque nouvelle forme n'a plus à le modifier) : il vérifie
  `id` = dossier, catégorie = dossier, et la présence des formes de base.
- Tickets 33 à 40 : la catégorie existe déjà, plus rien à ajouter.
- **Fini quand :** la palette montre « Géométrie » (rectangle, arrondi, ellipse, cercle, losange) puis « Général »
  (texte) puis « Architecture » ; guide à jour ; `make check` vert.
- Fait : `rectangle`, `rounded-rectangle`, `ellipse`, `circle`, `diamond` déplacés dans `shapes/impl/geometry/`
  (catégorie `geometry` dans leur `palette`) ; `PaletteCategoryId` et `PALETTE_CATEGORIES` (« Géométrie » en tête).
  `tests/engine/shapes/registry.test.ts` ne fige plus la liste des dossiers (formes de base présentes, `id` uniques,
  `id` = dossier, catégorie = dossier) ; `palette.test.ts` vérifie l'ordre des catégories et que chaque modèle a une
  catégorie connue. Guide, SPEC §4.2 et §14.1, tickets 32 à 40 à jour. Vérifié dans l'appli : palette Géométrie /
  Général / Architecture ; `make check` vert.
