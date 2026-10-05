# Réglages de l'ancrage automatique dans les paramètres globaux

> Itération — paramètres (flèches) ; reprise de 114, 116 et 117

- Les valeurs du tracé automatique, aujourd'hui en constantes dans `src/engine/edit/avoid.ts`, deviennent des
  paramètres globaux (section `shapes`), réglables dans Paramètres › Formes et flèches, sous-section
  « Ancrage automatique » (à côté du choix « Ancrage des flèches ») :
  - **Contourner les formes et les flèches** (`shapes.edgeAutoRoute`, interrupteur, défaut oui) : non = la
    répartition seule, tracé par défaut de draw.io (pas de points intermédiaires écrits) ;
  - **Écart aux formes** (`shapes.edgeShapeClearance`, 10 px, 0–40) ;
  - **Écart entre flèches** (`shapes.edgeSpacing`, 10 px, 2–40) ;
  - **Premier et dernier segments** (`shapes.edgePortStub`, 20 px, 5–60) ;
  - **Détour accepté pour éviter un croisement** (`shapes.edgeCrossingDetour`, 500 px, 0–2000).
- Le moteur passe ces réglages à `avoidRoutes` / `routeAround` ; les fixtures gardent les valeurs par défaut
  (inchangées).
- **Fini quand :** changer un réglage puis modifier une page en Automatique applique la nouvelle valeur (ex. écart
  entre flèches à 20 : deux flèches d'un même couloir à 20 px) ; décocher « Contourner » ne pose plus de points
  intermédiaires ; `make check` vert.
- Fait : `src/engine/settings.ts` (`shapes.edgeAutoRoute`, `edgeShapeClearance`, `edgeSpacing`, `edgePortStub`,
  `edgeCrossingDetour`, avec bornes), `src/engine/edit/avoid.ts` (`AvoidOptions`, `DEFAULT_AVOID_OPTIONS` : les
  constantes deviennent des options de `routeAround` / `avoidRoutes`), `src/engine/Engine.ts` (réglages passés au
  tracé ; sans contournement, une flèche recalculée perd ses points intermédiaires, une boucle garde ses coudes),
  `src/app/SettingsPanel.tsx` (sous-section « Ancrage automatique », réglages grisés sans contournement),
  `docs/SPEC.md`, `tests/engine/edit/avoid.test.ts` (écart aux formes, premier segment, écart entre flèches). Fixtures
  inchangées (valeurs par défaut). Vérifié dans l'appli (`simple.drawio` en Automatique) : sous-section affichée ;
  « Contourner » décoché puis Ligne 1 déplacée = flèches droites à travers Service B (tracé de draw.io) ; recoché =
  elles le contournent de nouveau ; `make check` vert.
