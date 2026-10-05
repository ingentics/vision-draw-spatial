# Infobulle de la palette jamais cachée par la barre des onglets

> Itération — palette de formes ; reprise de 50

- Sur la dernière rangée de la palette, l'infobulle passe sous la barre des onglets de pages : elle n'est bornée que
  par la fenêtre, et la barre latérale forme une couche (`z-index: 1`) que la barre des onglets recouvre.
- L'infobulle se place dans la zone visible de la palette (sous la forme, au-dessus s'il n'y a pas la place
  dessous) et s'affiche au premier plan de la page (rendue à la racine du document), quelle que soit la disposition.
- **Fini quand :** sur une forme de la dernière rangée de la palette, en bas de la fenêtre, l'infobulle s'affiche
  entière au-dessus de la forme ; `make check` vert.
- Fait : `app/Palette.tsx` : `tooltipPosition` prend la zone visible de la liste des formes (`.palette-sections`) et
  passe au-dessus de la forme quand la place manque dessous dans cette zone ; l'infobulle est rendue à la racine du
  document (`createPortal`), hors de la couche de la barre latérale ; commentaire de `main.css` à jour. Vérifié dans
  l'appli (fenêtre de 530 px de haut, dernière rangée contre la barre des onglets) : sur « Process étiqueté »,
  l'infobulle s'affiche entière au-dessus de la forme.
