# Moteur : simulation d'un mode (édition bloquée, mises en avant, animation)

> Milestone — mode Machine à états ; ticket du tronc (`src/engine/core/`) demandé par 462 ; modèle : courant d'un
> mode (sujet 414) et voile de la sélection (`render/veil.ts`)

- Un mode peut ouvrir une **simulation** sur une page : état de session gardé par le moteur, jamais écrit ni annulable,
  qui marche aussi sur une page en lecture seule ; fermée par le mode, par l'appli ou par Échap.
- **Édition bloquée** pendant la simulation : ni sélection modifiable, ni déplacement, ni pose depuis la palette, ni
  édition de texte, ni touches d'édition, ni ⌘Z / ⇧⌘Z ; caméra (déplacement, zoom) libre. Changer de page ou de
  fichier ferme la simulation.
- **Rendu** : le tronc reste générique, il ne sait rien de ce que le mode simule. Il pose à chaque pas ce que le mode
  décrit (`SimulationFrame`) :
  - voile sur la page (opacité réglable, défaut 0,35), avec des éléments gardés au-dessus ;
  - **couche du mode** dessinée par le mode lui-même (briques de l'API des plugins) à partir de la page dessinée
    (tracés des flèches, contours des formes, textes), rendue par-dessus tout dans une passe à part ;
  - **horloge** : la couche est rappelée à chaque image avec le temps écoulé depuis le pas (un plugin n'a pas
    d'horloge) tant qu'elle a quelque chose à animer ; rien n'est animé avec les animations réduites ;
  - **suivi caméra** : si la forme désignée par le mode sort de la vue, la caméra glisse pour la centrer (300 ms).
  - Le rendu de la machine à états (bordure et halo, cadres, teintes et compteurs, pointillés et pastilles, point qui
    parcourt la flèche franchie) est dans le mode (462).
- **Choix au clic** : un clic est rendu au mode avec l'élément visé (celui de la couche d'abord, ex. une pastille,
  sinon celui de la page), sans sélection ; le mode dit quels éléments réagissent (curseur main).
- Démonstration par un test et par 462 (le tronc n'a pas de mode à simuler seul).
- **Fini quand :** les tests du tronc couvrent ouverture / fermeture, édition refusée pendant la simulation (geste,
  touche, palette, ⌘Z), clic sur une flèche proposée rendu au mode, fermeture au changement de page ; rendu vérifié à
  l'œil avec 462 ; `make check` vert.
- Fait : tronc générique, sans rien de la machine à états. `core/modes/simulation.ts` (`SimulationFrame`,
  `SimulationLayer`, `SimulationScene`, `SimulationHandlers`), domaine `core/domains/modes/simulations.ts` (session,
  voile et éléments gardés, couche du mode portée avec le passage page → monde de la scène, horloge, suivi caméra,
  clics et touches rendus au mode, fermeture par Échap, changement de page ou de document). Passe à part pour la
  couche (`Rendering.overlay`). Édition bloquée par `EditTargets.canEditNow` (pages modifiables, annuler / rétablir),
  clic, double-clic et survol (`pointerInput.ts`), touches (`keyboard.ts`, `simulating` / `simulationKey` de l'hôte).
  Façade : `openSimulation`, `showSimulation`, `closeSimulation`, `getSimulation`, événement `simulationChange`. API
  des plugins : `edgeBadge`, `edgeBadgeDisc` (nouveau), `DEFAULT_EDGE_BADGE`, `labelPoint`, `offsetOutline`,
  `disposeObject` et les types de la simulation. Guide `AJOUTER_UN_MODE.md` complété. Tests :
  `tests/engine/core/domains/modes/simulations.test.ts` ; vérifié à l'œil avec 462.
