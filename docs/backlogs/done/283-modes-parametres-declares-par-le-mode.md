# Modes : paramètres déclarés par le mode

> Itération — modes de page et paramètres (moteur, panneau Paramètres) ; reprise de 69, 145, 241

- Aujourd'hui les paramètres utilisés par les modes sont déclarés dans `engine/settings/` (section `shapes`) et lus
  par le cœur, le rendu et l'appli : `modeObstacleGap` (RDD), `modeDimOpacity`, `modeBarSlideDuration`,
  `edgeBadge*` (11 réglages) et `edgeDressingDarken` (Séquences). Un mode ne possède pas ses réglages.
- **Le mode déclare ses réglages**, comme un effet (sujet 145) : `settings: ModeSetting[]` dans sa définition (clé,
  libellé, aide, groupe ; nombre borné, case à cocher ou couleur, avec son défaut). Valeurs dans
  `settings.modes[id][clé]`, seulement celles changées ; le registre des modes les borne et complète par les défauts.
- **Le mode transmet les valeurs au moteur avec le mécanisme qu'il fournit** ; le moteur ne lit plus aucune clé de
  mode :
  - `obstacles(page, shape, values)` renvoie aussi l'écart (`gap`) ;
  - `dressing(page, values)` renvoie aussi l'apparence des pastilles et l'assombrissement du trait ;
  - `current.look(values)` donne l'opacité hors du courant et le glissement de la barre (dans `ModeIndicator`).
  Sans valeur, le moteur prend ses défauts (ceux d'aujourd'hui).
- **Rangement** : RDD déclare `obstacleGap` ; Séquences déclare l'opacité, le glissement de la barre, les pastilles et
  l'assombrissement. Les clés `shapes.mode*`, `shapes.edgeBadge*`, `shapes.edgeDressingDarken` disparaissent de
  `settings/`, de `RenderContext` et de la scène.
- **Migration** (paramètres enregistrés, version 5) : une valeur changée sous l'ancienne clé `shapes.*` est reprise
  sous `modes.<id>.<clé>` ; le réglage déclare son ancienne clé (`legacy`), l'appli ne cite aucun mode.
- **Panneau** : Paramètres → Modes, une sous-page par mode qui déclare des réglages (titre : `shortName`, sinon
  `name` ; RDD : « RDD »), générée depuis ses réglages (curseur, case, couleur ; groupes et aides), comme les effets.
  `SettingsPanel.tsx` ne connaît plus aucun réglage de mode.
- Valeurs par défaut, bornes, libellés inchangés (20 px ; 30 % ; 200 ms ; pastilles 12 / 15 / 5,5 / 7 px…).
- **Fini quand :** `src/engine/settings/` ne mentionne plus aucun réglage de mode ; RDD et Séquences déclarent les
  leurs dans `modes/<id>/` ; à l'œil dans l'appli, Paramètres → Modes montre « RDD » (écart) et « Séquences »
  (courant, pastilles, couleurs) et les changer agit toujours (écart des régions RDD, estompage hors du flux courant,
  taille des pastilles, assombrissement du trait) ; un ancien réglage enregistré est repris ; `make check` vert.
- Fait : `ModeSetting`, `ModeValues`, `ModeCurrentLook`, `shortName` dans `modes/types.ts` ; `PageDressing` gagne
  `edgeDarken` et `edgeBadgeStyle`, `ModeObstacles` gagne `gap`, `ModeIndicator` gagne `slideDuration`. Registre :
  `values`, `valuesOf`, `legacySettings`, `dressing(page, settings)`. Réglages dans `modes/rdd/settings.ts` (écart) et
  `modes/sequences/settings.ts` (14 réglages, libellés d'origine). Section `modes` des paramètres (`mergeModes`),
  clés retirées de `shapes`, de `RenderContext` et de la scène ; les scènes se reconstruisent quand `modes` change.
  Cœur : gesture / move / resize (écart), `pageModes` (opacité, glissement), rendu (`pageScene`, `decorations`).
  Appli : sous-pages générées (`ModeSettingFields`), barre (`SlidingModeBar` lit `slideDuration`), migration des
  paramètres en version 5. Docs : `AJOUTER_UN_MODE.md`, bloc des paramètres de `SPEC.md`. Tests : registre (bornes,
  types, anciennes clés, habillage), migration, pastilles par les réglages du mode. Vérifié dans l'appli sur
  `fixtures/flows.drawio` : rendu inchangé, sous-pages « RDD » et « Séquences », opacité 5 % et chiffre en gras
  appliqués à chaud, enregistrés sous `modes.sequences`. Écart des régions RDD et migration vérifiés par les tests.
