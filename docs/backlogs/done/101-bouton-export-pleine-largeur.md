# Bouton d'export en pleine largeur

> Itération — section « Flux » du mode Séquences ; reprise de 90

- Les boutons « Exporter en … » de la section « Flux » prennent toute la largeur de la section, texte centré (un par
  ligne s'il y en a plusieurs).
- **Fini quand :** « Exporter en PlantUML » occupe toute la largeur de la section « Flux » ; `make check` vert.
- Fait : `main.css` — `.flow-exports` en grille d'une colonne, boutons au texte centré. Vérifié dans l'appli sur
  `flows.drawio` : « Exporter en PlantUML » occupe toute la largeur de la section « Flux ».
