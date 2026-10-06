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
