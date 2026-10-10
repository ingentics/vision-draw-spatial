# Briques communes : ombre du papier, intervalles par axe, calques d'aperçu, cellules sœurs

> Audit 500 — tronc et mode Event storming (reprise de 477, 481, 482, 484)

- Constats :
  - Ombre floue du papier copiée : `plugins/modes/eventstorming/shapes/common/stickyPaper.ts:14-49` reprend
    `plugins/shapes/general/post-it/index.ts:12-46` (constantes `SHADOW_*`, opacité par couche `1 - (1 - op)^(1/n)`,
    boucle des couches, ordre `PART_ORDER.fill - 1`) ; seul le contour de chaque couche change.
  - Intervalles d'un rectangle par axe écrits à la main : `span` privé de `core/edit/edgeSnap.ts:22`,
    `core/edit/obstacles.ts:53-55`, `contacts/contacts.ts:44-49` et `:73-74`. `overlapping` (`contacts.ts:71`, lu par
    `places/dragPlaces.ts`) est un `rectsOverlap` avec tolérance, rangé dans le mode. `OPPOSITE` (`contacts.ts:15`)
    redéclare ce que donne `SIDE_NORMALS`.
  - `ConnectorPreview.showPlaces` / `clearPlaces` (`core/domains/edit/drag/preview.ts:139-164`) recopient le cycle de
    `showLimits` / `clearLimits` (clé, `root.add`, `z`, `depthTest`, `requestRender`).
  - `core/format/order.ts` : `parentOf`, cellules sœurs, puis `reindexPage` + `markPageDirty`, écrits trois fois
    (`reorderCells`, `sendToBackInOrder`, `placeBehind`).
- Ce qu'on veut :
  - Une brique d'ombre floue en couches, paramétrée par le contour d'une couche (élargie de `spread`), offerte par
    l'API des plugins ; le Post-it général et les post-it du mode l'utilisent.
  - `rectSpan(rect, axis)` (et l'axe croisé) et un recouvrement avec tolérance dans `model/geometry.ts`, testés ;
    `edgeSnap`, `obstacles` et le mode les reprennent ; côté opposé tiré de `SIDE_NORMALS` (ou d'une `OPPOSITE_SIDE`
    du tronc si elle manque).
  - Un calque d'aperçu commun dans `ConnectorPreview` (montrer, remplacer, retirer) pour les limites et les places.
  - Les cellules sœurs d'une cellule et la fin d'un réordonnancement en une aide de `order.ts`.
- Écart de comportement : aucun. À comparer avant de retirer l'ancien code (ombre : mêmes couches et opacités ; test
  jetable sur les intervalles).
- Tests : `geometry.test.ts` pour les nouvelles fonctions ; tests existants intacts (imports seuls).
- Docs : `.claude/rules/coding.md` §4 (liste des fonctions de géométrie), `AJOUTER_UNE_FORME.md` (brique d'ombre).
- **Fini quand :** les copies ci-dessus ont disparu, le Post-it général et les post-it du mode sont identiques à
  l'œil sur `postit.drawio` (ou la fixture du Post-it) et `eventstorming-commande.drawio` ; `make check` vert.
