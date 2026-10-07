# Registres de plugins injectables de bout en bout

> Architecture du moteur — étanchéité des plugins. Dépend de 286 (palette construite par la racine de composition).

- Aujourd'hui, `EngineOptions` accepte `registry`, `modes` et `effects`, mais l'appli lit les registres par défaut en
  dur :
  - `ContextPanel.tsx`, `SettingsPanel.tsx` et `plugins/modes/ModeFields.tsx` utilisent `defaultModeRegistry`,
    `defaultEffectRegistry` et `defaultShapeRegistry` ;
  - `Viewer.tsx`, lui, passe par `engine.getModeRegistry()` ;
  - la palette (`SHAPE_TEMPLATES`) vient du registre de formes par défaut.

  Un moteur construit avec d'autres registres aurait une UI qui ne les suit pas.
- L'appli obtient les trois registres du moteur (`getModeRegistry`, plus `getEffectRegistry` et `getShapeRegistry`) et
  ne les importe plus. La seule exception est `settingsStore.ts` (migration des anciennes clés), qui tourne avant la
  création du moteur et garde le registre par défaut ; le « Fait : » le signale.
- La palette et sa recherche (`searchTemplates`, `usedTemplates`) viennent du registre de formes du moteur.
- Règle de mode sortie de l'UI : `ContextPanel.tsx` (`managedEdge`) appelle `engine.managesEdge(edgeId)` au lieu de
  recalculer `modeOf(page)?.managesEdge`.
- `src/index.ts` (API de la bibliothèque) garde ses exports.
- **Fini quand :**
  - plus aucun `default*Registry` dans `src/app/` hors `settingsStore.ts` ;
  - test : un moteur créé avec un registre de modes réduit à un mode de test ne propose que lui dans le choix du mode ;
  - l'appli fonctionne comme avant (palette, panneau d'une relation RDD, paramètres des modes et effets) ;
  - `make check` vert.
