# Docs : type `note`, guide d'une forme (bibliothèques, animation), SUMMARY, renvois

> Audit 542 — docs (reprise de 517, 523 à 541)

- Constats :
  - Type de champ `note` (`core/fields/fieldSchema.ts:22-29`) absent de `AJOUTER_UN_PLUGIN.md:112-120` et de la liste
    de `AJOUTER_UN_MODE.md:150`.
  - `AJOUTER_UNE_FORME.md` muet sur les bibliothèques JSON (forme visuelle sans dossier), `PaletteEntry.fallback`,
    `ShapeTemplate.library` / `modes`, `MinimapMapping.colors.unloaded`, la brique d'animation (`spinHues`, `Rhythm`).
  - `SUMMARY.md` §3 sans `core/shapes/library/`, `render/animation.ts`, `render/layerPlanes.ts`,
    `plugins/shapes/generic/library/`, fichiers des calques, `LayersSection.tsx`, `MetamorphSection.tsx`,
    `demoShapeLibrary.ts` ; §5 sans lignes « Calques », « Bibliothèque de formes », « Metamorph » ; l.124 ne cite pas
    `storytelling/`.
  - Bibliothèques et Metamorph décrites dans SPEC §8.2-8.3 et `COMPOSANT.md:99-160` sans renvoi.
  - `docs/AUDIT.md` : instruction d'agent en français, alors que la règle de langue les veut en anglais.
- Ce qu'on veut : ces manques comblés (sur le code final des sujets 543 à 550), un renvoi croisé SPEC / COMPOSANT, et
  l'exception de `AUDIT.md` notée dans `CLAUDE.md` (ou le fichier traduit, au choix de l'utilisateur).
- **Fini quand :** chaque notion ci-dessus est trouvée par un agent depuis SUMMARY §5 ; chemins cités existants ;
  `make check` vert.
