# RDD : étiquette de la région sur un fond de la couleur des bords

> Itération — mode RDD (région) ; reprise de 182

- Label de la région en 9 px (`fontSize=9`), sur un rectangle de la couleur de la bordure
  (`labelBackgroundColor` = `strokeColor`), texte noir ou blanc selon le contraste (`fontColor`) ; marge réduite :
  plus de `spacingLeft` / `spacingTop` (espacement par défaut de draw.io, 2 px).
- Changer la couleur de la région change aussi le fond et la couleur du label.
- **Fini quand :** une région neuve montre son nom en petit, collé au coin haut-gauche, sur une étiquette de la
  couleur des bords ; draw.io montre la même étiquette ; `make check` vert.
- Fait : style de la région (`shapes/region/index.ts`) : `fontSize=9`, `labelBackgroundColor` et `fontColor` donnés par
  `regionLabelStyle` (`regions.ts`), `spacingLeft` / `spacingTop` retirés ; `setRegionColor` écrit aussi l'étiquette.
  Tests `rdd.test.ts` (style, texte blanc sur une couleur sombre), fixture `rdd.drawio` réenregistrée par draw.io
  (étiquette conservée). SPEC §14.5. Vérifié dans l'appli : nom en petit, collé au coin, sur l'étiquette grise.
