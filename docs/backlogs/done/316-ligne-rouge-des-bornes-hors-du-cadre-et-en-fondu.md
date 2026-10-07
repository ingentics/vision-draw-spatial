# Ligne rouge des bornes hors du cadre de sélection, prolongée en fondu

> Itération — déplacement et redimensionnement bornés, reprise de 241

- La ligne rouge en pointillé d'une borne atteinte n'est plus dessinée sur le bord de la forme arrêtée (où le cadre de
  sélection la recouvre) : elle est décalée vers l'obstacle de **6 px à l'écran**, au-delà du cadre (écart de 3 px).
  L'arrêt à l'écart entre régions sœurs (20 px) ne change pas.
- Elle dépasse de **40 px** (de page) de plus à chaque bout et s'efface en fondu sur ses **10 derniers px**.
- **Fini quand :** une région tirée ou agrandie vers une sœur montre la ligne rouge à l'écart de son cadre de
  sélection, plus longue de 40 px de chaque côté, aux bouts fondus, sur la fixture `rdd-region-pointillee`.
- Fait : `shownLimit` (`core/edit/obstacles.ts`) écarte la limite du côté opposé à la forme arrêtée la plus proche et
  la prolonge ; `ConnectorPreview.showLimits(segments, stopped)` (`preview.ts`) la trace en tirets fondus aux bouts
  (`fadedStrokeMesh`), constantes `LIMIT_OFFSET` (6 px écran), `LIMIT_EXTENSION` (40 px), `LIMIT_FADE` (10 px) ;
  `move.ts` et `resize.ts` passent les emprises arrêtées. Bornes du geste inchangées. Tests `obstacles.test.ts`
  (côté, axe, prolongement). Vérifié dans l'appli sur `rdd-region-pointillee` (glisser simulé vers la voisine) ;
  le redimensionnement, même code, n'a été vu que par les tests.
