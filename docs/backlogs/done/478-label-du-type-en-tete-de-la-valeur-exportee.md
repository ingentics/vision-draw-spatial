# Export draw.io : label du type en tête de la valeur des post-it Event storming

> Moteur — écriture du fichier ; demandé par le mode Event storming (475)

- Aujourd'hui le fichier ne porte que le texte du ticket : dans draw.io, un post-it est un rectangle coloré à ombre,
  sans le nom de son type.
- Donner au mode un moyen d'écrire la valeur exportée (ou la valeur elle-même) : label en gras en tête (`<b>Command</b>
  <br>Payer`), le texte dessous ; rien en tête quand « Labels » est décoché. L'édition en place ne montre que le texte.
- **Fini quand :** `eventstorming.drawio` enregistré puis ouvert dans draw.io montre le type en gras en tête de chaque
  post-it ; rouvert dans l'appli, rien ne change ; `make check` vert.
- Fait : points d'entrée `lifecycle.exportedLabel(page, shape, value)` et `importedLabel(page, shape, value)`
  (`core/modes/types.ts`) ; réécriture des labels dans un arbre, `core/modes/fileLabels.ts` (`rewriteLabels`) ; hôte
  `PageModes.exportLabels` (à l'enregistrement, `DocumentFile.serialize`, sur une copie relue du fichier : l'arbre du
  document n'est pas touché) et `importLabels` (à l'ouverture, `DocumentFile.load`, sans étape d'annulation, pages
  touchées marquées modifiées). Mode Event storming : `export/fileLabel.ts`, `<b>Type</b><br>texte` (seul sans texte),
  rien quand « Labels » est décoché ; à l'ouverture, l'en-tête du type du post-it est retiré (`<br>` ou `<br/>`), celui
  d'un autre type est gardé. Les instantanés d'annulation ne passent pas par là (pas d'en-tête). Tests
  `tests/engine/plugins/modes/eventstorming/fileLabel.test.ts` ; doc `AJOUTER_UN_MODE.md`, SPEC §14.5. Vérifié à
  l'œil : fichier sauvegardé (IndexedDB) avec `<b>Command</b><br>Payer`…, rouvert après rechargement sans doublon du
  type. Non fait : ouverture dans draw.io (`make drawio-check`). Le copier-coller vers draw.io n'a pas l'en-tête.
