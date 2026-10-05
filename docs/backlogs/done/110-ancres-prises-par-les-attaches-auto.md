# Ancres prises par les attaches auto et par le bout déplacé

> Itération — flèches (points d'ancrage) ; reprise de 108

- Une flèche en attache auto (sans `entryX/entryY`) qui arrive au milieu d'un côté n'en prenait pas le point : le
  côté ne proposait que ce milieu. Désormais un bout en attache auto compte comme ancre prise au point où son tracé
  touche la forme (ramené sur le côté le plus proche du cadre).
- Le bout qu'on déplace compte à sa place d'origine pendant le glisser : en le promenant sur le côté où il arrive
  au milieu, on voit 0,25, 0,5 (pris) et 0,75.
- **Fini quand :** en tirant le bout d'une flèche qui arrive au milieu du côté gauche d'une forme, ce côté propose
  trois points ; `make check` vert.
- Fait : `src/engine/edit/edgeEnds.ts` (`frameConstraint` : point touché ramené sur le côté du cadre ;
  `shapeAnchors` prend `floatingAt` et `extra`), `src/engine/Engine.ts` (`anchorsOf` : bouts auto au point de leur
  tracé ; `endAnchor` : place d'origine du bout déplacé, gardée prise pendant le glisser), `docs/SPEC.md`,
  `tests/engine/edit/edgeEnds.test.ts`. Vérifié dans l'appli (`sequences.drawio`) : le bout de « login », qui arrive
  en attache auto au milieu du côté gauche d'« API », s'accroche à 0,75 de ce côté ; `make check` vert.
