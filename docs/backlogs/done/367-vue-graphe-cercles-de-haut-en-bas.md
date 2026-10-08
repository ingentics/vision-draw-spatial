# Vue graphe : nœuds en cercle, nom dessous, disposition de haut en bas

> Itération — vue graphe (SPEC §12), reprise de 362 « nœuds sans miniature » ; touche aussi le mini-graphe (366)

- **Nœud = cercle** (forme `ellipse`) de diamètre fixe, nouveau paramètre `graph.nodeSize` (**64** par défaut, 24–200,
  pas 4), qui remplace `graph.cardWidth`. Fond blanc, contour 2 px selon le statut, comme aujourd'hui : départ =
  couleur d'accent, inaccessible = orange pointillé, orpheline = rouge pointillé, sinon gris.
- **Nom de la page sous le cercle**, centré : forme texte séparée (`graph-name:<pageId>`), 6 px sous le cercle, largeur
  fixe 160 (constante `LABEL_WIDTH`), gras 15, couleur `graph.titleColor`, renvoi à la ligne (deux lignes réservées,
  hauteur 40), posé au-dessus des flèches sur le fond de la vue (une flèche qui descend du cercle passe sous le nom).
  Plus rien dans le cercle. Le **statut** (« départ », « inaccessible », « orpheline ») reste en petit
  au-dessus du cercle, dans sa couleur, mais centré.
- **Disposition de haut en bas** (aujourd'hui de gauche à droite) : une **rangée** par distance depuis la page de
  départ (départ en haut), puis une rangée pour les inaccessibles, puis une pour les orphelines. Ordre du document de
  gauche à droite dans chaque rangée, rangées centrées horizontalement. Écarts : `graph.columnGap` / `graph.rowGap`
  remplacés par `graph.nodeGap` (entre deux voisins d'une rangée, de bord de nom à bord de nom : **40**, 0–400) et
  `graph.layerGap` (entre deux rangées, du bas des noms au haut des statuts : **80**, 20–600). Les anciennes clés
  sauvegardées sont ignorées.
- **Flèches** de bord de cercle à bord de cercle (périmètre d'ellipse), aller-retour toujours décalé de
  `graph.pairOffset`.
- **Le nom fait partie du nœud** : survol, sélection, clic et double-clic sur le nom agissent comme sur le cercle
  (même lien de page).
- **Transitions** inchangées dans leur principe : la page apparaît en fondu dans le carré englobant le cercle puis
  prend l'écran ; au retour elle rétrécit dans ce carré.
- **Durée propre aux transitions vue graphe ↔ page** : nouveau paramètre `graph.transitionMs` (**50 ms** par défaut,
  0–5000, pas 10), dans les deux sens (plongée depuis un nœud, Retour, onglet « Vue graphe », raccourci). Les
  transitions entre pages du document gardent `transition.durationMs`. À 0 : passage direct, sans animation.
- **Mini-graphe** : même disposition (de haut en bas), nœuds en **disques pleins** (page courante en bleu, autres en
  gris), flèches de bord de disque à bord de disque ; toujours sans nom ni statut.
- **Paramètres › Vue graphe** mis à jour : « Diamètre des nœuds », « Écart entre les nœuds d'une rangée », « Écart
  entre les rangées », « Durée de la transition graphe ↔ page », « Contour des nœuds » (clé `graph.cardColor`
  inchangée) ; aperçu `GraphPreview` redessiné (cercles, nom dessous, de haut en bas) ; SPEC §10 (mini-graphe), §12
  et §13 (`graph`) mises à jour.
- **Fini quand :** dans l'appli, sur `tests/fixtures/parents.drawio` et `parent-pages.drawio`, la vue graphe montre
  des cercles de même taille avec le nom de la page dessous, la page de départ en haut et les rangées qui descendent ;
  double-clic sur un cercle ou sur son nom plonge dans la page et Retour revient sans saut, en 50 ms ; le mini-graphe
  montre la même disposition en disques. Tests : disposition par rangées (y croissant avec la distance, inaccessibles puis
  orphelines en dessous), cercles de diamètre `nodeSize`, nom sous chaque cercle.
- Fait : `graph/graphPage.ts` : nœud = forme `ellipse` (`perimeter=ellipsePerimeter`) de diamètre `graph.nodeSize`,
  nom dans une forme texte `graph-name:<pageId>` sous le cercle (constantes `LABEL_GAP`, `LABEL_WIDTH`,
  `LABEL_HEIGHT`), posée après les flèches avec `labelBackgroundColor=default` (ajout au ticket : une flèche qui
  descend d'un nœud traversait son nom) ; statut centré ; disposition en rangées de haut en bas (`nodeGap`,
  `layerGap`). `navigation/transition.ts` : durée `graph.transitionMs` quand la vue graphe est la page extérieure
  (toujours le cas quand elle est en jeu). `graph/miniGraph.ts` et `react/MiniGraphView.tsx` : disques, flèches de bord
  de disque à bord de disque. Paramètres (`settings/types.ts`, `schema/view.ts`, `SettingsPanel.tsx`) et
  `GraphPreview` (cercles, noms sur halo, aperçu plus haut) ; SPEC §10, §12, §13. Tests : `graph.test.ts` (rangées,
  ordre et centrage dans une rangée, cercles, nom sous le cercle), `miniGraph.test.ts` (flèches au bord des disques),
  `settings.test.ts`. Vu dans l'appli sur `parent-pages.drawio` : cercles et noms, départ en haut, double-clic sur un
  nom qui plonge dans la page, retour par l'onglet, mini-graphe en disques, panneau et aperçu des réglages.
