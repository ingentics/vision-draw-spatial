# Un schéma de champs commun aux formes, modes et paramètres

> Architecture du moteur — extensibilité ; audit du 2026-10-08 (`AUDIT.md`). Taille L.

- Trois schémas déclarés, chacun avec ses types et son composant : `ShapeProperty` (`core/shapes/types.ts:121-153`,
  `src/app/ShapeProperties.tsx`), `ModeProperty` (`core/modes/types.ts:414-463`, `src/app/plugins/modes/ModeFields.tsx`),
  `PluginSetting` (`core/settings/pluginSettings.ts:8-46`, `SettingsPanel.tsx:1795-1830`). Une forme qui veut un
  choix doit faire évoluer contrat et appli. Piste : un descripteur commun étendu par famille, un seul composant de
  champ.
