# Découpage des paramètres

> Refactorisation — moteur (`src/engine/settings.ts`, ≈ 920 lignes) ; suite de 162

- `settings.ts` tient les types, les valeurs par défaut, les bornes et `mergeSettings`, une seule fonction de
  ≈ 290 lignes.
- Il devient un dossier `engine/settings/` dont `index.ts` est la façade (mêmes exports) : types, valeurs par
  défaut, bornes, validateurs, fusion par section.
- Aucun changement de comportement : mêmes valeurs acceptées, bornées ou rejetées.
- **Fini quand :** plus aucun fichier du dossier au-delà de ≈ 350 lignes ; `tests/engine/settings.test.ts` passe
  sans modification ; le panneau des paramètres fonctionne comme avant ; `make check` vert.
- Fait : `settings.ts` (40 lignes) ne garde que la façade du dossier `settings/` : `types.ts`, `defaults.ts`,
  `limits.ts`, `validate.ts` (nombres bornés, booléens, listes, couleurs, styles, URL de serveur), `derived.ts`
  (`resolveReducedMotion`, `modePalette`) et `merge/` : `mergeSettings` (`merge/index.ts`, 34 lignes) assemble une
  fonction par section, rangées par domaine (`navigation.ts`, `view.ts`, `shapes.ts`, `workspace.ts`) avec les
  listes de valeurs qu'elles acceptent. Corps des sections repris tels quels, le typage vérifiant que chacune rend
  tous ses champs ; le plus gros fichier (`types.ts`) fait 338 lignes. `tests/engine/settings.test.ts` inchangé et
  vert ; panneau des paramètres vérifié dans l'appli. SPEC §4.2 et §13 à jour.
