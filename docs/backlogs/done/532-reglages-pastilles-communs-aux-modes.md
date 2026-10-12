# Réglages des pastilles communs aux modes

Les réglages des pastilles et de l'estompage (`badgeStyle`, `currentLook`, une dizaine de `PluginSetting`) sont
recopiés de `plugins/modes/sequences/settings.ts` dans `plugins/modes/storytelling/settings.ts` (sujet 474, qui
interdisait de toucher au tronc) : en faire une brique de l'API des plugins partagée par les deux modes.

- Fait (audit 542) : brique `core/settings/edgeBadgeSettings.ts` de l'API des plugins, `edgeBadgeSettings({ groupHint,
  labelFaceCamera })` (les neuf réglages des pastilles, seuls ces deux textes changent d'un mode à l'autre) et
  `edgeBadgeStyle(values)` ; Séquences et Story telling la reprennent, leurs copies retirées. `dimOpacity` et
  `currentLook` restent dans chaque mode (textes et réglages différents). Écart de comportement : aucun (réglages et
  apparence comparés avant / après par un test jetable). Test : `core/settings/edgeBadgeSettings.test.ts` (défauts =
  `DEFAULT_EDGE_BADGE`). Doc : `AJOUTER_UN_MODE.md`. Vérifié par `make check`.
