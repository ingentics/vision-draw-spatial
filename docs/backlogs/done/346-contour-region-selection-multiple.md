# RDD : contour d'une région dans une sélection multiple

> Itération — mode RDD (région) ; reprise de 330

- Une région seule sélectionnée n'a ni contour ni voile (poignées seules) ; dès que la sélection compte plusieurs
  éléments, la région est cerclée du contour de sélection.
- Un seul réglage de plus sur la définition de forme (`multiSelectionStyle`), que seule la région RDD renseigne.
- **Fini quand :** une région seule : pas de contour ; région + une autre forme : contour sur la région ; `make check` vert.
- Fait : `multiSelectionStyle` ajouté à `ShapeDefinition` (`core/shapes/types.ts`) ; `ShapeRegistry.selectionStyle(shape, selectionSize)`
  le renvoie quand la sélection compte plusieurs éléments (`core/shapes/registry.ts`), `SelectionHighlight.itemStyle`
  passe la taille de la sélection (`core/domains/selection/highlight.ts`). La région RDD le met à `outline`
  (`region/index.ts`). Test dans `region.test.ts`. Seule la région RDD change de comportement ; `make check` vert.
