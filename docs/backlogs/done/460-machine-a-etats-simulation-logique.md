# Machine à états : logique de la simulation pas à pas

> Milestone — mode Machine à états ; dépend de 433, 434, 435 ; suivi de 461 (tronc), 462 (simulation dans l'appli),
> 463 (trace)

- **Périmètre** : `src/engine/plugins/modes/states/simulation/` et `tests/` seulement ; logique pure, sans rendu ni
  appli, rien d'écrit dans le fichier.
- **Choix manuel seulement** : les transitions n'ont ni garde ni événement ; à chaque pas, l'utilisateur choisit la
  transition à franchir parmi celles proposées. Pas de lecture automatique.
- **Départ** (`startSimulation(page, selection)`) :
  - rien de sélectionné → point d'entrée de premier niveau de la page (hors ensembles) ; s'il y en a plusieurs, la
    liste est rendue pour que l'appli fasse choisir ; aucun → erreur « Aucun point d'entrée sur la page » ;
  - un état sélectionné → cet état ; un ensemble → son point d'entrée intérieur (règle d'entrée ci-dessous) ;
  - un point d'entrée → ce point ; une transition → son état de départ ;
  - plusieurs éléments ou un autre élément (texte, post-it, point de sortie) → comme rien de sélectionné.
- **Pas** : un pas courant = un état (ou un point d'entrée au départ). Transitions proposées : les sortantes de
  l'élément courant, **puis celles de chaque ensemble parent, du plus proche au plus lointain (règle UML : on quitte
  un ensemble depuis n'importe lequel de ses états)** ; ordre stable (ordre de dessin), numérotées 1…n.
- **Entrée dans un ensemble** : franchir une transition vers un ensemble mène à son point d'entrée intérieur, puis
  tout de suite à la cible de sa transition sortante s'il n'en a qu'une ; plusieurs → choix ; aucun point d'entrée
  intérieur → l'ensemble est l'état courant (ses transitions sortantes sont proposées).
- **Sortie** :
  - point de sortie de premier niveau → fin, « attendue » ou « en erreur » selon la sortie (sujet 433) ;
  - point de sortie dans un ensemble → on quitte cet ensemble : ses transitions sortantes sont proposées (sans
    elles : blocage) ; une sortie en erreur dans un ensemble termine en erreur ;
  - aucune transition proposée → fin « bloqué » sur cet état.
- **Historique** : la suite des pas (élément, transition franchie) ; `back()` revient d'un pas, `goTo(n)` revient au
  pas n ; compteur de passages par état et transitions empruntées, calculés depuis l'historique.
- **Fini quand :** les tests couvrent sur `tests/fixtures/states.drawio` (complétée si besoin d'un ensemble avec
  entrée et sortie intérieures et d'un état sans issue) : départ sans sélection, depuis un état, depuis un ensemble ;
  choix parmi plusieurs transitions ; transition d'un ensemble parent proposée depuis un état intérieur ; entrée et
  sortie d'ensemble ; fin attendue, en erreur, bloquée ; retour d'un pas et au pas n ; `make check` vert. Rien à voir
  dans l'appli à ce stade (dit dans le rapport).
- Fait : `plugins/modes/states/simulation/stateSimulation.ts` — `startSimulation(page, sélection)` (simulation, points
  d'entrée à choisir ou erreur) et `StateSimulation` : pas (élément, transition franchie, pas traversé sans choix),
  `proposals` (sortantes de l'élément courant puis de chaque ensemble parent, ordre de dessin), `end` (attendue, en
  erreur, bloquée), `choose`, `cross`, `back` (saute les pas sans choix), `goTo`, `restart`, `visits`, `taken`.
  Entrée d'un ensemble : ensemble et entrée intérieure traversés sans choix jusqu'à la cible d'une transition unique.
  Écart : une sortie dans un ensemble propose les transitions de l'ensemble puis de ses parents (règle générale) ;
  blocage seulement s'il n'y en a aucune. `compositeAncestors` mis en commun dans `compositeLayout.ts` (export PlantUML
  inchangé). Fixture `states.drawio` : état sans issue « Attente » (State2 —Pause→ Attente), test PlantUML mis à
  jour. Validé par les tests (`tests/engine/plugins/modes/states/simulation/stateSimulation.test.ts`).
