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
- Fait :
  - Contrat : `core/modes/pageTakeover.ts`.
    - `PageTakeover` : `lockEditing`, `setOverlay`, `clearOverlay`, `keepInView`.
    - Types `EditLock`, `InputCapture`, `PageOverlay`, `OverlayScene`, `OverlayLayer`.
    - Exportés par l'API des plugins et par le point d'entrée du moteur. Le moteur lui-même remplit ce contrat ; il est
      passé tel quel aux modes de l'appli.
  - Domaines (un par brique) :
    - `domains/edit/editLocks.ts` (`EditLocks`) : verrou d'édition et événement `editLockChange`. Il est rendu au
      changement de page ou de document et au `dispose`, et son détenteur est prévenu (appel protégé).
    - `domains/input/inputCaptures.ts` (`InputCaptures`) : clic (second clic d'un double-clic ignoré), survol, touches.
      Les appels sont protégés.
    - `domains/runtime/pageOverlays.ts` (`PageOverlays`) : voile, éléments gardés, objets du mode. Elle est refaite à
      la reconstruction de la scène, et son horloge est appelée dans l'image du rendu (`sync(now)`, plus de boucle à
      part). Les appels sont protégés : une couche en erreur ne pose que le voile, une fois.
    - `PageModes.guardPage` signale ces erreurs au nom du mode de la page.
  - Voile commun : `render/veil.ts`.
    - `veilPage` est utilisé par la sélection (`highlight.ts`) et par la couche.
    - `liftAboveVeil` compte les relevés d'un objet : deux voiles le relèvent une fois, et il redescend au dernier
      retrait.
  - Caméra :
    - `ViewCamera.keepInView`, avec la règle pure `needsRecentring` (`interaction/cameraFraming.ts`) : marge de 48 px,
      et une forme plus grande que la vue n'est recentrée que si elle n'y est plus du tout ;
    - la zone de dessin exclut déjà les panneaux latéraux ; la barre posée dessus est couverte par la marge.
  - Gardes :
    - `canEditNow` lit le verrou ;
    - `Pages.addPage`, `renamePage` et `removePage` passent par `canEditNow` ;
    - `EditHistory.editLockChanged` réémet `undoChange` sans libellés pendant le verrou.
  - Clavier (`keyboard.ts`, `runCapturedKey`) :
    - une touche prise et tenue ne se répète pas ;
    - une touche non prise revient à la vue ;
    - ⌘A et l'ordre de dessin sont empêchés sur la zone de dessin ;
    - un bouton focalisé garde Espace et Entrée.

    L'hôte a `capturing` / `capturedKey`, et `click` reçoit `repeated`.
  - `Rendering.overlay` est privé, avec `setOverlay(object)`. Retirés : `core/modes/simulation.ts`,
    `domains/modes/simulations.ts`, `Engine.openSimulation` / `showSimulation` / `closeSimulation` /
    `getSimulation`, `simulationChange`.
  - Mode Machine à états :
    - `simulation/statesSimulator.ts` (`StatesSimulator`) assemble les briques : verrou, capture, couche du pas,
      `keepInView`, Échap qui arrête, `subscribe` et `version` ;
    - `simulationLayer.ts` donne `simulationOverlay` (au lieu de `simulationFrame`) ;
    - `api.ts` réduit à ce que l'appli lit.
  - Appli :
    - le registre des modes donne `ModePageControls` (`takeover`, `selection`, `lockOwner`), prop `controls` /
      `modeControls` ;
    - `Viewer` lit `editLocked` (événement `editLockChange`, remis à zéro quand le moteur disparaît) ;
    - la partie états suit le simulateur par `useOpenedSimulation` (`useSyncExternalStore`).
  - Guide : `AJOUTER_UN_MODE.md`, section « Prendre la main sur la page » (refondue en entier par 470).
  - Écarts de comportement :
    - Annuler / Rétablir grisés pendant la simulation ;
    - opérations de page refusées par le moteur ;
    - touche tenue sans répétition ;
    - ⌘A sans effet ;
    - double-clic qui ne franchit qu'une transition ;
    - suivi de la caméra avec marge de 48 px, et une forme plus grande que la vue n'est plus recentrée tant qu'elle
      y est en partie ;
    - le survol pendant la capture tient à jour le commentaire survolé ;
    - le curseur main est retiré à la fin.
  - Tests :
    - nouveaux : `editLocks.test.ts`, `inputCaptures.test.ts`, `pageOverlays.test.ts` (cœur réduit commun
      `tests/engine/core/domains/takeoverCore.ts`), `interaction/capturedKeys.test.ts`, `statesSimulator.test.ts` ;
    - complétés : `veil.test.ts` (deux voiles sur le même objet), `cameraMath.test.ts` (`needsRecentring`) ;
    - remplacé : `simulations.test.ts` ;
    - adaptés : `simulationLayer.test.ts` (noms), `pointerInput.test.ts` (cœur réduit), `guides.test.ts`
      (`pageTakeover.ts` parmi les contrats, `StatesSimulator` cité en exemple).
  - `grep -ri simulation` ne trouve rien dans `src/engine/core`, `Engine.ts` ni le registre des modes de l'appli.
  - `make check` vert.
  - Vérifié dans l'appli sur `states.drawio` :
    - lancement depuis le panneau : voile, halo, pastilles ;
    - touche 1, puis clic sur la pastille 2 : entrée dans State3, « Pas 3 », trace à jour ;
    - un double-clic sur la pastille de la boucle « New Data » ne franchit qu'une fois (« Pas 4 ») ;
    - Échap rend l'édition et la barre propose de nouveau « Lancer la simulation ».

    Vérifiés seulement par les tests : touche tenue, ⌘A, bouton focalisé, opérations de page refusées, couche en
    erreur.
