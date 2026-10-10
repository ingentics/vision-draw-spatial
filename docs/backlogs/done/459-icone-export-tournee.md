# Icône d'export tournée d'un quart de tour

> Itération — barre d'outils du visualiseur (bouton « Exporter », sujet 431)

- L'icône du bouton « Exporter » est tournée de 90° vers la droite : la flèche pointe vers la droite et sort d'un
  bac ouvert à gauche (au lieu de monter d'un bac ouvert en haut).
- **Fini quand :** dans la barre d'outils, l'icône d'export montre une flèche vers la droite.
- Fait : tracé de l'icône redessiné tourné d'un quart de tour horaire dans `src/app/viewer/ViewerToolbar.tsx` (pas de
  transformation CSS). Vérifié à l'œil dans la barre d'outils ; `make check` passe.
