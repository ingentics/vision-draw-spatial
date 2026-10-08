# Vue graphe : des nœuds à la place des miniatures de pages

> Itération — vue graphe (SPEC §12). Premier pas vers une vue graphe qui tient un très grand nombre de pages : son
> coût ne doit dépendre que du nombre de pages et de liens, jamais du contenu des pages.

- **Plus de miniature** : `graph/graphScene.ts` ne construit plus la scène des pages du document dans les cartes. La
  scène du graphe ne contient que la page générée (nœuds, libellés, flèches).
- **Nœud de taille fixe**, indépendant des dimensions de la page : la disposition n'utilise plus que l'id, le nom, le
  rang et les liens des pages (plus `page.bounds`). Largeur = paramètre `graph.cardWidth` (260 par défaut), hauteur
  fixe 56. Rectangle arrondi (`arcSize` 12 absolu), fond blanc, contour 2 px selon le statut, comme aujourd'hui :
  départ = couleur d'accent, inaccessible = orange pointillé, orpheline = rouge pointillé, sinon gris.
- **Nom de la page centré dans le nœud** (gras, 15, renvoi à la ligne : deux lignes tiennent dans le nœud). Le statut (« départ »,
  « inaccessible », « orpheline ») reste en petit au-dessus du nœud, dans sa couleur ; rien pour une page ordinaire.
- **Transitions** inchangées dans leur principe : double-clic sur un nœud = plongée (zoom sur le nœud, la page
  apparaît en fondu dans le nœud puis prend l'écran) ; Retour, onglet « Vue graphe » et touche G = la page rétrécit
  dans son nœud. Seule la page de départ/d'arrivée de la transition est construite, pendant la transition.
- Aperçu du paramètre dans le panneau de réglages (`GraphPreview`) mis à jour ; SPEC §12 réécrite (« Réalisation
  retenue »).
- **Fini quand :** sur une fixture à plusieurs pages, la vue graphe montre des nœuds de même taille portant le nom de
  leur page, sans miniature ; double-clic sur un nœud plonge dans la page et Retour revient au graphe sans saut ; un
  test vérifie que la scène du graphe ne construit aucune page du document.
- Fait : `graph/graphScene.ts` supprimé, la vue graphe est construite comme une page ordinaire (`domains/view/scene.ts`)
  et ne dessine plus rien des pages du document. `graph/graphPage.ts` : nœud de taille fixe (`graph.cardWidth` ×
  `NODE_HEIGHT` 56), fond blanc, nom centré en gras 15 avec renvoi à la ligne (écart au ticket : pas de troncature,
  le moteur n'en a pas de générique pour les libellés ; deux lignes tiennent, un nom très long déborde) ; statut en 12
  au-dessus (`graph-status:…`, remplace `graph-title:…`), rien pour une page ordinaire. La disposition ne lit plus
  `page.bounds`. Transitions inchangées (la page apparaît en fondu dans le nœud). Partenaire de mise en valeur
  `highlightWith` retiré de `selection/highlight.ts` (ne servait qu'aux miniatures). `GraphPreview` et libellés du
  panneau (« nœuds », « Noms des pages ») mis à jour, clés des réglages inchangées ; SPEC §12 réécrite. Tests
  (`graph.test.ts`) : nœuds de même taille, statuts, scène sans élément des pages du document. Vu dans l'appli sur
  `fixtures/parents.drawio` : nœuds, statuts, flèches, plongée dans « Détail » et retour au graphe.
