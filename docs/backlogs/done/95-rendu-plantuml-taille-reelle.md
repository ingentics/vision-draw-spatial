# Rendu de l'export à sa taille réelle

> Itération — fenêtre d'export des flux ; reprise de 90

- Un diagramme plus large que la zone de rendu n'est plus réduit d'office : il s'affiche à sa taille réelle, la zone
  défile dans les deux sens. Un bouton bascule entre « Ajuster » (tout le diagramme dans la zone, réduit si besoin,
  jamais agrandi) et « 100 % ».
- **Fini quand :** un diagramme de 10 participants s'affiche lisible à 100 % avec défilement horizontal, et « Ajuster »
  le fait tenir dans la zone ; `make check` vert.
- Fait : `app/modes/sequences/ExportViewer.tsx` — barre au-dessus du rendu (bouton « Ajuster » / « 100 % », lien
  vers plantuml.com) et zone `.export-canvas` qui défile ; `main.css` : image à sa taille réelle, centrée par marges
  (le bord gauche reste atteignable en défilant), réduite par `max-width` / `max-height` en mode ajusté. Vérifié dans
  l'appli : un diagramme de 1489 px s'affiche à 100 % avec défilement horizontal, et à 558 px en mode ajusté.
