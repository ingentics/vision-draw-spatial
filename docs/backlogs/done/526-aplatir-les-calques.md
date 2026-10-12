# Aplatir et étendre les calques

> Itération — calques (reprise de 524, 525)

- Section « Calques », en vue iso ou 3D : un bouton bascule **« Aplatir »** / **« Étendre »**. Aplatir ramène
  l'élévation de tous les calques de la page à 0 **en animation** (durée de la bascule 2D ↔ iso,
  `view.switchDurationMs`, courbe ease-in-out ; immédiat si les animations sont réduites) ; Étendre les remonte à
  leur élévation. Les élévations propres des formes (`spatial.elevation` d'une forme) ne changent pas.
- État de session par page (comme le calque courant) : rien n'est écrit dans le fichier, oublié au chargement.
  Les champs d'élévation restent modifiables ; aplati, un changement ne se voit qu'en étendant.
- Plans des calques (525) : ils descendent avec leur calque et disparaissent une fois aplatis.
- Bouton désactivé si aucun calque n'est élevé ; marche aussi en lecture seule (rien n'est écrit).
- **Fini quand :** en iso sur `fixtures/layers.drawio`, avec un calque à 80, « Aplatir » fait descendre son contenu
  et son plan jusqu'au sol en animation, le bouton devient « Étendre », qui les remonte ; clic et sélection marchent
  à l'arrivée dans les deux états.
- Fait : domaine `domains/view/layerSpreads.ts` (état par page, animation rAF, scène reconstruite à l'arrivée),
  `buildPageScene(…, layerSpread)` et `userData.layerLift`, `spreadLayers` (`render/layerPlanes.ts`), façade
  `Engine.setLayersFlattened`, bouton dans `LayersSection.tsx` ; courbe `easeInOutCubic` (`model/numbers.ts`)
  partagée avec la caméra (sans changement). Écart : l'événement `layerChange` n'envoie plus que l'id de la page.
  Tests : `layerSpreads`, `layerPlanes`, `spatial`, `numbers`. Vérifié à l'œil en iso (aplatir, image
  intermédiaire, étendre, clic sur la forme élevée à l'arrivée).
