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
