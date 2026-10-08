# Aperçus dans les paramètres d'affichage

> Itération — paramètres (`SettingsPanel.tsx`), sur le modèle de l'aperçu des commentaires (`comment/CommentPreview.tsx`).

- Un petit aperçu en direct (SVG ou HTML, pas de moteur Three.js) en bas des sections où le réglage est difficile
  à se représenter, qui suit les valeurs pendant qu'on glisse :
  - **Sélection** : deux formes et une flèche, l'une sélectionnée ; style (voile ou contour), couleur d'accent,
    intensité et couleur du voile, marge autour d'une flèche, contour animé et vitesse des tirets.
  - **Fond et grille** : un carré de plan avec la couleur du fond, la grille, la ligne principale et l'intensité
    des lignes secondaires.
  - **Barres latérales** : une bande repliée (nom de bas en haut ou de haut en bas) et l'ombre portée sur un bout de
    plan.
  - **Mini-carte** : un cadre à la largeur choisie, avec ou sans flèches et contour des formes.
  - **Liens entre pages › Transitions** : la courbe choisie (Douce / Freinée / Accélérée) tracée, et la plage du
    fondu entre les pages marquée dessus ; **Vue graphe** : deux cartes reliées avec les couleurs choisies.
  - **Vue › Volumes** : un cube iso avec les luminosités des faces éclairée et à l'ombre.
  - **Formes non supportées** : le placeholder avec son fond et sa bordure.
- Les sections de ressenti (navigation, caméra, souris, sauvegarde, raccourcis) n'ont pas d'aperçu.
- **Fini quand :** dans les paramètres, chaque section listée montre son aperçu, qui change en direct quand on
  bouge un réglage, en clair comme en sombre.
- Fait : dossier `src/app/settingsPreviews/` (un composant par aperçu, briques communes dans `previewParts.tsx` :
  `planStyle` dessine le plan avec la grille du moteur, lignes principales et secondaires mêlées au fond). Sélection
  (voile percé autour de la flèche à la marge réglée, ou contour en tirets d'accent animé à la vitesse réglée ;
  poignées d'accent ; un clic choisit l'élément sélectionné), fond et grille (carré de plan à 100 %), barres latérales
  (vraies bandes `.sidebar-strip`, ombre réglée), mini-carte (cadre à la largeur réglée, estompé si masquée),
  transitions (courbe `easing` et plage du fondu), vue graphe (départ relié dans les deux sens à une page, page
  orpheline et inaccessible), volumes (bloc iso, faces aux luminosités réglées, à plat sans volume), placeholder.
  Les aperçus de Sélection et Fond et grille sont communs à la section et restent sous chacune de ses sous-sections
  (`SectionPreview`) ; le texte des aperçus n'est pas cherché par la recherche des paramètres. Changement : l'aperçu
  des commentaires prend `planStyle` et montre donc aussi les lignes principales et l'intensité des secondaires.
  Exports ajoutés à `engine/index.ts` : types de réglages, `boundsOfPoints`, `distance`, `inflate`, `easing`. Tests :
  `tests/app/settingsPreviews/previewParts.test.ts`. Vérifié dans l'appli : chaque aperçu suit ses réglages en direct,
  sur fond clair et sur fond sombre (les flèches restent noires sur fond sombre, comme dans le rendu). L'appli n'a pas
  de thème sombre : « en sombre » a été compris comme une couleur de fond sombre.
