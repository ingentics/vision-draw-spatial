# Variante de placement d'une flèche (touche F, ancrage manuel)

> Itération — interaction (flèches, ancrage manuel) ; reprise de 108

- Une flèche sélectionnée seule, sur une page en ancrage manuel : **F** lui applique tout de suite une autre
  variante de placement ; une étape d'annulation par appui (« Variante de placement »), **Ctrl+Z** revient à la
  précédente.
- Variantes proposées (à valider) : les couples côté de départ × côté d'arrivée (16 ; pour une boucle, l'arrivée
  sur un autre point que le départ), chacun sur le point d'ancrage libre de ce côté le plus proche de l'autre bout
  (subdivision de 108) ; rangées de la meilleure à la moins bonne (tracé sans traverser de forme d'abord, puis
  longueur et nombre de coudes) ; **F** passe à la variante qui suit l'actuelle, en boucle. Les points
  intermédiaires posés à la main sont retirés.
- Touche réglable dans Paramètres (raccourcis, `controls.shortcuts`) ; sans effet sur une page en ancrage
  automatique (voir 120), ni pendant l'édition d'un texte.
- **Fini quand :** sur une flèche sélectionnée, appuis successifs sur F = placements différents, le premier étant
  le meilleur autre placement ; Ctrl+Z revient au placement d'avant ; `make check` vert.
