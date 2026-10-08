# Disposition : boutons-icônes

> Itération — panneau contextuel, section « Disposition » (ordre de dessin)

- Les quatre boutons texte (Premier plan, Arrière-plan, Avancer, Reculer, sur deux lignes « Plan » / « D'un cran »)
  deviennent une rangée de boutons-icônes, comme Orientation et Aligner : Premier plan, Avancer, Reculer,
  Arrière-plan. L'infobulle garde le libellé et le raccourci de draw.io.
- Icônes en 18 × 18 : l'élément déplacé en couleur d'accent, les autres en contour ; trois carrés pour
  « devant / derrière tout », deux carrés et une flèche pour « d'un cran ».
- **Fini quand :** sur une forme sélectionnée, la section montre les quatre icônes, lisibles en clair et en sombre,
  et chacune fait la même action qu'avant.
- Fait : section déplacée dans `src/app/OrderSection.tsx` (comme `OrientSection`), retirée de `ContextPanel.tsx` ;
  boutons `arrange-button` avec infobulle `useTooltip` et `aria-label` ; styles `.order-*` dans `main.css` (les
  lignes « Plan » / « D'un cran » disparaissent). Vérifié dans l'appli sur `fixtures/rdd.drawio` (rendu agrandi,
  infobulle) ; actions inchangées.
