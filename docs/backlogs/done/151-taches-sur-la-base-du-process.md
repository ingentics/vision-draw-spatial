# Event consumer, Tâche de fond, Tâche récurrente sur la base du process

> Itération — formes (Architecture) ; reprise de 148, 149, 150

- Les trois formes quittent leur dessin (enveloppe, engrenage, flèche circulaire) et reprennent la base du process,
  avec **une seule barre**, à droite : la tranche de droite porte un mot en capitales grises, écrit de bas en haut :
  « CONSUMER » (event consumer), « TASK » (tâche de fond), « CRON » (tâche récurrente).
- **La tranche et le mot gardent leur taille** quand on redimensionne : un stencil s'étirerait (texte compris), on
  prend donc la forme native `internalStorage` de draw.io, une seule ligne (`dy=0`) à `dx=16` px, retournée à droite
  (`flipH=1`), comme `paintForeground` de draw.io (ligne au moins au coin avec `rounded=1`). La forme est désignée par
  `spatial.kind` (`event-consumer`, `background-task`, `recurring-task`). **Écart assumé** : draw.io montre la
  tranche sans le mot, seul Drawio Spatial le dessine (comme les étiquettes de façade).
- Mot : gras, taille 9 (réduite si la tranche ou la forme sont trop petites), teinte des étiquettes de façade (fond
  assombri à 45 %), centré dans la tranche, orienté avec la forme ; `spatial.tag` le remplace (champ « Étiquette » du
  panneau, section Bordure).
- Un **composant partagé** (`generic/tagged-process`) dont héritent les trois formes : chacune ne donne que son mot
  et son entrée de palette.
- Palette : `shape=internalStorage;whiteSpace=wrap;html=1;backgroundOutline=1;dx=16;dy=0;flipH=1;spacingRight=16;`
  `spatial.kind=<id>;`, 120 × 60 ; icône avec le mot dans la tranche.
- **Fini quand :** les trois formes se créent depuis la palette avec leur tranche et leur mot, en 2D et sur le
  dessus du volume ; la tranche ne s'élargit pas au redimensionnement ; dans `shapes.drawio`, contour et lignes
  (`dx`, `dy`, `rounded`, orientations, tailles) tombent sur l'export SVG de draw.io (`make drawio-check`) ;
  `make check` vert.
- Fait : base `shapes/generic/tagged-process/index.ts` (`taggedProcess(id, mot, palette)` : lignes de
  `internalStorage`, mot en texte d'avant-plan) ; les trois formes la reprennent en quelques lignes. Le dessin
  intérieur (`ShapeDetail`) prend aussi un texte (`ShapeDetailText` : centre, direction, taille, `fit`) ; la base
  `generic/stencil` revient au seul contour (la Prise). Tests de palette et du registre : nom de forme lu comme à la
  lecture (`spatial.kind`). Fixture `shapes.drawio` : 16 process étiquetés (deux tailles, `dx`, `dy`, `rounded`,
  orientations) à la place des stencils ; `make drawio-check` : contours et lignes tombent sur l'export SVG de
  draw.io. SPEC §8.3 et `AJOUTER_UNE_FORME.md` à jour. Vérifié dans l'appli : ajout des trois formes, mot dans la
  tranche en 2D, tranche et mot inchangés après agrandissement, mot sur le dessus en iso.
