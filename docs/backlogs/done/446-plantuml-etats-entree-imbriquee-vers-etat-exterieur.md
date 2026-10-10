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
- Fait : défaut confirmé sur un serveur PlantUML local, avec `make plantuml`. `[*] --> X` écrit dans le bloc
  `Box`, alors que X n'est pas encore déclaré, crée `Box.X`. Déclaré avant, X reste à son niveau.

  Correction dans `states/export/plantuml.ts` : la cible d'un point d'entrée d'un autre niveau est toujours déclarée
  (`state X`, même au nom simple et sans contenu). À chaque niveau, elle et les ensembles qui la contiennent passent
  avant les autres déclarations. La transition reste dans le bloc du point d'entrée.

  Écart de comportement : seul le texte exporté dans ce cas change (ordre des déclarations, `state X` ajouté).

  Test : `plantuml.test.ts`, point d'entrée d'un ensemble vers un état d'un autre ensemble déclaré après lui. Le
  rendu PlantUML de ce texte garde `Other.X`. Pas de vérification dans l'appli : la fixture `states.drawio` n'a pas ce
  cas.
