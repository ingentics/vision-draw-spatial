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
