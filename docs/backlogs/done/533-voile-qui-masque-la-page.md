# Voile qui masque la page

> Itération — moteur, prise en main de la page par un mode (sujet 467) ; nécessaire au sujet 534

- `PageOverlay.veil.hide` : voile opaque de la couleur du fond de l'appli (`background.color`) au lieu du voile
  sombre ; seuls les éléments gardés (`kept`) restent visibles, grille comprise masquée. `opacity` est alors ignorée.
- Rien ne change pour un voile sans `hide` (simulation de la Machine à états).
- `PageTakeover.setModeCurrent(value, pageId?)` : le mode choisit son courant pendant une prise en main (ex. histoire
  jouée par la simulation, sujet 534) ; le moteur l'a déjà (`Engine.setModeCurrent`), seul le contrat s'élargit.
- **Fini quand :** une couche posée avec `veil: { hide: true, kept }` ne laisse voir que les éléments gardés, sur le fond
  uni ; test de l'hôte des couches ; `make check` vert.
- Fait : `PageOverlay.veil.hide` (`core/modes/pageTakeover.ts`) : voile opaque de `background.color`, posé par
  `PageOverlays.veilOf` (`core/domains/runtime/pageOverlays.ts`) ; `PageTakeover.setModeCurrent` ajouté au contrat (le
  moteur l'avait déjà). Doc `AJOUTER_UN_MODE.md`. Test `tests/engine/core/domains/runtime/pageOverlays.test.ts`. Vu
  dans l'appli par la simulation des histoires (534) : fond uni, seuls les éléments montrés restent.
