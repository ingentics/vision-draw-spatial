# RDD : champ de relation éclairé par sa flèche

> Itération — mode RDD (relations) ; reprise de 259 et 265

- Souris au-dessus d'une flèche de relation (relation entre tables ou embedded) : le champ qu'elle a créé dans la table
  d'arrivée (`edge` dans `spatial.fields`) prend la mise en valeur du survol d'un champ (fond de l'accent à 7 %, trait
  de 1 px à 50 %, sujet 259), comme si la souris était sur la ligne.
- De même quand la flèche est **sélectionnée** : son champ garde cette mise en valeur de survol (pas celle de la
  sélection, la sélection reste la flèche) tant que la flèche est sélectionnée.
- Rien sur le champ s'il est lui-même sélectionné, ni pendant un glisser ; une flèche hors du mode (ou sans champ)
  n'éclaire rien.
- **Fini quand :** sur une page RDD, en survolant la flèche User → Role, la ligne `relation1` de Role s'éclaire
  légèrement, et s'éteint quand la souris quitte la flèche ; la flèche sélectionnée, la ligne reste éclairée, et
  s'éteint à la désélection ; idem pour une relation embedded (ligne `Address`) ; `make check` vert.
- Fait : point d'extension de mode `ModeParts.edgePart(page, edge)` (`core/modes/types.ts`) : partie liée à une
  flèche. `ShapeParts` retient la flèche survolée (`hover(screen, shape, edgeId)`, appelé par
  `PointerInput.handleHover`) ; `hoveredBounds()` renvoie désormais une liste : la partie survolée, plus la partie liée
  à la flèche survolée et à chaque flèche sélectionnée (page modifiable), sans doublon ni la partie sélectionnée ;
  `SelectionHighlight.updateHover` dessine un objet de survol par emprise. RDD : `fieldParts.edgePart` (champ de la
  table d'arrivée qui retient l'id de la flèche). SPEC §14.5, `AJOUTER_UN_MODE.md`. Test
  `tests/engine/plugins/modes/rdd/editing/fieldParts.test.ts` (sujet 373). Vérifié dans l'appli (`rdd.drawio`,
  flèche Address → Role tirée puis annulée) : flèche survolée → ligne `Address` de Role éclairée, éteinte hors de la
  flèche ; flèche sélectionnée → la ligne reste éclairée sous le voile, éteinte à la désélection. Relation entre
  tables (User → Role) vérifiée par le test seulement.
