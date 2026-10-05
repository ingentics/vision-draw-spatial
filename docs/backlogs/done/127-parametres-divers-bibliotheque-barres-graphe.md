# Derniers réglages codés en dur : fichiers récents, barres latérales, vue graphe

> Itération — paramètres (bibliothèque, barres latérales, vue graphe, composant embarqué) ; reprise de 124

- `save.recentLimit` : nombre de fichiers récents listés par le lanceur (5 à 100, défaut 20), section Sauvegarde.
- `panels.minCanvas` : largeur minimale gardée à la zone de dessin quand on élargit une barre latérale (200 à 800 px,
  défaut 320), section Barres latérales.
- `graph.pairOffset` : écart entre les deux arcs d'un aller-retour dans la vue graphe (0 à 60 px, défaut 16),
  section Liens entre pages › Vue graphe.
- Le composant embarqué (`DrawioSpatial`) mémorise la position de consultation après `save.viewStateDelayMs` au lieu
  d'un délai fixe de 500 ms.
- Pas retenus : la taille (11) et la police (Helvetica) implicites des textes sont celles de draw.io pour un style
  sans `fontSize` / `fontFamily` ; les rendre réglables ferait diverger l'affichage de draw.io.
- **Fini quand :** chaque réglage apparaît dans les paramètres, agit aussitôt et est gardé au rechargement ;
  `make check` vert.
- Fait : `save.recentLimit`, `panels.minCanvas` et `graph.pairOffset` (défauts, bornes, relecture dans
  `settings.ts`, SPEC §13). Le lanceur passe la limite à `listRecent` (`App.tsx`) ; `Sidebar` reçoit `minCanvas`
  (`Viewer.tsx`) ; `GraphLayoutOptions.pairOffset` remplace la constante de `graph/graphPage.ts`. `DrawioSpatial`
  lit `save.viewStateDelayMs` de ses paramètres (défaut 500 ms) au lieu de sa constante. Curseurs dans Sauvegarde,
  Barres latérales et Liens entre pages › Vue graphe. Tests : défauts, aller-retour confondu à 0. Vérifié dans
  l'appli : les trois curseurs s'affichent avec leurs valeurs par défaut.
