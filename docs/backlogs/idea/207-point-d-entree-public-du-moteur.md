# Point d'entrée public du moteur

> Idée — dette technique du moteur (API) ; prépare 208

- `src/index.ts` annonce que le reste est interne, mais `app/` et `react/` importent 41 chemins internes du moteur :
  `engine/settings` (21 fois), `engine/model/types`, `engine/spatial`, `engine/persistence/*`, `engine/edit/*`
  (`comment`, `styles`, `palette`, `labelPosition`, `edgeLabels`, `align`, `anchoring/mode`, `autosave`),
  `engine/interaction/*` (`camera`, `history`, `controls`, `selection`), `engine/modes/*` (`registry`, `types`,
  `sequences/export`, `sequences/steps`, `sequences/flows`), `engine/render/*` (`edges/jumps`, `edges/route`,
  `styleValues`, `richLayout`, `geometry/homography`…), `engine/format/*`, `engine/diagnostics/unsupportedStyles`.
- Un `engine/index.ts` (ou quelques points d'entrée publics : moteur, modèle, paramètres, stockage) que l'app et
  `react/` utilisent seuls : les déplacements de fichiers internes ne les touchent plus.
