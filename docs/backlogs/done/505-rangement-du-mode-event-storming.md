# Rangement du mode Event storming

> Audit 500 — mode Event storming (reprise de 475 à 484)

- Constats :
  - `places/dragPlaces.ts` porte le nom de `core/edit/dragPlaces.ts` (règle « nom déjà pris ») ; `places/stacking.ts`
    traite de l'ordre de dessin, pas des places ; `export/fileLabel.ts` fait aussi l'import.
  - `LABELS`, clé du mode, est défini dans `shapes/common/stickyLayout.ts:25` et lu par `labels/` et `export/`.
  - Filtre « autres post-it » écrit trois fois (`index.ts:50-52`, `places/dragPlaces.ts:58` avec `stickyType(other)!`
    à `:63`, `contacts/contacts.ts:84`) ; `snapTargets` écrit en ligne dans `index.ts:48-53` alors que les autres
    gestes sont dans leurs fichiers.
  - Le rayon de voisinage des places (`inflate(bounds, STICKY.size)`, `dragPlaces.ts:60`) dépend d'une constante de
    dessin.
  - Exports sans lecteur ailleurs : `CONTACT_TOLERANCE` (`contacts.ts:13`), `labelsShown` (`labels/pageLabels.ts:13`).
  - Tests à plat dans `tests/engine/plugins/modes/eventstorming/` au lieu du miroir de `src/` ; cellule de texte
    recopiée dans quatre tests (`contacts.test.ts:54`, `fileLabel.test.ts:24`, `index.test.ts:127`,
    `labels.test.ts:7`) ; `shapes.find(s => s.id === …)` dans `helpers.ts:30` et `fileLabel.test.ts:33`.
- Ce qu'on veut :
  - Fichiers renommés selon leur rôle (ex. `places/placesAround.ts`, `order/stacking.ts`, `file/fileLabel.ts`) ;
    `LABELS` dans `keys.ts` ; un seul `otherStickies(page, shape)` ; `snapTargets` dans son fichier ; rayon de
    voisinage nommé à part.
  - Exports inutiles retirés.
  - Tests rangés en miroir, cellule de texte dans `helpers.ts`, `shapeOf`.
- Écart de comportement : aucun.
- Tests : existants intacts (imports et emplacements seuls).
- Docs : SPEC §14.5 et SUMMARY si un chemin cité change.
- **Fini quand :** aucun nom de fichier du mode n'est déjà pris dans le moteur, les constats ci-dessus ont disparu,
  `make check` vert.
- Fait : fichiers du mode renommés selon leur rôle : `places/dragPlaces.ts` → `places/placesAround.ts`,
  `places/stacking.ts` → `order/stacking.ts`, `export/fileLabel.ts` → `file/fileLabel.ts` ; aimantation dans
  `places/snapTargets.ts`. `LABELS` dans `keys.ts` ; `otherStickies(page, shape)` dans `kinds.ts`, repris par
  l'aimantation et les cases ; portée du voisinage `NEIGHBOR_REACH` (160) au lieu de `STICKY.size` ; `rightNeighbor`
  (486) sur `rectSpan`. `labelsShown` n'est plus exporté. `CONTACT_TOLERANCE` reste exporté : les cases de 486 le
  lisent. Tests rangés en miroir (`contacts/`, `places/`, `order/`, `labels/`, `file/`), `textCell` dans `helpers.ts`,
  `shapeOf`. Écart : aucun. Vérifié dans l'appli sur `eventstorming-commande.drawio` : au glisser d'un post-it,
  aimantation (37 cibles) et cases montrées ; relâché à l'origine, rien ne change.
