# La forêt ignore les réglages d'ombrage des volumes

> Dette relevée par l'audit du moteur (2026-10-07), avec le sujet 307

- La forêt avait son propre éclairage (`plugins/effects/forest/trees.ts`) : elle ignorait les réglages « Luminosité
  des côtés » (`view.shadeLight`, `view.shadeDark`), et sa lumière venait du côté opposé à celle des volumes des
  formes (haut-gauche de la page au lieu du bas-droite).
- **Fini quand :** la forêt est ombrée comme les volumes des formes et suit les réglages d'ombrage.
- Fait :
  - Tronc : `facetShade(normal, shadeLight, shadeDark)` (`core/render/iso/block.ts`), luminosité d'une facette :
    1 tournée vers le haut (comme le dessus d'un bloc), de `shadeDark` à `shadeLight` à la verticale selon la
    lumière des volumes, entre les deux pour une pente. Les côtés des blocs l'utilisent (même résultat qu'avant).
  - Contrat des effets : `volume(page, room, values, light)` reçoit `light: EffectLight` (`shade(normal)`), construit
    par le registre d'après les réglages (`decorate({ shading })`, passé par la scène) ; `EffectLight` est exporté par
    l'API des plugins.
  - Forêt : ses facettes sont ombrées par `light.shade` ; sa lumière propre est retirée.
  - Écart visible voulu : la forêt est éclairée du même côté que les bâtiments, et ses facettes ne dépassent plus la
    couleur pleine (avant : de 0,55 à 1,15 ; maintenant, avec les réglages par défaut : de 0,62 à 1).
  - Tests : `facetShade` (`tests/engine/core/render/volume.test.ts`) ; forêt plus sombre ou plus claire selon les
    réglages (`tests/engine/plugins/effects/forest.test.ts`).
  - Vérifié à l'œil dans l'appli, en iso sur `tests/fixtures/cylinder-flips.drawio` : arbres et façades éclairés du
    même côté.
