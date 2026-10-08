# Mini-graphe

> Itération — navigation entre pages (reprise de 08 « Mini-carte »), vue graphe (SPEC §12)

- **Un encart « mini-graphe »** en bas à droite, juste à gauche de la mini-carte (même ligne de base, même écart de
  12 px entre les deux), construit sur le modèle de la mini-carte : même cadre, même taille (paramètre
  `minimap.size`), bouton × pour le masquer et, une fois masqué, bouton « Mini-graphe » pour le rouvrir.
- **Fermé par défaut** : nouveau paramètre `minigraph.visible` (`false` par défaut), choix mémorisé comme pour la
  mini-carte.
- **Contenu** : le graphe des pages, avec la même disposition que la vue graphe (nœuds, flèches des liens), cadré pour
  tenir entier dans l'encart. Sur le thème de l'icône de l'onglet « Vue graphe » : le nœud de **la page courante en
  bleu** (couleur d'accent), tous les autres nœuds et les flèches **en gris**. Pas de noms de pages ni de statuts
  (trop petit). Il suit la page courante : changer de page déplace la mise en évidence.
- **Lecture seule** : pas de clic ni de glisser dans le mini-graphe (une navigation par clic pourra faire l'objet
  d'un autre sujet).
- **Raccourci** « Afficher / masquer le mini-graphe », touche **G** par défaut (libre depuis 365), attribuable dans
  Paramètres › Raccourcis comme celui de la mini-carte (M). Infobulles : « Masquer le mini-graphe (G) » /
  « Afficher le mini-graphe (G) ».
- **En vue graphe**, le mini-graphe n'est pas affiché (le bouton de réouverture non plus) : il ferait doublon.
- SPEC mise à jour (mini-carte §10, raccourcis §9.2, vue graphe §12).
- **Fini quand :** dans l'appli, sur `fixtures/parent-pages.drawio`, le mini-graphe est fermé à l'ouverture ; G (ou
  le bouton « Mini-graphe ») l'ouvre à gauche de la mini-carte, la page courante en bleu et le reste en gris ;
  changer de page déplace le bleu ; G ou × le referme et le choix survit au rechargement ; en vue graphe il n'apparaît
  pas.
- Fait : `graph/miniGraph.ts` (pur) ramène la disposition de la vue graphe (`layoutGraph`, mise en cache avec la page
  graphe dans `domains/view/graph.ts`) à l'encart, avec le cadrage de la mini-carte (`minimapLayout`) ; flèches de
  bord à bord (`rectExitPoint`, ajouté à `model/geometry.ts`) ; exposé par `Engine.getMiniGraph(size)`. Encart SVG
  `react/MiniGraphView.tsx` : nœuds pleins, page courante en couleur d'accent, autres nœuds en `minimap.outlineColor`,
  flèches en `minimap.edgeColor` ; mis à jour au chargement, au changement de page, de document et de paramètres.
  `DrawioSpatial` : conteneur `drawio-corner` (mini-graphe puis mini-carte, alignés en bas, 12 px d'écart), props
  `minigraph` / `onMinigraphToggle` ; paramètre `minigraph.visible` (faux par défaut), case dans la section
  Mini-carte des paramètres ; raccourci `toggleMinigraph` (G), événement `minigraphToggle`. SPEC §9.2, §10, §13 et
  `docs/COMPOSANT.md` (qui disait encore « G (vue graphe) ») à jour. Écart : un aller-retour donne deux flèches
  superposées (pas de décalage à cette taille). Tests : `graph/miniGraph.test.ts`, `geometry.test.ts`,
  `settings.test.ts`. Vu dans l'appli sur `fixtures/parent-pages.drawio` : fermé à l'ouverture, G l'ouvre, le bleu
  suit la page courante, choix gardé au rechargement, absent en vue graphe. Des réglages enregistrés avec
  `toggleGraph: "g"` (dette 364) font ouvrir la vue graphe par G : vider ce raccourci dans les paramètres.
