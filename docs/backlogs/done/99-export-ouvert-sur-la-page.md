# Fenêtre d'export ouverte sur toute la page

> Itération — fenêtre d'export des flux ; reprise de 95 et 96

- La fenêtre s'ouvre sur l'export de toute la page ; dans la liste déroulante, ce choix porte le nom de la page (et
  non « Tout »), suivi des flux.
- Le bouton « Ajuster » / « 100 % » est retiré (sans effet sur un diagramme plus petit que la zone) : le rendu est
  toujours à sa taille réelle, la zone défile s'il dépasse.
- **Fini quand :** sur `flows.drawio`, « Exporter en PlantUML » ouvre la fenêtre sur « Page-1 » avec les deux flux ;
  plus de bouton au-dessus du rendu ; `make check` vert.
- Fait : `app/modes/sequences/ExportViewer.tsx` — choix initial `ALL` (toute la page), option libellée du nom de la
  page, plus de prop `flowId` ni de bouton Ajuster ; `index.tsx` ne passe plus le flux courant ; `main.css` : règle
  `.export-canvas.fit` retirée. Vérifié dans l'appli sur `flows.drawio` : la fenêtre s'ouvre sur « Page-1 » avec les
  deux flux, sans bouton au-dessus du rendu.
