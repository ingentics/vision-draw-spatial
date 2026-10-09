# Appli : gros fichiers découpés, lectures de style et infobulles communes

> Itération — appli de démonstration (`src/app/`) ; dette vue à l'audit du 2026-10-08

- `SettingsPanel.tsx` (1737 lignes), `ContextPanel.tsx` (1111) et `Viewer.tsx` (1012) dépassent ~400 lignes : les
  découper par sujet, sans changement visible.
- Lectures de style à la main (`parseFloat`, `=== '1'`, `Number(style.x) ||`) : par `styleFlag` / `styleNumber`,
  exportés par l'entrée du moteur.
- `title` natifs (environ 80 dans `src/app/`, dont `PageTabs.tsx`, `Fields.tsx`) au lieu des infobulles de l'appli.
- **Fini quand :** aucun des trois fichiers ne dépasse ~400 lignes ; Paramètres, panneau contextuel et barre d'outils
  identiques à l'œil ; plus de `title` natif dans `src/app/` ; `make check` vert.
- Fait :
  - Paramètres : `src/app/SettingsPanel.tsx` (261 lignes) ne garde que la fenêtre, l'arbre et la recherche ; les
    sections sont des composants de `src/app/settings/` (`NavigationSettings`, `ViewSettings` avec caméra et fond,
    `SelectionSettings`, `LinkSettings`, `PanelSettings` (mini-carte, barres), `ShapeEdgeSettings`, `PluginSections`,
    `EditSettings` (édition, sauvegarde), `ShortcutSettings`, `AccessibilitySettings`), sur le modèle de
    `CommentSettingsSection` (props communes `SettingsSectionProps`, `settings/types.ts`) ; arbre et recherche dans
    `settings/settingsTree.tsx`, formats dans `settings/formats.ts`. `MULTI_SELECT_LABELS` vient de
    `settings/ShortcutSettings.tsx`. DOM des Paramètres comparé avant / après dans l'appli : identique.
  - Panneau contextuel : `src/app/ContextPanel.tsx` (57 lignes) choisit les sections, rangées dans `src/app/context/`
    (`PageSections`, `ModeSections`, `ShapeSections`, `EdgeSections`, `EdgeLineSections`, `MultiSections`, champs
    communs `contextFields`, props `types.ts`).
  - Visionneuse : `src/app/Viewer.tsx` (407 lignes) ; dans `src/app/viewer/` : `useFileSaving` (état de consultation,
    enregistrement, disque), `useEditShortcuts` (Ctrl+S / Z / Y / D, presse-papier), `useEngineEvents` (état suivi
    des événements du moteur), `useInPlaceText` + `ViewerLabelEditor` / `ViewerComment` (édition en place, panneau de
    format), `ViewerToolbar`, `ViewerContextPanel`.
  - Style : `styleFlag` / `styleNumber` exportés par `src/engine/index.ts` et utilisés dans `EdgeLineSections`,
    `EdgeSections`, `TextFormat`, `LabelEditor`, `BorderSection`. Écart : une taille ou une épaisseur écrite avec une
    unité (`fontSize=12px`) est lue 12 au lieu du défaut.
  - Infobulles : `TooltipLayer` (`src/app/Tooltip.tsx`, posée dans `App`) montre au survol l'attribut `data-tip` de
    l'élément le plus proche, même rendu et même placement que `useTooltip` (dans le dialogue modal ouvert, comme au
    sujet 404). Les `title` natifs des éléments de `src/app/` deviennent des `data-tip` (58), sauf celui d'une
    `<option>` (liste native, sans survol) ; les réglages de plugin (sujet 404) passent aussi par `data-tip`. Règle
    de `coding.md` §6 mise à jour. Écarts : infobulles de l'appli à la place de celles du navigateur, plus rapides ;
    `src/react/` (composants de la bibliothèque, sans la couche de l'appli) garde ses `title`.
  - `docs/SUMMARY.md` (« Où regarder ») cite les nouveaux dossiers.
  - Vérifié à l'œil : Paramètres (sections, recherche, infobulles), barre d'outils (infobulle d'Enregistrer, annuler),
    panneau d'une forme (styles avec infobulle, épaisseur), édition en place et gras depuis le panneau, puis
    annulation ; `make check` vert.
