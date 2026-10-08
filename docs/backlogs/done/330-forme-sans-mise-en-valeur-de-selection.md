# Forme sans mise en valeur de sélection

> Itération — moteur, sélection (reprise de 254) ; utilisé par les régions RDD

- Nouveau style de mise en valeur `none` (à côté de `veil` et `outline`) : rien n'est dessiné pour l'élément.
- Une définition de forme peut imposer son style (`selectionStyle`), qui l'emporte sur celui de la page (mode) et sur
  le paramètre `selection.style` ; chaque élément sélectionné est mis en valeur selon son propre style. Les poignées
  restent.
- La région RDD déclare `none` : sélectionnée, ni contour ni voile ; ses poignées restent.
- **Fini quand :** dans l'appli, sur une page RDD, une région sélectionnée n'a plus de contour pointillé, une table
  sélectionnée garde le sien ; tests du style par forme.
- Fait : type `SelectionStyle` (`veil`, `outline`, `none`) dans `settings/types.ts` ; `selectionStyle` optionnel sur
  `ShapeDefinition`, lu par `registry.selectionStyle` ; `domains/selection/highlight.ts` met chaque élément en valeur
  selon son style (voile pour les seuls éléments `veil`, contour et animation pour les `outline`, rien pour `none`) ;
  la région RDD déclare `none`. Tests du registre et de la région. Vérifié à l'œil sur `tests/fixtures/rdd.drawio` :
  région sélectionnée sans contour, poignées gardées ; une table garde son contour. Le cas du voile n'est vérifié que
  par lecture du code (les pages RDD imposent le contour).
