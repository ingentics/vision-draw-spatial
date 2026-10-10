# Machine à états : lancer et suivre la simulation dans l'appli

> Milestone — mode Machine à états ; dépend de 460 (logique) et 461 (tronc)

- **Périmètre** : `src/engine/plugins/modes/states/`, `src/app/plugins/modes/states/`, `tests/`, la fixture.
- **Bouton** « Lancer la simulation » dans la section « Machine à états » du panneau de la page, à côté de
  « Exporter en PlantUML » ; pendant la simulation il devient « Arrêter la simulation ». Départ selon 460 (sélection
  ou point d'entrée) ; plusieurs points d'entrée → petite liste à choisir ; aucun → message dans le panneau.
- **Édition bloquée** pendant la simulation (461).
- **Rendu**, dessiné par le mode dans la couche du tronc (461) : voile ; état courant en bleu avec halo ; ensembles parents encadrés ; états visités teintés avec
  compteur ; transitions proposées en pointillés animés avec pastille « 1 », « 2 »… (nom de la transition à côté s'il
  existe) ; transitions empruntées en bleu plein ; point qui parcourt la flèche franchie en 250 ms, lancé vite puis ralenti (élan), avant le pas suivant ; pastilles
  (compteurs, numéros) au-dessus de tout ; caméra qui suit.
- **Barre flottante** en bas de la zone de dessin, centrée : « ⏮ Recommencer », « ◀ Retour », « ▶ Suivant »
  (actif seulement s'il n'y a qu'une transition proposée), « ⏹ Arrêter », puis « Pas N · <nom de l'état courant> ».
- **Clavier** : 1 à 9 franchit la transition de ce numéro ; → ou Espace = Suivant ; ← ou Retour arrière = Retour ;
  Échap = Arrêter.
- **Fin** : bandeau dans la barre — « Terminé : sortie attendue » (vert `#2e7d32`), « Terminé en erreur » (rouge
  `#d32f2f`), « Bloqué : aucune transition sortante » (orange `#ef6c00`) ; Retour et Recommencer restent actifs.
- **Fini quand :** sur la fixture, sans sélection, « Lancer la simulation » part du point d'entrée, l'état courant
  est mis en avant et le reste voilé ; un état à deux transitions propose « 1 » et « 2 », un clic ou la touche 2
  franchit la seconde avec le point animé ; depuis un état d'un ensemble, la transition sortante de l'ensemble est
  proposée ; entrer dans un ensemble mène à son entrée intérieure ; une sortie en erreur affiche le bandeau rouge ;
  Retour revient d'un pas ; un état sélectionné avant le lancement est le départ ; aucune modification possible
  pendant la simulation ; Échap rend l'édition ; `make check` vert.
- Fait : moteur, `plugins/modes/states/simulation/` : `simulationView.ts` (contenu d'un pas, noms, fins),
  `simulationLayer.ts` (pas pour le tronc : état courant suivi et gardé net, couche, franchissement, clic sur une
  pastille), `simulationMarks.ts` (marques). Appli, `src/app/plugins/modes/states/` : `simulationRun.ts` (départ, pas,
  touches 1–9, → / Espace, ← / Retour arrière), `SimulationBar.tsx` (couche `CanvasOverlay` de la zone de dessin),
  `SimulationStart.tsx` (choix du point d'entrée ou message), section du panneau. Registre des modes de l'appli :
  `ModeSimulationControls` et `CanvasOverlay` ; palette et réglages de page grisés pendant la simulation. Écart : la
  barre porte aussi « ▶ Lancer la simulation » hors simulation, seul moyen de partir d'un état sélectionné (le panneau
  de la page n'est montré que sans sélection). Vérifié dans l'appli sur `states.drawio` : départ du point d'entrée,
  voile, pastilles 1 et 2, touche et clic, point animé, entrée dans State3, transitions de l'ensemble proposées,
  bandeau rouge, Retour, départ d'un état sélectionné, édition bloquée (glisser, Suppr, annuler), Échap.
  Test : `tests/engine/plugins/modes/states/simulation/simulationLayer.test.ts`.
