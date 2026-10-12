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
- Fait :
  - Type de champ `note` : tableau de `AJOUTER_UN_PLUGIN.md` §7 et réglages d'un mode (`AJOUTER_UN_MODE.md`).
  - `AJOUTER_UNE_FORME.md` : `fallback`, `library` / `modes` d'un modèle, `map.colors.unloaded` et `UNLOADED_COLORS`,
    forme sans dossier (bibliothèque JSON), objets animés (`spinHues`, `Rhythm`), `quadTo` ; le champ `generation` est
    venu avec le sujet 545.
  - `SUMMARY.md` §3 : fichiers des calques, des bibliothèques, des formes générées, `pageMemo`, `modeSimulator`,
    `edgeBadgeSettings`, `jsonText`, `animation.ts`, `layerPlanes.ts`, `shapes/generic/library/`, briques de l'appli
    (`ModeExport.tsx`, `simulationHook.ts`, `ArrowCount.tsx`, `LayersSection.tsx`, `GenerationSection.tsx`,
    `demoShapeLibrary.ts`, `metamorph/`) ; §5 : lignes « Calques », « Bibliothèque de formes (JSON) », « Forme générée
    par l'hôte », et Story telling en exemple de mode.
  - Renvois croisés : SPEC §8.2 → `COMPOSANT.md` (côté hôte), `COMPOSANT.md` → SPEC §8.2 et §8.3.
  - `CLAUDE.md` : `docs/AUDIT.md` (procédure, aussi une skill) reste en français, exception notée.
  - Vérifié par `make check` (tests des docs : chemins cités, symboles des guides, contrats documentés).
