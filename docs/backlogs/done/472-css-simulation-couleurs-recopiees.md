# Appli : couleurs de la simulation recopiées dans le CSS

> Dette vue à l'audit 464 (reprise de 462, 463)

- `main.css` recopie le bleu de la simulation (`rgba(30,136,229,.12)` pour le pas courant de la trace, alors que le
  moteur a `#1e88e5`) et écrit `#ffffff` en dur pour le bandeau de fin. La règle `.simulation-popup
  .simulation-entries` répète `.simulation-entries`. Il faudrait passer la couleur par une variable CSS posée depuis
  le moteur, et retirer la règle en double.
- Ce qu'on veut (repris le 2026-10-10) :
  - les couleurs de la simulation ne sont déclarées que dans le moteur ;
  - l'appli les reçoit par l'API du mode (fond du pas courant par une variable CSS, texte du bandeau de fin) ;
  - la règle CSS en double est retirée.
- **Fini quand :** `main.css` n'a plus de couleur de la simulation, et le rendu est identique dans l'appli ;
  `make check` vert.
- Fait :
  - Moteur :
    - `END_LABELS` (`simulation/simulationView.ts`) porte `textColor`, le blanc du texte du bandeau, auparavant en dur
      dans le CSS ;
    - `SIMULATION_COLOR` est exporté par `api.ts`.
  - Appli :
    - `SimulationTrace.tsx` pose `--simulation-color` sur la trace, et `main.css` en tire le fond du pas courant
      (`color-mix(…12%…)`, au lieu de `rgba(30, 136, 229, 0.12)`) ;
    - `SimulationBar.tsx` prend `textColor` ;
    - la règle `.simulation-popup .simulation-entries`, copie de `.simulation-entries`, est retirée.
  - Écart de comportement : aucun.
  - `make check` vert.
  - Vérifié dans l'appli sur `states.drawio`, en simulation jusqu'à la sortie attendue :
    - fond du pas courant calculé `rgb(30 136 229 / 0.12)`, comme avant ;
    - bandeau « Terminé : sortie attendue » blanc sur `rgb(46, 125, 50)`.
