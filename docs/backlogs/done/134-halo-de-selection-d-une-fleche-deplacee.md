# Halo de sélection d'une flèche déplacée

> Itération — sélection (voile) ; correction

- Une flèche sélectionnée déplacée en bloc (au clavier, ou avec sa forme) : le halo blanc autour de son tracé (trou
  du voile) restait à l'ancienne place, les poignées suivaient. Le trou suit maintenant le décalage de l'objet.
- **Fini quand :** une flèche à bouts libres sélectionnée puis déplacée à Maj + flèche garde son halo autour du
  trait à chaque pas ; `make check` vert.
- Fait : `Engine.updateSelectionOutline` : chaque trou du voile prend le décalage `position.x / y` de l'objet de sa
  flèche. Vérifié dans l'appli : flèche à bouts libres déplacée à Maj + ↓, le halo suit à chaque pas.
