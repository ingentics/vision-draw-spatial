# Tronc : briques ouvertes à un mode à la place de la simulation

> Audit 464 — moteur (reprise de 461) ; direction validée le 2026-10-10 : la simulation est propre au mode Machine à
> états, le cœur n'ouvre que les briques dont elle a besoin. Dépend de 465.

- Constats :
  - Le cœur porte une notion de « simulation » qui n'a qu'un seul utilisateur : `core/modes/simulation.ts`,
    `domains/modes/simulations.ts`, `Engine.openSimulation` / `showSimulation` / `closeSimulation` /
    `getSimulation`, l'événement `simulationChange`, et `ModeSimulationControls` dans le registre de l'appli.
  - Les appels au code du mode ne passent pas par `pluginGuard` (`simulations.ts:78-120`, `191`, `218`). Une couche
    qui lève laisse le voile posé, et `sync()` en repose un à chaque image (`:188-194`).
  - `Pages.addPage`, `removePage` et `renamePage` (`pages.ts:57`, `:70`, `:79`) ne lisent pas `canEditNow()`.
  - Annuler et rétablir paraissent actifs (`undoChange` n'est pas réémis), et `dispose()` ne ferme rien.
  - Clavier (`keyboard.ts:75-91`) :
    - la répétition d'une touche n'est pas écartée ;
    - ⌘A n'est pas empêché ;
    - Espace et Entrée sont pris sur un bouton qui a le focus.
  - L'horloge a son propre `requestAnimationFrame` (une image de retard).
  - Le voile recopie `highlight.updateVeil`, et leurs restaurations de relevé peuvent se croiser.
  - `Rendering.overlay` est exposé en écriture.
  - Le survol (commentaires, parties, `title`) est figé, et le curseur main reste après la fermeture.
  - Le suivi de la caméra ignore les panneaux.
  - Le commentaire de `pointerInput.ts:59` parle de « flèche proposée ».
- Ce qu'on veut : le cœur ouvre cinq briques neutres, sans le mot « simulation » ; le mode les assemble.
  1. **Verrou d'édition.** `lockEditing(owner, { released })` rend un `release()`. `canEditNow` le lit, pour tout le
     moteur, opérations de page comprises. L'événement `editLockChange` et la réémission de `undoChange` permettent
     à l'appli de griser la palette, les réglages de page, les pages et Annuler / Rétablir. Le verrou est rendu au
     changement de page, au changement de document et au `dispose`, et son détenteur est prévenu (`released`).
  2. **Capture des entrées.** Elle n'est possible qu'avec le verrou du même détenteur, et rendue avec lui. Clic
     (sans sélection, second clic d'un double-clic ignoré), survol (curseur main) et touches sans modificateur
     vont au détenteur. Une touche répétée n'est pas transmise, et une touche non prise retombe sur la vue. Les
     raccourcis d'édition modifiés (⌘A…) sont empêchés sans effet, et un bouton qui a le focus garde Espace et
     Entrée. Échap est rendu au détenteur comme les autres touches. Le reste du survol (commentaires, parties) suit
     comme hors capture, et le curseur est remis à la fin.
  3. **Couche par-dessus.** `setOverlay(owner, build)`, où `build(scène dessinée)` rend `{ object, animate?, hit? }`
     (types actuels renommés). Elle est refaite quand la scène est reconstruite ; son horloge est appelée dans
     l'image du rendu, et les animations réduites coupent `animate`. `clearOverlay(owner)` la retire.
     `Rendering.overlay` devient privé.
  4. **Voile et éléments gardés.** Une brique commune avec le voile de la sélection (`render/veil.ts` et
     `highlight.updateVeil`), qui tient le relevé de chaque objet une seule fois.
  5. **Garder une forme dans la vue.** `keepInView(shapeId)` fait glisser la caméra si la forme sort de la zone
     visible, panneaux et barres déduits. Une forme plus grande que la vue n'est recentrée que si elle n'y est plus
     du tout.

  Chaque appel au code du mode passe par `pluginGuard` (famille `'Mode'`, avec l'id du mode de la page) et a un
  repli neutre : une couche en erreur ne pose rien.
  - Dans `plugins/modes/states/simulation/`, une session (`statesSimulator.ts`) assemble les briques, avec
    ouverture, pas, fermeture et Échap qui ferme. Elle reçoit les briques par une poignée que l'appli lui passe
    (`ModeCanvasProps`).
  - Côté appli : le registre des modes donne cette poignée à `CanvasOverlay` et aux sections, à la place de
    `ModeSimulationControls`. `simulating` devient « édition verrouillée ».
  - Retirés du cœur : `core/modes/simulation.ts`, `domains/modes/simulations.ts`, les quatre méthodes de la façade
    et `simulationChange`.
- Écart de comportement :
  - Annuler / Rétablir et les opérations de page sont grisés et refusés pendant la simulation ;
  - une touche tenue ne fait qu'un pas ;
  - ⌘A ne fait rien en simulation ;
  - un double-clic ne franchit qu'une transition ;
  - le suivi de la caméra tient compte des panneaux.

  Le reste est inchangé à l'œil.
- Tests :
  - nouveaux tests par brique :
    - verrou : édition, pages et annuler refusés, rendu au changement de page, de document et au `dispose` ;
    - capture : répétition, touche non prise, ⌘A, bouton focalisé, double-clic ;
    - couche : refaite à la reconstruction, horloge, erreur protégée ;
    - voile commun : sélection et couche sur le même objet ;
    - `keepInView` ;
  - `simulations.test.ts` est remplacé par ces tests, et la session des états est testée dans
    `plugins/modes/states/simulation/`.
- **Fini quand :**
  - `grep -ri simulation src/engine/core src/engine/Engine.ts src/app/plugins/modes/registry.ts` ne trouve rien.
  - La simulation se comporte dans l'appli comme avant (sauf les écarts ci-dessus) sur `states.drawio`.
  - Annuler est grisé pendant la simulation.
  - `make check` est vert.
