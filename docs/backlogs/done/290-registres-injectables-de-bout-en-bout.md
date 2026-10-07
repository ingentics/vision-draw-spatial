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
- Fait :
  - Façade : `getEffectRegistry`, `getShapeRegistry`, `paletteFor(page)` (palette d'après le mode et les formes du
    moteur), `usedTemplates(page)` et `managesEdge(edgeId)`. Le point d'entrée exporte les types `ShapeRegistry`,
    `PageModeRegistry` et `PageEffectRegistry`.
  - Appli :
    - nouveau `src/app/pluginsContext.tsx` : `PluginsContext`, rempli par `Viewer` avec les registres du moteur
      affiché et `managesEdge` ;
    - `usePlugins()` (optionnel) sert les Paramètres ; `useEnginePlugins()` sert les panneaux qui n'existent qu'avec
      un document (`ContextPanel`, `ModeFields`, `ShapeProperties`) ;
    - la palette et la catégorie « Utilisées » viennent du moteur (`engine.paletteFor`, `engine.usedTemplates`), le
      glisser-déposer trouve son modèle dans le registre du moteur (`templateById` de `Palette.tsx` supprimé), et la
      palette est vide tant que le moteur n'est pas créé ;
    - `managedEdge` (règle du mode recalculée dans l'UI) est supprimé, remplacé par `managesEdge`.

    Seul `settingsStore.ts` garde `defaultModeRegistry` (reprise des anciennes clés, avant la création du moteur).
  - Défaut évité : la palette filtrait les formes « Utilisées » par identité d'objet, alors que `ShapeRegistry.templates()`
    crée de nouveaux objets à chaque appel. La catégorie était vide après le changement ; elle compare maintenant par
    id. Repéré à l'œil, aucun test ne le voyait.
  - Écart au « Fini quand » : construire un moteur avec un registre réduit demande WebGL, que les tests n'ont pas. Il
    est remplacé par `tests/app/plugins.test.ts`, qui vérifie qu'aucun fichier de `src/app` n'utilise un registre ou
    les modèles par défaut, hors `settingsStore.ts`. L'injection elle-même n'est vérifiée qu'à la lecture du code.
  - `src/index.ts` (API de la bibliothèque) garde ses exports.
  - Validation :
    - `make check` vert (107 fichiers, 2038 tests) ;
    - dans l'appli (fixture des formes) : palette en trois catégories plus « Utilisées », choix du mode (Aucun, RDD,
      Séquences), section Effets avec la forêt, ajout d'une forme depuis la palette (une étape « Nouvelle forme »,
      annulée) ;
    - Paramètres › Modes montre les réglages RDD et Séquences, et Paramètres › Effets ceux de la forêt.
