# Caches de page sur la copie de travail d'un geste

> Dette vue à l'audit 542 (reprise de 514, 519) — mode Event storming

- Les caches `WeakMap<PageModel>` de `groups/stickyGroups.ts:44` et `warnings/stickyWarnings.ts:25` reçoivent aussi la
  copie de travail modifiable d'un geste (`liveEdit.ts:92`), que `coding.md` §3 exclut : groupes et pastilles peuvent
  être périmés pendant un redimensionnement. Non vérifié à l'œil.

- Fait (audit 542) : brique `pageMemo(compute)` (`core/model/pageMemo.ts`, API des plugins) : gardé par page du
  document ; sur la copie de travail d'un geste (marquée par `DocumentFile.livePage`, démarquée à `settleLivePage`),
  gardé tant que ses formes et flèches sont les mêmes objets (un geste remplace les champs qu'il change), refait dès
  qu'une change. Les caches des modes la reprennent : contacts, groupes et avertissements d'Event storming, état des
  flux (Séquences) et des histoires (Story telling). Écart de comportement : pendant un geste, groupes, titres et
  pastilles suivent la copie de travail au lieu de garder leur premier calcul. Test : `core/model/pageMemo.test.ts`.
  Docs : `coding.md` §3, `AJOUTER_UN_PLUGIN.md` §5, `AJOUTER_UN_MODE.md`. Vérifié seulement par les tests (le
  glisser simulé du navigateur intégré ne déplace pas les formes).
