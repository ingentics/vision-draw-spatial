# Audit qualité — simulation pas à pas d'une machine à états, 3e passe

> Audit (procédure `docs/AUDIT.md`, copiée et remplie ici ; `docs/AUDIT.md` reste le modèle vierge). Lancé le
> 2026-10-10. Suite de 444 (dernier audit) ; périmètre : commit `2722e56` (sujets 460 à 463, 48 fichiers, +2130 / −44).
> Ce fichier décrit la tâche et en suit l'avancement ; les constats deviennent des tickets.

## Objectif

La simulation ne peut jamais se trouver dans un pas que `cross` ne produit pas, ne laisse rien modifier du document,
résiste à une erreur du mode, et un agent peut ajouter une simulation à un autre mode en lisant le guide, sans lire le
tronc ni la machine à états.

## Périmètre

- **Prioritaire** : `src/engine/plugins/modes/states/simulation/` (≈ 610 lignes), `src/engine/core/modes/simulation.ts`,
  `src/engine/core/domains/modes/simulations.ts` (251 lignes) et les points d'accroche du tronc (`targets.ts`, `undo.ts`,
  `pointerInput.ts`, `keyboard.ts`, `rendering.ts`, `Engine.ts`).
- **Secondaire** : appli, `src/app/plugins/modes/states/` (`simulationRun.ts`, `SimulationBar.tsx`,
  `SimulationStart.tsx`, `SimulationTrace.tsx`, `index.tsx`), `plugins/modes/registry.ts`, `Viewer.tsx`,
  `useEngineEvents.ts`, `main.css`.
- **Docs** : `SPEC.md`, `SUMMARY.md`, `AJOUTER_UN_MODE.md`, sujets 460 à 463.
- **Hors périmètre** : le reste du mode Machine à états ; tout changement de comportement visible sauf les corrections
  décrites dans un ticket.

## Axes d'analyse

1. Erreurs réelles : pas atteignables, édition qui passe malgré la simulation, appels au mode non protégés, clavier.
2. Découplage : tronc et appli sans nom de mode ; règles de la simulation dans le moteur, pas dans l'appli.
3. Mutualisation : transitions sortantes, voile et éléments gardés, règles de pas.
4. Responsabilités et patterns : domaine qui écrit l'état d'un autre, état exposé en écriture, horloge.
5. Lisibilité et code mort.
6. Tests du moteur pour chaque règle.
7. Docs alignées sur le code.

## Constats (2026-10-10)

Trois explorations en parallèle (logique du mode, tronc, appli et docs), puis chaque constat relu dans le code.

**Ce qui est sain** :

- Le tronc et le registre de l'appli ne nomment pas le mode : `owner` est opaque, l'appli le reconnaît par
  `instanceof`.
- La logique est pure et découpée : `stateSimulation.ts` (logique), `simulationView.ts` (contenu montré),
  `simulationLayer.ts` (couche), `simulationMarks.ts` (marques).
- `StateSimulation` garde sa page gelée et ne la modifie pas (`history` remplacé par `slice`).
- `arrive` ne boucle pas (ensemble `entered`), et une transition n'est jamais proposée deux fois.
- `back` et `restart` sautent les pas traversés.
- L'édition passe par `EditTargets.canEditNow` (`editablePage`, `writablePage`, `editablePageById`) : glisser,
  palette, texte, styles, touches, annuler et rétablir sont bloqués.
- Un changement de page ou de document ferme la simulation (`pageChange`, `resetDocument`). `clear()` libère le voile
  et la couche.
- Aucun état de module mutable ; l'événement `simulationChange` est émis une fois par ouverture, pas et fermeture.
- Dans l'appli, ni écouteur ni minuterie : les touches passent par le clavier du moteur, qui ignore les champs de
  saisie. Le franchissement de 250 ms est calculé dans l'horloge du moteur, donc aucun pas n'arrive après Arrêter
  ou Retour.

**Erreurs réelles** :

- Retour par la trace sur un pas traversé sans choix. `SimulationTrace.tsx:32` rend chaque ligne cliquable, et
  `StateSimulation.goTo` (`stateSimulation.ts:116`) accepte un pas `passed`. Sur `states.drawio` (1, puis 2 :
  `init1, State1, State3 (traversé), init2 (traversé), State4`) :
  - un clic sur « → State3 » laisse l'ensemble courant, avec seulement ses sorties proposées ;
  - un clic sur « ● Entrée » laisse le point d'entrée courant, avec ses transitions et celles de l'ensemble.

  `cross` ne produit jamais ces pas. → 465
- Point d'entrée intérieur : les sorties de l'ensemble sont proposées. `proposals()` (`stateSimulation.ts:74`) ajoute
  les transitions des ensembles parents à tout élément, point d'entrée compris :
  - partir de `init2`, ou s'arrêter sur une entrée intérieure à plusieurs transitions, mêle le choix de la branche
    d'entrée aux sorties de l'ensemble ;
  - une entrée intérieure sans transition n'est pas « bloquée ».

  Le test « entrée intérieure à plusieurs transitions » ne le voit pas : son ensemble n'a pas de sortie. → 465
- `entryName` (`simulationView.ts:64`) prend la première flèche partant de l'entrée sans `transitionEnds`. Si cette
  flèche va vers un post-it, l'entrée est nommée d'après un élément que la simulation ne propose pas. → 465
- Lanceur : la liste des points d'entrée garde des ids périmés. `issue` (`SimulationBar.tsx:16`, `index.tsx:21`) ne
  s'efface qu'au changement de page ou de simulation, et l'édition reste libre pendant que la liste est ouverte.
  Supprimer un point d'entrée puis cliquer son bouton lève « Élément inconnu » (`stateSimulation.ts:45`) depuis
  `launchFrom`. La liste et le message « Aucun point d'entrée » ne se ferment pas, et la barre et le panneau en
  gardent chacun leur copie. → 466
- Clavier pendant la simulation (`keyboard.ts:75-91`, `simulationRun.ts:79-85`) :
  - pas de garde `event.repeat` : → ou Espace tenus franchissent environ 30 transitions par seconde, et Retour
    arrière tenu remonte tout ;
  - `simulationKey` rend vrai même quand rien ne se passe (Suivant à plusieurs choix, Retour au départ) ;
  - Espace est toujours pris, si bien que le déplacement Espace + glisser de la caméra est perdu, alors que 461 la
    dit libre ;
  - les touches modifiées repartent sans `preventDefault` : ⌘A sur la zone de dessin sélectionne tout le texte de
    l'appli ;
  - Espace sur un bouton de l'appli qui a le focus fait un pas au lieu d'activer le bouton. Le chemin normal épargne
    un `BUTTON` (`keyboard.ts:200`).

  → 465 (touches des états), 467 (capture des entrées)
- Tronc : les appels au mode ne sont pas protégés. `frame.layer`, `layer.animate`, `layer.hit`, `handlers.click`,
  `clickable`, `key` et `closed` (`simulations.ts:78-120`, `191`, `218`) ne passent pas par `pluginGuard`. Si
  `layer` lève :
  - le voile est déjà posé et les éléments déjà relevés (`:188-190`), mais `drawn` n'est pas noté ;
  - `sync()` relance `draw()` à chaque image, ce qui ajoute un voile de plus à chaque mouvement de la caméra.

  → 467
- Tronc : les pages restent modifiables pendant une simulation. `Pages.addPage` et `removePage`
  (`pages.ts:57`, `:79`) lisent `canInteract()` au lieu de `canEditNow()`, et `renamePage` (`:70`) n'a aucune
  garde. Seule l'appli les grise (`Viewer.tsx`). → 467
- Annuler et rétablir paraissent actifs pendant la simulation. Les boutons (`ViewerToolbar.tsx:136`, `:148`) lisent
  `undoChange`, qui n'est pas réémis à l'ouverture, alors que `canUndo()` est faux. → 467
- `Simulations.dispose()` (`simulations.ts:92`) ne ferme pas la simulation : ni `closed`, ni `simulationChange`. Un
  moteur recréé laisse l'appli en « simulation ». → 467
- Couche : un clic pendant le franchissement de 250 ms vise les pastilles du pas suivant, encore cachées, et non
  celles qu'on voit (`simulationLayer.ts:101-105`). Un double-clic envoie deux clics et peut franchir deux
  transitions (une boucle par exemple). → 468 (franchissement), 467 (double-clic)

**Ce qui freine l'extensibilité** :

- Des règles de la simulation vivent dans l'appli. `simulationRun.ts:62-70` décide de `choose` (n-ième proposition)
  et de `next` (une seule proposition). `SimulationBar.tsx:45` refait la règle de Suivant. La correspondance entre
  touches et actions est aussi dans l'appli. `StateSimulation.choose` n'est appelé que par les tests. → 465
- Le guide ne dit pas comment brancher une simulation sur un autre mode. Il manque :
  - l'identité par `owner` ;
  - `open` puis `show` (rien n'est dessiné sans `show`) ;
  - `key` qui rend faux pour les touches inutilisées ;
  - `kept` et `follow` ;
  - le coût d'un `animate` qui rend toujours vrai ;
  - le contrat `CanvasOverlay` / `ModeCanvasProps` et le focus gardé par `preventDefault`.

  → 467, 470

**Mutualisation et responsabilités** :

- Les transitions sortantes valides dans l'ordre de dessin sont calculées trois fois :
  - `outgoing` (`stateSimulation.ts:180`) ;
  - `states/export/plantuml.ts:63-67` ;
  - `entryName` (`simulationView.ts:64`), sans validation.

  → 465
- « Pas N » compte les pas traversés : un seul choix qui entre dans State3 affiche « Pas 5 ». Un ensemble courant
  (sans entrée intérieure) n'est ni teinté ni compté, puisque `stepLook` ne garde que `isState`. → 465
- Horloge : la couche des états anime toujours (`simulationLayer.ts:93`), donc le moteur rend la page entière 60 fois
  par seconde pendant toute la simulation. Chaque image refait et libère la géométrie des pointillés de chaque
  transition proposée (`animateStep`, `:112-120`). L'horloge et le rendu sont deux `requestAnimationFrame` distincts
  (`simulations.ts:214-222`), si bien que l'image animée a une image de retard. `animate(0)` refait des pointillés
  que `drawStep` vient de construire. → 467 (horloge), 468 (pointillés)

**Tests** :

- Les deux erreurs de la logique ne sont pas testées.
- `simulationTrace`, `stepLook`, `entryName` (463) : aucun test.
- Le tronc n'est pas testé sur :
  - l'acheminement des touches (`runSimulationKey`) ;
  - le branchement `pageChange` et `resetDocumentState` ;
  - le voile, la couche et leur libération : le test a `scenes.current = undefined`, si bien que `draw()` ne tourne
    jamais ;
  - la priorité de `hit` sur la page.

  → 467 (briques), 469 (trace, vue)

**Docs** :

- `SPEC.md` ne parle pas de la simulation : lancement, départ, touches, fins, trace, édition bloquée.
- `SUMMARY.md` ne cite ni `core/modes/simulation.ts` ni `domains/modes/simulations.ts` dans la carte, ni
  `states/simulation/` dans « Où regarder ».
- L'arbre de `AJOUTER_UN_MODE.md:29` montre `panel = { PageSection }`, sans `CanvasOverlay`.

→ 470

**Dette notée** (`docs/backlogs/debt/`) :

- point de sortie ou d'entrée posé sur le bord d'un ensemble, compté hors de l'ensemble (471) ;
- couleurs de la simulation recopiées dans `main.css` et règle CSS en double (472).

Les autres points vus en passant ont été repris par 467 :

- `Rendering.overlay` exposé en écriture ;
- `Engine.getSimulation()` sans appelant ;
- voile recopié de la sélection ;
- survol figé ;
- suivi de la caméra qui ignore les panneaux.

## Décisions (2026-10-10, utilisateur)

- **La simulation est propre au mode Machine à états.** Le cœur n'en porte plus la notion. Il ouvre cinq briques
  neutres (verrou d'édition, capture des entrées, couche par-dessus, voile et éléments gardés, forme gardée dans la
  vue), que le mode assemble dans `plugins/modes/states/simulation/`. → 467
- **Espace et → ne font plus Suivant** : les numéros 1, 2, 3… suffisent. Espace et → reviennent à la caméra. → 465

## Sujets

| #   | Sujet                                                                                         | Gain                                   | Taille | Décision |
| --- | --------------------------------------------------------------------------------------------- | -------------------------------------- | ------ | -------- |
| 465 | Logique : seulement des pas atteignables, entrée intérieure, règles et touches dans le moteur | erreurs (pas impossibles), découplage  | M      | fait     |
| 467 | Tronc : briques ouvertes à un mode à la place de la simulation                                | erreurs (voiles empilés, édition), découplage | L | fait     |
| 466 | Lanceur : liste des points d'entrée à jour et refermable, une seule copie                     | erreur (exception)                     | S      | fait     |
| 468 | Couche des états : clic pendant le franchissement, pointillés sans géométrie refaite          | erreur mineure, performance            | S      | fait     |
| 469 | Tests de la simulation des états (trace, vue)                                                 | couverture                             | S      | fait     |
| 470 | Docs : SPEC (simulation), SUMMARY, guide d'un mode (prendre la main sur la page)              | doc juste pour un agent                | S      | fait     |

Ordre validé : 465, 467, 466, 468, 469, 470. Docs en dernier, car elles décrivent le code final. Un commit par sujet,
dès que `make check` est vert et le sujet validé. Écarts de comportement : seulement ceux que décrit chaque ticket.

- **Fini quand :** les sujets validés sont faits (chacun dans `done/`), `make check` est vert, et la dette ci-dessus
  est notée.

## Avancement

- [x] Tâche décrite (ce fichier)
- [x] Constats
- [x] Sujets rédigés
- [x] Sujets validés par l'utilisateur
- [x] Réalisation

- Fait : sujets réalisés dans l'ordre validé, un commit chacun.
  - 465 : `goTo` ne s'arrête jamais sur un pas traversé ; propositions d'une entrée intérieure ; transitions valides
    communes (`transitionsOf`) ; Suivant, Retour et touches dans le moteur ; Espace et → rendus à la caméra.
  - 467 : le cœur n'a plus de « simulation ». Il ouvre cinq briques : verrou d'édition, capture des entrées, couche,
    voile commun, `keepInView`. Les appels au mode sont protégés ; pages, annuler et rétablir sont bloqués et grisés ;
    une touche tenue n'est pas répétée. `StatesSimulator` assemble les briques.
  - 466 : lanceur commun à la barre et au panneau, relu sur la page, refermable ; plus d'exception sur une entrée
    supprimée.
  - 468 : pointillés et point animés sans géométrie refaite ; un clic pendant le franchissement ne franchit rien.
  - 469 : tests de la trace, de la vue et des noms d'entrée.
  - 470 : SPEC, guide d'un mode et SUMMARY.
  - Reste : dette 471 (point sur le bord d'un ensemble) et 472 (couleurs recopiées dans le CSS).
