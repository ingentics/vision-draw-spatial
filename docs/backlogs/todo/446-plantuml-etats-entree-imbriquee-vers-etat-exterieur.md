# Export PlantUML des états : point d'entrée imbriqué vers un état extérieur

> Audit 444 — plugin Machine à états, export (reprise de 436)

- Constat : `states/export/plantuml.ts:72` (`level = initial ? levelOf(source) : …`) écrit `[*] --> X` dans le bloc
  de l'ensemble qui contient le point d'entrée, même quand X est hors de cet ensemble. PlantUML risque alors de
  créer dans l'ensemble un second état X. Non testé : `plantuml.test.ts` ne couvre que le cas de la sortie.
- D'abord vérifier le rendu par Kroki / PlantUML. S'il est faux, la transition va au niveau commun aux deux bouts,
  avec le point d'entrée nommé (pseudo-état) ou l'écriture que PlantUML accepte, décidée au vu du rendu.
- Écart de comportement : seulement si le rendu est faux (texte exporté de ce cas).
- Tests : `plantuml.test.ts`, point d'entrée dans un ensemble vers un état extérieur.
- **Fini quand :** sur une page `states.drawio` qui contient ce cas, l'aperçu PlantUML ne dédouble pas l'état cible
  (ou bien on constate que le rendu était déjà juste, et seul le test est ajouté).
