# Simulation des états : lanceur à jour et refermable

> Audit 464 — appli, mode Machine à états (reprise de 462)

- Constats :
  - La liste des points d'entrée et le message « Aucun point d'entrée » (`issue`, `SimulationBar.tsx:16`,
    `index.tsx:21`) ne s'effacent qu'au changement de page ou de simulation. L'édition reste libre pendant ce temps.
  - Supprimer un point d'entrée puis cliquer son bouton fait lever « Élément inconnu » au constructeur de
    `StateSimulation` (`stateSimulation.ts:45`), appelé par `launchFrom` (`simulationRun.ts:33`).
  - Ni la liste ni le message ne se ferment, et la barre et le panneau en gardent chacun leur copie.
  - Un commentaire en cours d'édition reste ouvert au lancement, puis son écriture est refusée sans bruit.
- Ce qu'on veut :
  - Le départ choisi est recalculé sur la page courante au clic : un point d'entrée qui n'existe plus remet la liste
    à jour, sans exception.
  - La liste et le message se ferment par une croix ou Échap, et s'effacent dès que la page change (modèle de page,
    pas seulement son id).
  - Le lancement ferme l'édition d'un commentaire, comme celle d'un texte.
  - La barre et le panneau partagent le même état du lanceur.
- Écart de comportement : les corrections ci-dessus.
- Tests : `startSimulation` sur une page où l'entrée choisie a disparu (pas d'exception). Le reste est vérifié dans
  l'appli.
- **Fini quand :**
  - Sur une page à deux points d'entrée, lancer, supprimer une entrée et cliquer son bouton ne lève rien et met la
    liste à jour.
  - La liste se ferme par sa croix et par Échap.
  - `make check` est vert.
