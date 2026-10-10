# Formes Event storming : huit `index.ts` identiques

> Dette vue à l'audit 500 (reprise de 475) — collecteur des plugins, mode Event storming

- `shapes/<type>/index.ts` (6 lignes chacun) sont imposés par le glob `./modes/*/shapes/*/index.ts`
  (`plugins/index.ts:54`) : ajouter un type touche `kinds.ts`, `STICKY_TYPES`, un dossier et la grammaire des places.
  Le collecteur pourrait accepter un tableau de définitions, générées depuis `kinds.ts`.
