# Actor droid

> Milestone 5 — Formes ; reprise de 41 (Actor), 170 à 172 (pancarte)

- Nouvelle forme « Droid » (`actor-droid`), palette « Général », 30 × 60, juste après l'Acteur : le même bonhomme
  (corps, bras, jambes, pancarte en iso / 3D, `spatial.sign`, sélection et clic sur la silhouette), mais une tête de
  droid : rectangle arrondi, surmonté d'une petite antenne (tige et boule).
- Pas de droid natif dans draw.io : stencil embarqué (`shape=stencil(…)`, nom `actor-droid`), tiré des mêmes points
  que le rendu du moteur, pour que draw.io le dessine à l'identique ; texte sous la forme comme l'Acteur.
- L'Actor devient une famille : `impl/general/actors/` avec `common/` (figure, rendu 2D, debout en iso / 3D, pancarte,
  définition partagée), `human/` (l'Actor actuel, id `actor` inchangé) et `droid/`. Le registre collecte aussi les
  formes d'une famille (`impl/<catégorie>/<famille>/<variante>/index.ts`).
- Export PlantUML du mode séquences : un droid est un `actor`, comme l'Acteur.
- **Fini quand :** le Droid se pose depuis la palette, s'affiche en 2D, iso et 3D avec sa tête à antenne et sa
  pancarte, se sélectionne comme l'Actor ; l'Actor humain est inchangé ; draw.io dessine le droid du fichier ;
  `make check` vert.
- Fait : l'Actor devient la famille `impl/general/actors/` : `common/figure.ts` (silhouette générique : cadre de
  tête, pièces pleines, traits ; corps commun `actorBody`, bras au rang `ARMS`), `common/definition.ts`
  (`actorDefinition` : rendu 2D, debout en iso / 3D, pancarte, mini-carte, réglage `spatial.sign`),
  `common/standing.ts` (paramétré par la silhouette) ; `human/` (id `actor`, tête ronde, inchangé) ; `droid/`
  (`figure.ts` : tête 15 × 10 arrondie, boule et tige d'antenne dans un cadre 30 × 60 étiré ; `index.ts` : stencil
  `actor-droid` tiré des mêmes points). Registre : glob des familles (`registry.ts`) ; clic en iso sur toutes les
  pièces pleines (`core/selection/picking.ts`) ; PlantUML : le droid est un `actor`. SPEC §8.2 / §8.3 et
  AJOUTER_UNE_FORME.md (familles). Tests dans `tests/engine/shapes/actor.test.ts` (Droid), `registry.test.ts`,
  `palette.test.ts`. Vérifié dans l'appli (palette, 2D, iso, 3D, sélection autour de la tête) et dans draw.io
  (export PNG : droid dessiné, couleurs et épaisseur suivies).
