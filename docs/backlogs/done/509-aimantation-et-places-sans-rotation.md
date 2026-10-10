# Aimantation bord à bord et places ignorent la rotation

> Dette vue à l'audit 500 (reprise de 477, 481) — tronc

- `edgeSnap.ts`, `dragPlaces.ts` et `gesture.ts` travaillent sur `shape.bounds`, sans la rotation : une forme tournée
  se colle et se pose d'après son cadre non tourné. Non documenté dans `AJOUTER_UN_MODE.md`.
- Fait (repris le 2026-10-10) : rien à corriger dans le code. L'appli ne prend pas en charge la rotation libre
  (`rotation=<degrés>`, « Non repris » dans SPEC §14, ligne « Retourner, pivoter une forme ») ; un pivot d'un quart de
  tour (`direction`) échange largeur et hauteur autour du centre, si bien que les bornes d'une forme pivotée sont déjà
  son emprise réelle, celle qu'utilisent l'aimantation et les places. Seul manquait le texte : `AJOUTER_UN_MODE.md`
  le dit maintenant à l'aimantation. Écart : aucun.
