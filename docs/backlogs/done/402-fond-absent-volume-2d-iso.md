# Fond « sans volume » lu d'une seule façon

> Itération — rendu iso (`render/pageScene.ts`) ; dette vue au sujet 388

- `volumeLayout` (`render/pageScene.ts`) teste `fillColor === 'none'` brut, alors que le rendu iso (`isoBlock`,
  `generic/building`) lit le fond par `styleColor` (`none` avec espaces, `default`, défaut de la forme). Une forme
  `fillColor= none` aurait une hauteur d'empilement sans volume dessiné.
- `volumeLayout` lit le fond par la même règle (`styleColorValue`, défaut des formes `VERTEX_DEFAULTS.fill`) : pas de
  fond = pas de hauteur. Reste hors d'atteinte une forme iso dont le défaut de fond est nul (aucune aujourd'hui : le
  registre ne connaît pas les défauts des formes).
- **Fini quand :** en iso, une forme `fillColor= none` contenant une autre forme : la forme contenue est posée au sol,
  comme avec `fillColor=none` ; testé ; `make check` vert.
- Fait : `volumeLayout` (`render/pageScene.ts`) lit le fond par `styleColorValue(style, 'fillColor',
  VERTEX_DEFAULTS.fill)`. Changement : `fillColor` à `none` entouré d'espaces ne donne plus de hauteur d'empilement.
  Test dans `volume.test.ts` ; fixture `tests/fixtures/volume-no-fill.drawio`, vérifiée à l'œil en iso (`none` et ` none
  ` : forme contenue au sol ; fond jaune : empilée).
