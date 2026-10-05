# Bout de flèche perpendiculaire à son point d'ancrage

> Itération — édition des flèches (ancrage manuel)

- Flèche orthogonale avec points intermédiaires : quand on pose sa tête (ou son départ) sur un point d'ancrage d'une
  forme, le dernier (ou premier) segment arrive perpendiculaire au côté, au lieu de longer le côté après un coude.
- Si le tracé arrive parallèle au côté, le dernier coude est repoussé hors de la forme (20 px, la garde de draw.io
  pour une pointe classique) et un court segment rejoint le point d'ancrage à 90°. Les points intermédiaires écrits
  donnent le même tracé dans draw.io.
- **Fini quand :** en ancrage manuel, une flèche à coudes dont on déplace la tête sur un point du haut d'une forme
  y arrive verticalement (idem pour le départ) ; `make check` vert.
- Fait : `src/engine/edit/squareEnd.ts` (`squareEnd`) : si le tracé brut longe le côté du point d'ancrage, le dernier
  coude est repoussé de 20 px hors du côté et un coude est ajouté au droit du point ; le tracé recalculé est vérifié
  (sinon rien ne change). Branché dans `Engine` (`squaredEndPoints`) au glisser d'un bout, en ancrage manuel, pour
  une flèche orthogonale à coudes (hors boucles) : aperçu en direct, points intermédiaires écrits au lâcher, dans la
  même étape d'annulation que l'attache. Tests : `tests/engine/edit/squareEnd.test.ts` (tête, départ, bout déjà
  perpendiculaire).
