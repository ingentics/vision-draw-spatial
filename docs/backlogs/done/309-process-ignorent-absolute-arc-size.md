# Process et tagged-process ignorent `absoluteArcSize`

> Dette relevée par l'audit du moteur (2026-10-07), avec le sujet 307

- L'audit signalait que l'écart des barres de process et les lignes de tagged-process recalculent l'arrondi en % de
  `arcSize`, sans `absoluteArcSize`, au lieu de passer par `cornerRadius`.
- **Fini quand :** le comportement est celui de draw.io.
- Fait : **pas un défaut**.
  - Dans le draw.io installé, `ProcessShape.paintForeground`, `getLabelBounds` et
    `InternalStorageShape.paintForeground` lisent toujours `arcSize` en % (`RECTANGLE_ROUNDING_FACTOR`) et ignorent
    `absoluteArcSize` ; seul le contour (`mxRectangleShape`) en tient compte. Notre code fait exactement cela.
  - Ajouté : un commentaire sur `DEFAULT_ARC_SIZE` dans `process/index.ts` et `tagged-process/index.ts`, pour qu'un
    prochain audit ne le reprenne pas.
  - Sujet 307 corrigé : il demandait de passer ces calculs par `cornerRadius`.
  - Aucun changement de comportement.
