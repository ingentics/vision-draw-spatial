# Ancrage « Typon » : flèches tracées comme des pistes de circuit imprimé

> Itération — flèches (ancrage) ; reprise de 114, 116 et 120. Troisième type d'ancrage, à côté de Manuel et
> Automatique.

- Nouvelle valeur du réglage « Ancrage des flèches » (`shapes.edgeAnchoring`) et de l'attribut de page
  `spatial.anchoring` : **`pcb`**, libellé **Typon**.
- Comme l'automatique : on ne vise que le côté, les flèches d'un côté y sont réparties, recalcul après chaque édition,
  touche F = autre agencement (graine).
- Le tracé est **octilinéaire** (segments à 0°, 45° et 90°, diagonales aussi longues que le chemin le permet), cherché
  par le routeur lui-même (plus court chemin sur une grille au pas de l'écart entre flèches, 8 directions), premier et
  dernier segments perpendiculaires aux côtés ; il contourne les formes et évite de longer ou croiser les autres
  flèches (mêmes réglages que l'automatique). Inspiration seulement : sans chemin, la flèche est tracée quand même
  (octilinéaire, collisions acceptées). « Contourner » décoché : tracé octilinéaire direct, sans évitement.
- Écrit en points intermédiaires avec un tracé droit (`edgeStyle` retiré), pour que draw.io dessine les mêmes
  diagonales.
- Code rangé par type d'ancrage : `src/engine/edit/anchoring/manual/` (variantes), `auto/` (répartition,
  agencement, graine, tracé orthogonal), `pcb/` (tracé octilinéaire), type `Anchoring` dans `anchoring/mode.ts` ;
  tests rangés de même. Fait d'abord dans un commit `refactor` à part.
- **Fini quand :** une page en Typon trace ses flèches en segments à 0/45/90°, en contournant une forme placée entre
  deux autres ; F propose un autre agencement ; le fichier rouvert dans draw.io montre les mêmes diagonales ;
  `make check` vert.
- Fait : `src/engine/edit/anchoring/mode.ts` (`Anchoring` = `manual | auto | pcb`, `isAnchoring`, `distributes`),
  `src/engine/edit/anchoring/pcb/octilinear.ts` (routeur octilinéaire), `auto/avoid.ts` (interface `Router`, routeur
  orthogonal `ORTHOGONAL_ROUTER`), `auto/arrange.ts` (routeur choisi, `straightStyle`),
  `core/edit/edges/arrangement.ts` (tracé selon l'ancrage de la page, `edgeStyle` retiré en Typon), appelants passés
  à `distributes(page)` (`connect.ts`, `gesture.ts`, `preview.ts`, `anchors.ts`), réglage et panneau Page (`Typon`),
  `docs/SPEC.md`, `tests/engine/edit/anchoring/pcb/octilinear.test.ts`. Le rangement par type (`manual/`, `auto/`) a
  fait l'objet du commit `refactor` précédent. Vérifié dans l'appli (`anchor-auto-routing.drawio`, page passée en
  Typon) : flèches tracées en segments à 0/45/90° qui contournent les formes, et retracées quand on déplace une
  forme ; `make check` vert. Pas revérifié dans draw.io (`make drawio-check` non lancé).
