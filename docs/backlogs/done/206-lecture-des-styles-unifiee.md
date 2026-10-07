# Lecture des valeurs de style unifiée

> Dette technique du moteur (mutualisation)

- Les lectures sans Three.js (`styleNumber`, `styleFlag`, `styleOpacity`, `fontStyleBits`, `textFormat`) passent
  dans `model/styleValues.ts`, utilisables par `format/`, `edit/` et `core/` ; ce qui dépend de `three`
  (`styleColor`, `labelBackground`, `readableOn`, `PAGE_BACKGROUND`, `DEFAULT_LABEL_BACKDROP`) reste dans le rendu,
  dans `render/styleColors.ts`.
- Les `parseFloat(style.x ?? '')` et `style.x === '1'` / `!== '1'` du moteur passent par `styleNumber` /
  `styleFlag`, à comportement identique (même défaut, même cas d'une valeur absente ou illisible).
- **Fini quand :** plus aucun `parseFloat(…style…)` ni `style… === '1'` hors de `model/styleValues.ts` dans
  `src/engine`, sauf le code porté de mxGraph (`render/edges/route/`), qui garde sa forme ; rendu inchangé à l'œil
  sur les fixtures (formes, flèches, textes) ; `make check` vert.
- Fait : `model/styleValues.ts` (`styleNumber`, `styleFlag`, `styleOpacity`, `fontStyleBits`, `textFormat`) et
  `render/styleColors.ts` (`styleColor`, `labelBackground`, `readableOn`, `PAGE_BACKGROUND`,
  `DEFAULT_LABEL_BACKDROP`) remplacent `render/styleValues.ts`. Les 7 `parseFloat(style…)` et les 41
  `style… === '1'` / `!== '1'` (format, cœur, édition, rendu, formes, modes) passent par `styleNumber` /
  `styleFlag`. Restent à part, volontairement : `render/edges/route/` (porté de mxGraph, garde sa forme), les
  attributs XML (`getAttribute`) et les attributs `spatial.*` (`spatialValue`), qui ne sont pas des styles. Aucun
  écart : mêmes défauts (bout de flèche sans `exitX/Y` = flottant, lu par `styleNumber(…, NaN)` ; `strokeWidth=0`
  du voile ramené à 1 comme avant). Guides mis à jour (`AJOUTER_UNE_FORME`, `BONNES_PRATIQUES`). Vérifié :
  `make check` ; à l'œil, fixtures `shapes` et `docs/test.drawio` (coins arrondis, flèches, textes).
