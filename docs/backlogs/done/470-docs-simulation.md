# Docs : simulation des états, briques ouvertes à un mode

> Audit 464 — docs (reprise de 460 à 463) ; en dernier, après 465 à 469

- Constats :
  - `SPEC.md` ne parle pas de la simulation.
  - `SUMMARY.md` ne cite ni la simulation ni ses fichiers.
  - L'arbre de `AJOUTER_UN_MODE.md:29` montre `panel = { PageSection }`.
  - Le guide décrit une « simulation » du tronc, qui disparaît avec 467.
- Ce qu'on veut :
  - SPEC, section Machine à états :
    - lancement : panneau, barre, départ selon la sélection ;
    - touches : 1 à 9, ← / Retour arrière, Échap ;
    - fins et leurs couleurs, trace, édition bloquée, caméra libre.

    Section clavier : touches capturées par un mode.
  - SUMMARY : carte (briques du tronc, `states/simulation/`) et « Où regarder ».
  - Guide d'un mode : une section « Prendre la main sur la page », qui couvre :
    - le verrou d'édition ;
    - la capture des entrées (une touche non prise rend faux) ;
    - la couche par-dessus et le coût d'une couche toujours animée ;
    - le voile et les éléments gardés ;
    - `keepInView` ;
    - la poignée passée à `CanvasOverlay` ;
    - le focus gardé sur la zone de dessin.

    La simulation des états y sert d'exemple, et l'arbre est corrigé.
- Écart de comportement : aucun.
- **Fini quand :** chaque chemin et chaque nom cité existe (vérifié par `grep`), et la SPEC décrit ce que fait
  l'appli après 465 à 469.
- Fait :
  - `SPEC.md` :
    - §14.5, Machine à états : « Simulation pas à pas » (départ, lanceur, pas, fins et leurs couleurs, rendu, commandes,
      trace, édition bloquée, caméra libre) ;
    - §9.2 : ligne « Pendant une prise en main de la page par un mode » (touches capturées, sans répétition, rendues
      à la vue si le mode ne les prend pas, ⌘A sans effet, bouton focalisé).
  - `AJOUTER_UN_MODE.md` :
    - arbre de la partie appli avec `CanvasOverlay` ;
    - « Prendre la main sur la page » complétée (objet de session dans la lib, `lockOwner` et
      `useSyncExternalStore`, règles et `key` dans la lib, focus gardé sur la zone de dessin, couche toujours animée
      sans géométrie refaite).
  - `SUMMARY.md` :
    - carte : `edit/editLocks.ts`, `input/inputCaptures.ts`, `runtime/pageOverlays.ts`, `modes/pageTakeover.ts` ;
    - périmètre : simulation pas à pas ;
    - « Où regarder » : `simulation/statesSimulator.ts` et la couche `CanvasOverlay`.
  - `tests/engine/core/plugins/guides.test.ts` : `CanvasOverlay` et `ModeCanvasProps` ajoutés à la liste blanche (appli).
  - Chemins et symboles cités vérifiés par `tests/docs/paths.test.ts` et `guides.test.ts`. `make check` vert.
