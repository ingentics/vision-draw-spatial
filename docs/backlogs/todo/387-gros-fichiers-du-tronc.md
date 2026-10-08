# Gros fichiers et longues fonctions du tronc : découper par sujet

> Architecture du moteur — lisibilité (`coding.md` §6, ~400 lignes). Audit du 2026-10-08 (`AUDIT.md`). Priorité basse.

- `core/interaction/cameraMath.ts` (628 lignes, 28 importeurs) : état et bornes (`4-160`), cadrage (`164-327`),
  application à une caméra Three.js (`357-437`), projection (`441-515`), mouvements (`524-628`) → `cameraState.ts`,
  `cameraFraming.ts`, `cameraProjection.ts`, `cameraMoves.ts` (noms à vérifier) ; la conversion réglages → bornes de
  `domains/view/camera.ts:40-56` devient la fonction pure `cameraLimitsOf`.
- `core/format/parse.ts` : `parseGraphModel` (`176-362`, huit fermetures) → un index des cellules (calques, emprises
  absolues) extrait ; sortie identique.
- `core/graph/graphPage.ts` : `buildGraphPage` (`110-235`) découpée (nœuds, liens, cadrage).
- `core/render/edges/edge.ts` : `createEdge` (`41-148`) ; `core/render/troikaText.ts:75` (fabrique de 206 lignes).
- Écart : aucun ; tests intacts sauf imports.
- **Fini quand :** plus aucune fonction du tronc > ~80 lignes hors code porté ; vues, transitions, mini-carte et vue
  graphe identiques à l'œil ; `make check` vert.
