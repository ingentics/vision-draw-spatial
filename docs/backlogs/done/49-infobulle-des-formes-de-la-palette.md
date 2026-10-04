# Infobulle des formes de la palette

> Itération — palette de formes ; reprise de 46

- Au survol d'une forme de la palette, une infobulle apparaît juste en dessous, centrée, avec le nom de la forme
  (remplace l'infobulle native du navigateur, lente et sans style).
- Apparition et disparition rapides : fondu + léger glissement (~120 ms en entrée, ~80 ms en sortie). L'infobulle
  disparaît dès qu'on quitte la forme, et pendant un glisser-déposer.
- Elle n'est pas coupée par le défilement de la palette (positionnée par rapport à la fenêtre).
- **Fini quand :** survoler une forme montre son nom en dessous avec le fondu ; la quitter le fait disparaître ;
  `make check` vert.
- Fait : `src/app/Palette.tsx` (état de l'infobulle, placée en `position: fixed` sous la forme survolée, masquée au
  départ d'un glisser ; l'attribut `title` natif est retiré) et `src/app/main.css` (`.palette-tooltip` : entrée en
  `@keyframes` 120 ms, sortie en transition 80 ms). Vérifié dans l'appli : « Ellipse » s'affiche sous la forme au
  survol et s'efface en la quittant ; `make check` vert.
