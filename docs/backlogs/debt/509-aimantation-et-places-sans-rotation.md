# Aimantation bord à bord et places ignorent la rotation

> Dette vue à l'audit 500 (reprise de 477, 481) — tronc

- `edgeSnap.ts`, `dragPlaces.ts` et `gesture.ts` travaillent sur `shape.bounds`, sans la rotation : une forme tournée
  se colle et se pose d'après son cadre non tourné. Non documenté dans `AJOUTER_UN_MODE.md`.
