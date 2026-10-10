# Formes Event storming : huit `index.ts` identiques

> Dette vue à l'audit 500 (reprise de 475) — collecteur des plugins, mode Event storming

- `shapes/<type>/index.ts` (6 lignes chacun) sont imposés par le glob `./modes/*/shapes/*/index.ts`
  (`plugins/index.ts:54`) : ajouter un type touche `kinds.ts`, `STICKY_TYPES`, un dossier et la grammaire des places.
  Le collecteur pourrait accepter un tableau de définitions, générées depuis `kinds.ts`.
- Ce qu'on veut (repris le 2026-10-10) :
  - Le collecteur des formes des modes accepte aussi `modes/<id>/shapes/index.ts` qui exporte `definitions`
    (`ShapeDefinition[]`), pour des formes générées ; un dossier par forme reste la règle ordinaire.
  - Event storming : `shapes/index.ts` génère les 8 post-it depuis `STICKY_TYPES` ; les 8 dossiers disparaissent.
    Ajouter un type ne touche plus que `kinds.ts` et la grammaire des places.
- **Fini quand :** la palette Event storming montre les 8 post-it dans le même ordre, `eventstorming.drawio` se dessine
  pareil ; `make check` vert.
- Fait : `shapesByMode` (`plugins/index.ts`) range aussi les `definitions` de `modes/<id>/shapes/index.ts` (mode lu
  avant `shapes` dans le chemin) ; `MODE_SHAPE_DEFINITIONS` réunit les deux `import.meta.glob`. Event storming :
  `shapes/index.ts` génère les 8 post-it depuis `STICKY_TYPES` (`stickyDefinition`) ; les 8 dossiers
  `shapes/<type>/` sont supprimés. Test `registry.test.ts` (fixture `fixtures/test/shapes/index.ts` : formes
  générées collectées avec celles des dossiers) ; tests du mode inchangés. Docs `AJOUTER_UN_MODE.md` (arbre et §6),
  commentaire du contrat (`core/modes/types.ts`). Écart : aucun (ordre d'enregistrement des post-it : celui de
  `STICKY_TYPES` au lieu de l'ordre alphabétique des dossiers ; la palette suit `order`, inchangé). Vérifié dans
  l'appli sur `eventstorming-commande.drawio` : palette Event storming dans le même ordre (Domain Event … Hotspot),
  41 formes dessinées avec leurs ombres, aucun avertissement.
