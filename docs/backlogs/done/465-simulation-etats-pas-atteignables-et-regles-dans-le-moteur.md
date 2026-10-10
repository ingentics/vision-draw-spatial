# Simulation des états : seulement des pas atteignables, règles et touches dans le moteur

> Audit 464 — mode Machine à états, logique de la simulation (reprise de 460, 462, 463)

- Constats :
  - `goTo` (`stateSimulation.ts:116`) accepte un pas traversé sans choix (`passed`), et la trace le rend cliquable
    (`SimulationTrace.tsx:32`). On s'arrête alors sur un ensemble ou sur son point d'entrée, ce que `cross` ne produit
    jamais (sur `states.drawio` : 1, puis 2, puis clic sur « → State3 »).
  - `proposals()` (`stateSimulation.ts:74`) ajoute les sorties des ensembles parents à un point d'entrée intérieur.
    Le choix de la branche d'entrée s'y mêle aux sorties de l'ensemble, et une entrée sans transition n'est pas
    bloquée.
  - `entryName` (`simulationView.ts:64`) prend la première flèche partant de l'entrée sans la valider. Les transitions
    sortantes valides dans l'ordre de dessin sont calculées aussi dans `outgoing` (`stateSimulation.ts:180`) et dans
    l'export PlantUML (`export/plantuml.ts:63-67`).
  - Des règles de pas sont dans l'appli : `choose` et `next` (`simulationRun.ts:62-70`), Suivant actif
    (`SimulationBar.tsx:45`), table des touches (`simulationRun.ts:79-85`). `StateSimulation.choose` n'a pas
    d'appelant hors des tests.
  - `simulationKey` rend vrai même sans effet (Retour au départ). Espace et → (Suivant) prennent des touches de la
    caméra.
  - « Pas N » compte les pas traversés. Un ensemble courant (sans entrée intérieure) n'est ni teinté ni compté
    (`stepLook`, `isState` seul).
- Ce qu'on veut :
  - `goTo(n)` mène au pas où l'on choisit : un pas traversé renvoie au premier pas non traversé qui le suit. Dans la
    trace, une ligne de pas traversé n'est pas cliquable, et la ligne d'une transition mène au pas où l'on choisit
    après elle.
  - Sur un point d'entrée, seules ses propres transitions sont proposées. Une entrée intérieure sans transition est
    « bloquée ».
  - Une seule fonction donne les transitions sortantes valides dans l'ordre de dessin (dans
    `transitions/transitionRules.ts`). La simulation, `entryName` et l'export PlantUML s'en servent.
  - `StateSimulation` porte `next()` et `canNext()` (bouton Suivant) ; `choose(n)` est celui de l'appli.
  - Les touches sont décidées dans le moteur, par `simulationKey` dans `api.ts`, qui rend faux quand rien ne se passe :
    - 1 à 9 franchissent la transition de ce numéro ;
    - ← et Retour arrière font Retour ;
    - Espace et → ne sont plus des touches de la simulation (décision du 2026-10-10 : 1, 2, 3… suffisent) et
      reviennent à la caméra.

    L'appli ne fait plus que relier ces opérations au rendu.
  - « Pas N » compte les pas où l'on a choisi. Un ensemble courant est teinté et compté comme un état.
- Écart de comportement :
  - les corrections ci-dessus (trace, propositions sur une entrée intérieure, numéro du pas, teinte d'un ensemble
    courant) ;
  - Espace et → retirés ; le texte d'aide du bouton Suivant est mis à jour.
- Tests : `stateSimulation.test.ts`. On ajoute :
  - `goTo` sur un pas traversé ;
  - les propositions au départ de `init2` ;
  - une entrée intérieure à plusieurs transitions dans un ensemble qui a des sorties ;
  - une entrée intérieure sans transition ;
  - `next` et `canNext` ;
  - `simulationKey` (touche prise ou non).

  Le test de l'export PlantUML reste inchangé.
- **Fini quand :**
  - Sur `states.drawio`, après 1 puis 2, la ligne « → State3 » de la trace n'est pas cliquable, et la ligne
    « —[Démarrer]→ » ramène à State4.
  - Partir de l'entrée de State3 sélectionnée ne propose que sa transition.
  - La barre affiche « Pas 3 ».
  - En simulation, → et Espace font bouger la caméra.
  - `make check` est vert.
- Fait :
  - `transitions/transitionRules.ts` : `transitionsOf(page)` et `outgoingTransitions(page, source)`, transitions
    valides dans l'ordre de dessin. Elles servent à la simulation (`outgoing`), à `entryName` et à l'export PlantUML
    (sortie inchangée, test inchangé).
  - `StateSimulation` (`simulation/stateSimulation.ts`) :
    - `goTo(n)` et `goToTarget(n)` mènent au premier pas où l'on choisit à partir de `n` ; jamais à un pas traversé ;
    - sur un point d'entrée, seules ses transitions sont proposées (entrée intérieure sans transition : « bloqué ») ;
    - `stepNumber` : pas où l'on a choisi ;
    - `canNext`, `next`, `canBack`, `proposes` ; `choose(n)` rend l'id de la transition franchie ;
    - `visits` ne compte plus les pas traversés.
  - `simulation/simulationKeys.ts` : `simulationKey(sim, key)` (1 à 9, ← / Retour arrière ; undefined si sans effet),
    exporté par `api.ts`.
  - `simulationView.ts` : un ensemble courant est teinté et compté. Chaque ligne de trace porte `target` (pas où mène un
    clic), absent pour un pas traversé ou qui mène au pas courant.
  - Appli : `simulationRun.ts` ne fait plus que relier ces opérations au rendu. Dans `SimulationBar.tsx`, Suivant suit
    `canNext`, Retour et Recommencer sont grisés au départ, « Pas N » vient de `stepNumber`. Dans
    `SimulationTrace.tsx`, les lignes sans `target` sont grisées.
  - Écarts de comportement :
    - les corrections décrites ;
    - Espace et → ne font plus Suivant et restent à la caméra ;
    - Retour et Recommencer sont grisés au départ ;
    - entrer dans un ensemble par son entrée ne compte plus de passage pour l'ensemble.
  - Tests : `stateSimulation.test.ts`.
    - Quatre tests ajoutés : `goTo` sur un pas traversé, propositions sur une entrée intérieure, `next` / `canBack`,
      `simulationKey`.
    - Adaptés : `choose` rend l'id, et l'ensemble traversé n'a plus de passage.
  - `make check` vert.
  - Vérifié dans l'appli sur `states.drawio` :
    - après 1 puis 2, « Pas 3 », et les lignes « → State3 », « ● Entrée » (intérieure) et « —[Démarrer]→ » sont
      grisées ;
    - après 1 de plus, « —[Démarrer]→ » ramène au pas 3 ;
    - l'entrée intérieure sélectionnée ne propose que sa transition, et Retour et Recommencer sont grisés ;
    - → et Espace ne font pas de pas.
