# Export PNG : attendre tous les textes avant le rendu

> Audit 444 — moteur, export d'image (reprise de 431)

- Constat : `textsSynced` (`core/render/troikaText.ts:351`) ne parcourt la scène qu'une fois, au moment de l'appel.
  Or les textes riches (`createRich`, `:239`) et les textes le long d'un tracé (`createOnPath`, `:207`) ne créent
  leurs `Text` qu'après `measured().then(...)`. Sur une page où aucun texte simple n'est en cours de mise en page,
  l'attente rend donc la main avant que ces lettres existent ou soient mises en page, et le PNG peut sortir sans
  elles. C'est déduit du code : à reproduire d'abord (fixture `labels.drawio`, page à labels HTML seuls). L'attente
  lit aussi `_isSyncing`, un champ interne de troika (`:357`).
- Ce qu'on veut : la fabrique de textes dit quand tous les textes qu'elle a lancés sont prêts. Elle a déjà un
  `onReady`, compté par `addPieces`. L'export attend cette promesse au lieu de parcourir l'arbre. Si aucune API
  publique de troika ne permet de s'en passer, la dépendance à `_isSyncing` est isolée en un seul endroit et
  vérifiée par un test.
- Écart de comportement : l'export contient tous les textes, alors qu'il pouvait en manquer.
- Tests : `ImageExport.exportPng` (rien à exporter → `undefined` ; sélection vide ; option sélection seule) et
  l'attente d'un texte riche, avec une fabrique simulée si WebGL n'est pas disponible dans les tests.
- **Fini quand :** le PNG d'une page n'ayant que des labels HTML et du texte le long d'une flèche contient tous ses
  textes, même au premier export après le chargement ; tests verts.
- Fait : la fabrique de textes (`core/render/troikaText.ts`) compte les mises en page en cours :
  - chaque texte SDF, de l'événement public `syncstart` à `synccomplete` ;
  - chaque texte riche ou sur un tracé, de sa création jusqu'à ce que ses morceaux soient lancés, une fois les
    polices prêtes (`whenMeasured`).

  `settled()` est tenue quand plus rien n'est en cours. L'export l'attend (`view/imageExport.ts`) au lieu de
  parcourir la scène. `textsSynced` et le champ interne `_isSyncing` (`src/types/troika-three-text.d.ts`) sont
  retirés : plus aucune dépendance aux champs privés de troika. Écart : l'export attend aussi les textes de la vue
  affichée qui seraient en cours de mise en page (l'attente est un peu plus longue dans ce cas).

  Tests :
  - `render/troikaText.test.ts` (nouveau, faux texte troika) : rien en cours, texte simple, texte riche attendu avant
    même que ses morceaux existent ;
  - `domains/view/imageExport.test.ts` (nouveau) : sans page, sélection vide, rien de dessiné (textes attendus avant
    la mesure, scène libérée).

  `make check` vert. Vérifié dans l'appli : l'export PNG de `labels.drawio` contient tous ses labels. Le cas d'une
  page à textes riches seuls n'est vérifié que par le test.
