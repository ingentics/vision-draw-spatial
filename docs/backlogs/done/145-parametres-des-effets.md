# Paramètres des effets, réglages de la forêt

> Itération — effets de page (Forêt) et paramètres ; reprise de 143 et 144

- Un effet déclare ses réglages globaux (`PageEffectDefinition.settings` : clé, libellé, bornes, pas, défaut,
  unité) ; ils sont gardés dans les paramètres de l'appli (`settings.effects.<id>.<clé>`, seulement les valeurs
  changées) et affichés par des curseurs génériques dans une section « Effets » des paramètres, une sous-section par
  effet. Retirer un effet retire ses réglages sans toucher aux paramètres.
- Forêt : taille des arbres (hauteur maximale, défaut 30 px), espacement (pas de la grille, 28 px), densité (60 %),
  étendue autour du schéma (rayon, porté de 560 à 1 200 px ; elle s'éclaircit à partir de 45 %), écart au schéma
  (8 px).
- Couleurs plus claires : feuillage #3d7a3c (au lieu de #24502a), tronc #8c5e36 (au lieu de #6b4426).
- **Fini quand :** les curseurs de « Paramètres › Effets › Forêt » changent la forêt en direct en iso / 3D ; la
  forêt par défaut s'étend plus loin ; `make check` vert.
- Fait : `EffectSetting` et `PageEffectRegistry.values` (bornes, défauts) dans `effects/` ; `settings.effects`
  (`EffectSettings`, fusion par effet dans `mergeSettings`) ; le moteur reconstruit les scènes quand ils changent ;
  section « Effets » générique dans `SettingsPanel.tsx`. Forêt : cinq réglages déclarés dans `effects/forest/index.ts`,
  couleurs dans `trees.ts`. Vérifié à l'œil : forêt plus étendue et plus claire en iso, curseurs affichés dans
  Paramètres › Effets › Forêt.
