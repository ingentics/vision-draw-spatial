# Tracé au choix en ancrage automatique

> Itération — ancrage des flèches ; reprise de 443

- L'ancrage automatique permet de nouveau les quatre tracés, Arrondi par défaut (premier de la liste) : Arrondi,
  Angles droits, Courbe, Droite (`EDGE_LINES_BY_ANCHORING.auto`, `edit/anchoring/mode.ts`). Le Typon reste en Droite
  seule.
- Le tracé se choisit **pour la page** (ligne « Tracé des flèches » du panneau Page, de nouveau visible en
  automatique) ; sans valeur propre, la page prend le paramètre `shapes.edgeLineStyle` (défaut `rounded`), comme en
  manuel. La ligne « Coudes » du panneau d'une flèche reste masquée en automatique : la répartition réécrit le style
  de chaque flèche.
- Le routeur de l'automatique dépend du tracé de la page (au lieu de `ORTHOGONAL_ROUTER` figé sur l'arrondi) ;
  `Router.edgeStyle` = `EDGE_LINE_STYLES[tracé]` :
  - **Arrondi, Angles droits** : contournement orthogonal actuel inchangé (mêmes points), seul le rendu des coudes
    diffère.
  - **Courbe** : mêmes points orthogonaux, rendus en courbe (`curved=1`) ; la courbe coupe les coudes, l'écart aux
    formes (`edgeShapeClearance`) n'est donc garanti que le long des segments, pas dans les virages. Pas de sauts aux
    croisements (comme toute courbe).
  - **Droite** : pas de contournement (comme `edgeAutoRoute` coupé) : répartition sur les côtés conservée (côté face à
    l'autre forme, bouts étalés sur le côté), puis segment direct d'un bout à l'autre, sans points intermédiaires. Une
    flèche droite peut donc traverser une forme ou en croiser d'autres. Le décompte des conflits (touche F, « Autre
    agencement ») utilise des segments quelconques (`pathSegments` / `segmentsCross` / `segmentsOverlap` du Typon),
    les segments obliques étant ignorés par `segmentsOf`.
- Changer le tracé d'une page en automatique (panneau Page, ou mode posé à l'arrivée, sujet 442) réapplique la
  répartition à toutes ses flèches (style et points), comme un changement d'ancrage ; en manuel, inchangé (seules les
  flèches créées ensuite sont concernées).
- **Fini quand :** sur une page en automatique avec des formes qui s'évitent, « Tracé des flèches » est visible ;
  Angles droits puis Courbe gardent le même cheminement avec des coudes vifs puis courbes ; Droite donne des segments
  directs entre bouts répartis ; retour à Arrondi : le contournement revient ; une flèche créée prend le tracé de la
  page ; « Coudes » n'apparaît pas sur une flèche ; F fonctionne en Droite ; l'export s'ouvre dans draw.io ;
  `make check` vert.
- Fait : `EDGE_LINES_BY_ANCHORING.auto` = arrondi, angles droits, courbe, droite ; `edgeLinesOfEdge`
  (`edit/anchoring/mode.ts`) : aucun choix pour une flèche seule quand l'ancrage répartit (prop `edgeLines` du panneau,
  `ViewerContextPanel`). `orthogonalRouter(line)` (`auto/routeAround.ts`) : contournement orthogonal avec les clés du
  tracé, ou, en droite, sans contournement et conflits comptés sur des segments quelconques (`pathSegments`,
  `segmentsCross`, `segmentsOverlap` du Typon) ; `tracingOf` reçoit le tracé de la page (`EdgeArrangement.edgeLineOf`).
  `writePageArrangement` répartit toute la page quand l'ancrage ou le tracé change sur une page qui répartit. Changement
  de comportement : sans tracé propre, une page en automatique prend le paramètre `shapes.edgeLineStyle` (défaut
  arrondi). SPEC §14.1 « Tracé d'une flèche ». Tests : `edgeLine.test.ts`, `mode.test.ts`,
  `auto/anchorArrangement.test.ts`, `modes/pageModes.test.ts`. Vérifié dans l'appli sur `anchor-auto-routing.drawio` :
  « Tracé des flèches » visible, Droite redessine en segments directs, Angles droits et Courbe gardent le
  contournement. Masquage de « Coudes » et touche F en droite vérifiés par les tests seulement.
