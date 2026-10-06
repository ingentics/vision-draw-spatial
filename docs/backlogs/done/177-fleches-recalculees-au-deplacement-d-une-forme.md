# Flèches recalculées au déplacement d'une forme

> Itération — flèches (ancrage) ; reprise de 175

- Quand on déplace une forme reliée par des flèches, leur tracé est recalculé selon l'ancrage de la page :
  - **Automatique** et **Typon** (`distributes(anchoring)`) : côtés, répartition sur les côtés et tracé (contournement,
    octilinéaire en Typon) sont recalculés pour toutes les flèches de la forme déplacée, avec la graine courante.
  - **Manuel** : rien ne change, les flèches gardent leurs points d'attache et leurs points intermédiaires.
- Pendant le glisser, l'aperçu montre déjà le tracé recalculé ; au lâcher, le recalcul est écrit dans le fichier
  (une seule entrée d'annulation avec le déplacement).
- Vaut aussi pour un déplacement au clavier (flèches du clavier) et pour une sélection de plusieurs formes.
- **Fini quand :** sur une page en Automatique puis en Typon, en déplaçant une forme reliée de l'autre côté de sa
  voisine, ses flèches changent de côté et contournent les formes ; en Manuel, elles gardent leurs attaches ;
  ⌘Z annule déplacement et recalcul d'un coup ; `make check` vert.
- Fait : le lâcher recalculait déjà la répartition, mais sans changer de côté et sans aperçu. `distribute.ts`
  (`resitedEnds` : un bout change de côté quand le côté qui fait face à l'autre forme a changé, un côté choisi qui ne
  fait pas face reste lors d'un petit déplacement ; `distributeAnchors` prend ces bouts), `arrange.ts` (option
  `resite`), `core/edit/edges/arrangement.ts` (`writeDistribution` replace les bouts d'après `file.geometry` ;
  `previewDistribution` : aperçu dans le modèle seul ; sans chemin trouvé, une flèche entre deux formes perd ses
  anciens points au lieu de les garder), `core/edit/drag/move.ts` (aperçu à chaque pas, modèle relu si la forme
  revient à sa place), `docs/SPEC.md`, `tests/engine/edit/anchoring/auto/distribute.test.ts`. Le clavier et la
  sélection multiple passent par le même chemin (`endMove`). Vérifié dans l'appli (`anchor-auto-routing.drawio`,
  « B à gauche de A ») : en Automatique puis en Typon, A déplacée à gauche de B la relie par son côté droit à la
  gauche de B ; ⌘Z annule déplacement et recalcul d'un coup ; environ 5 ms de recalcul par pas de glisser ;
  `make check` vert sur mes fichiers.
