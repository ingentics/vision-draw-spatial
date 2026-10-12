# Caches de page sur la copie de travail d'un geste

> Dette vue à l'audit 542 (reprise de 514, 519) — mode Event storming

- Les caches `WeakMap<PageModel>` de `groups/stickyGroups.ts:44` et `warnings/stickyWarnings.ts:25` reçoivent aussi la
  copie de travail modifiable d'un geste (`liveEdit.ts:92`), que `coding.md` §3 exclut : groupes et pastilles peuvent
  être périmés pendant un redimensionnement. Non vérifié à l'œil.
