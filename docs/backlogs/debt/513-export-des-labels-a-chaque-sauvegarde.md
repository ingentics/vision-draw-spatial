# Export des labels : fichier relu à chaque sauvegarde

> Dette vue à l'audit 500 (reprise de 478) — tronc

- `PageModes.exportLabels` (`pageModes.ts:130-138`) refait `readDrawio` puis `writeDrawio` sur tout le fichier à
  chaque `serialize()`, donc à chaque sauvegarde automatique, dès qu'une page a un mode avec `exportedLabel`. À
  mesurer sur un gros fichier avant d'y toucher (ne réécrire que les pages concernées).
