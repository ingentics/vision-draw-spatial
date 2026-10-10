# Export des labels : fichier relu à chaque sauvegarde

> Dette vue à l'audit 500 (reprise de 478) — tronc

- `PageModes.exportLabels` (`pageModes.ts:130-138`) refait `readDrawio` puis `writeDrawio` sur tout le fichier à
  chaque `serialize()`, donc à chaque sauvegarde automatique, dès qu'une page a un mode avec `exportedLabel`. À
  mesurer sur un gros fichier avant d'y toucher (ne réécrire que les pages concernées).
- Mesure (2026-10-10, conteneur, moyenne de 10 écritures) : 1 page Event storming de 200 post-it + 9 pages de 300
  formes (0,5 Mo) : écriture 8 ms, avec les labels 52 ms ; 1 page de 1000 + 19 pages de 1000 (3,6 Mo) : 55 ms, avec
  les labels 383 ms. Le surcoût (relire et réécrire tout le fichier) bloque l'appli à chaque sauvegarde automatique.
- Ce qu'on veut : à l'enregistrement, seules les pages d'un mode qui écrit des labels sont réécrites, en place dans
  l'arbre du document, le temps d'écrire le fichier ; puis label et style de chaque cellule touchée sont remis comme
  avant (mêmes nœuds), la page restant marquée modifiée pour qu'une page compressée soit réencodée à l'écriture
  suivante. Rien n'est relu.
- **Fini quand :** le fichier enregistré est identique à celui d'avant ce sujet, l'arbre du document est intact après
  l'enregistrement, et le surcoût mesuré est de l'ordre du temps d'écriture de la page concernée ; `make check` vert.
- Fait : `rewriteLabelsForWriting` (`core/format/fileLabels.ts`) réécrit les labels d'une page en place et rend de quoi
  remettre label (`value` ou `label` de l'enveloppe) et `style` de chaque cellule touchée, sur les mêmes nœuds, la page
  restant marquée modifiée ; `rewritePageLabels` prend un rappel `before`. `DocumentFile.serialize` réécrit seulement
  les pages d'un mode qui écrit des labels (`writeExportedLabels`), écrit le fichier, puis remet l'arbre (même en cas
  d'erreur). Mesure (test jetable, même fichier produit qu'avant ce sujet, compressé compris) : 0,5 Mo, 52 → ≈ 7 ms ;
  3,6 Mo, 383 → ≈ 61 ms (écriture seule : 52 ms). Tests `fileLabels.test.ts` (réécrit puis remis : fichier identique,
  mêmes nœuds, page marquée modifiée ; rien à réécrire) ; aller-retour de `file.test.ts` inchangé et vert. Écart :
  aucun. Vérifié dans l'appli sur `eventstorming-commande.drawio` : enregistré en 3,4 ms, « Payer » écrit
  `<b>Command</b><br>Payer`, arbre du document intact, deux enregistrements identiques, rouvert : « Payer ».
