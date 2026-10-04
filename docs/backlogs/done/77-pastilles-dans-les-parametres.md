# Pastilles de flèche et couleurs de flux dans les paramètres

> Itération — paramètres (Formes et flèches) et mode Séquences ; reprise de 70 à 76

- Réglages de la pastille d'une flèche (section « Formes et flèches », sous-section « Pastilles des flèches »),
  communs à tous les modes de page :
  - flèche avec texte : rayon (12), taille du chiffre (15) ;
  - flèche sans texte : rayon (5,5), taille du chiffre (7) ;
  - bordure : couleur (noir), épaisseur (1 px) ;
  - chiffre : couleur (noir), gras (non) ;
  - écart avec le texte de la flèche (2 px).
- Assombrissement du trait d'une flèche colorée par le mode (25 %) : réglage générique de la même sous-section (le
  mode donne la couleur de son flux, le rendu l'assombrit).
- Couleurs des nouveaux flux : les fonds des styles de forme **des paramètres** (styles de base puis palette
  étendue, à partir du 3ᵉ : ni le blanc ni le gris), passés aux opérations des modes (`ModeEdit.palette`).
- Changer un réglage redessine la page aussitôt. Les couleurs déjà enregistrées dans un fichier ne changent pas.
- **Fini quand :** chaque réglage modifié dans les paramètres change la pastille ou le trait à l'œil ; un style de
  forme modifié dans les paramètres donne sa couleur au flux suivant ; `make check` vert.
- Fait :
  - Paramètres (`engine/settings.ts`, section `shapes`) : `edgeBadgeRadius`, `edgeBadgeTextSize`,
    `edgeBadgeSmallRadius`, `edgeBadgeSmallTextSize`, `edgeBadgeBorderColor`, `edgeBadgeBorderWidth` (0 = aucune),
    `edgeBadgeTextColor`, `edgeBadgeBold`, `edgeBadgeGap`, `edgeDressingDarken`, avec bornes et validation ;
    `modePalette(styles)` (fonds des styles à partir du 3ᵉ).
  - Rendu : `RenderContext.edgeBadge` (`EdgeBadgeStyle`, défaut `DEFAULT_EDGE_BADGE`) et `dressingDarken`, remplis par
    le moteur ; `darken` (`render/decorations.ts`) appliqué dans `createEdgeObject` : le mode donne la couleur de son
    flux, plus `flowStrokeColor`. Un changement de la section redessine déjà les pages.
  - Modes : `ModeEdit.palette` (passée par `applyModeEdit` depuis le moteur), `nextFlowColor(flows, palette)` ;
    `FLOW_COLORS` reste le repli (styles par défaut).
  - Appli : sous-section « Pastilles des flèches » de « Formes et flèches » (`SettingsPanel.tsx`).
  - Tests (`sequences.test.ts`) : pastille et trait selon le contexte de rendu, couleur d'un nouveau flux prise dans la
    palette passée. Docs : SPEC §13 et §14.5, `AJOUTER_UN_MODE.md`.
  - Vérifié dans l'appli : la sous-section s'affiche, « Chiffre en gras » s'applique aussitôt (remis ensuite).
