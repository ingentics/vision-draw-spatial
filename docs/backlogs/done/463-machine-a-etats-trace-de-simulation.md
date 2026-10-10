# Machine à états : trace de la simulation dans le panneau

> Milestone — mode Machine à états ; dépend de 462

- Pendant la simulation, la section « Machine à états » du panneau de la page montre la **trace** sous le bouton
  « Arrêter la simulation » : une ligne par pas, « ● Entrée », puis « → <état> » et « —[<nom de la transition>]→ »
  entre deux pas (« —→ » sans nom), compteur « ×N » dès le 2e passage, pas courant mis en avant (fond bleu léger),
  fin en dernière ligne avec sa couleur (462).
- **Retour à un pas** : un clic sur une ligne revient à ce pas (les pas suivants sont oubliés), rendu mis à jour.
- La liste défile seule pour garder le pas courant visible.
- **Fini quand :** sur la fixture, après quelques pas, la trace liste les états et les noms des transitions franchies
  dans l'ordre ; cliquer le 2e pas y ramène l'état courant et le rendu ; `make check` vert.
- Fait : `simulationTrace` (`plugins/modes/states/simulation/simulationView.ts`) et `SimulationTrace.tsx` : une ligne par
  pas et par transition franchie, compteur ×N, pas courant en bleu léger, fin colorée ; clic sur une ligne = retour à
  ce pas ; défilement vers le pas courant, ou vers la fin. Vérifié dans l'appli sur `states.drawio` : trace dans
  l'ordre avec les noms des transitions, ×2 / ×3 sur la boucle, clic sur « → State1 » qui ramène au pas 2.
