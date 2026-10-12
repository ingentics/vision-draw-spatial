# Calques : id inconnu, vue graphe, aplatir sans interaction ; `meta` non clonable

> Audit 542 — tronc (reprise de 523, 526, 529)

- Constats :
  - Un id de calque inconnu lève `Calque … introuvable` (`core/format/layerEdits.ts:112-114`) jusqu'à l'API publique :
    `renameLayer`, `moveLayer`, `removeLayer`, `setLayerVisible`, `setLayerLocked`, `setLayerElevation`,
    `moveSelectionToLayer` (`core/domains/document/pageLayers.ts:103-160`) ; `setCurrent` (l.62-64) l'ignore.
  - `PageLayers.edit` (l.173-174) ne garde pas la vue graphe, que `layeredPage` (l.185) exclut.
  - `LayerSpreads.setFlattened` (`core/domains/view/layerSpreads.ts:32`) sans la garde `core.canInteract()` de
    `viewModes.setFlattened` (`viewModes.ts:137`).
  - `readShapeLibrary` : `structuredClone(meta)` (`core/shapes/library/libraryFormat.ts:130`) lève `DataCloneError`
    sur un objet non clonable au lieu de rendre une erreur.
- Ce qu'on veut : opérations de calque sans effet sur un id inconnu ou en vue graphe (une seule garde dans `edit`),
  comme `setCurrent` ; `setFlattened` gardé comme son voisin ; `meta` non clonable rendu dans `errors`.
- Écart de comportement : aucun dans l'appli (l'UI ne passe que des ids existants) ; l'API ne lève plus.
- Tests : `pageLayers.test.ts` (id inconnu, vue graphe), `layerSpreads` (pendant une transition),
  `libraryFormat.test.ts` (`meta` avec une fonction).
- **Fini quand :** les cas ci-dessus sont testés ; calques inchangés à l'œil sur la fixture des calques ; `make check`
  vert.
