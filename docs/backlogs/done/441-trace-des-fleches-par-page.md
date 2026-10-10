# Tracé des flèches par page

> Itération — panneau Page, flèches ; sur le modèle de « Croisements des flèches » (`spatial.jumps`)

- Panneau Page : ligne « Tracé des flèches » (Droite, Angles droits, Arrondi, Courbe), avec le choix « par défaut »
  qui suit le réglage `shapes.edgeLineStyle`. Écrit dans l'attribut de `<diagram>` `spatial.edgeLine` ; absent =
  réglage de l'appli. Les flèches créées sur la page (connecteur tiré d'une forme, flèche libre de la palette)
  prennent ce tracé.
- Chaque ancrage déclare les tracés qu'il permet : manuel et automatique, les quatre ; Typon, un seul (Droite : il
  trace lui-même ses pistes à 45°, sans `rounded` ni `curved`). Les flèches créées prennent le tracé voulu s'il est
  permis, sinon le premier permis. Au passage d'une page en Typon (et à chaque tracé Typon), ses flèches perdent
  `rounded` et `curved`, comme elles perdaient déjà `edgeStyle`.
- Un seul tracé permis : la ligne « Tracé des flèches » de la page et la ligne « Coudes » d'une flèche sont
  masquées ; sinon elles ne proposent que les tracés permis.
- **Fini quand :** sur une page en ancrage manuel, choisir « Courbe » dans le panneau Page fait créer des flèches
  courbes, « par défaut » revient au réglage ; en Typon, la ligne n'apparaît pas (ni « Coudes » sur une flèche) et
  les flèches créées sont droites, une flèche courbe existante devient une piste à angles vifs ; `make check` vert.
- Fait : `EdgeLine`, `EDGE_LINES` et `edgeLinesOf(anchoring)` dans `edit/anchoring/mode.ts` (Typon : `straight`
  seul) ; attribut `SPATIAL.edgeLine` ; `EdgeArrangement.edgeLineOf(page)` (celui de la page, sinon le réglage, s'il
  est permis, sinon le premier permis) et `setPageEdgeLine`, exposé par `Engine.setPageEdgeLine` ; le connecteur
  (`drag/connect.ts`) et la flèche libre de la palette (`commands/elements.ts`) prennent ce tracé. Panneau Page
  (`PageSections.tsx`) : ligne « Tracé des flèches » avec « Défaut », masquée s'il n'y a qu'un tracé permis ; même
  filtre sur « Coudes » (`EdgeLineSections.tsx`). `straightStyle` retire aussi `rounded` et `curved`
  (`STRAIGHT_REMOVED_KEYS`) : changement de comportement, une flèche arrondie ou courbe passée en Typon devient une
  piste à angles vifs. Tests : `domains/edit/edges/edgeLine.test.ts`, `anchoring/pcb/octilinear.test.ts`. Vérifié
  dans l'appli sur `simple.drawio` : « Courbe » sur la page fait créer des flèches courbes ; en Typon, ligne et
  « Coudes » masqués, flèches créées en pistes à angles vifs, une flèche courbe existante redevient vive.
