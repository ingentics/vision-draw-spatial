# RDB Designer : mise en valeur de la sélection libre, contour imposé sur les tables

> Itération — mode RDB Designer (sélection), reprise de 254

- La page du mode n'impose plus le contour : la mise en valeur de la sélection suit le paramètre « Style » (voile ou
  contour) pour les autres formes (Texte, Titre…).
- Les tables (modèle, entité, énumération, fragment, document, vue) imposent le contour (`selectionStyle: 'outline'`
  de la forme). La région garde son comportement (aucune seule, contour en sélection multiple).
- **Fini quand :** avec « voile » dans les paramètres, une table sélectionnée est en contour et un Texte ou un Titre
  en voile.
- Fait : `selectionStyle` retiré de la page du mode (`rdd/index.ts`), `selectionStyle: 'outline'` ajouté à `table()` (`shapes/common/table.ts`) ; SPEC et `AJOUTER_UN_MODE.md` mis à jour, test dans `rdd/index.test.ts`. Changement de comportement : Texte et Titre suivent désormais le paramètre « Style ». Validé à l'œil dans l'appli.
