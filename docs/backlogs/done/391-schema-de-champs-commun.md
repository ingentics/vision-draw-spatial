# Un schéma de champs commun aux formes, modes et paramètres

> Architecture du moteur — extensibilité ; audit du 2026-10-08 (`AUDIT.md`). Taille L.

- Constat : trois schémas déclarés, chacun avec ses types et son composant : `ShapeProperty` (`core/shapes/types.ts`,
  `src/app/ShapeProperties.tsx`), `ModeProperty` (`core/modes/modeProperty.ts`,
  `src/app/plugins/modes/ModeFields.tsx`), `PluginSetting` (`core/settings/pluginSettings.ts`, `PluginSettingFields`
  de `src/app/SettingsPanel.tsx`). Une forme qui veut un choix doit faire évoluer contrat et appli ; le même concept
  porte deux noms (`select` des modes, `choice` des paramètres).
- **Descripteur commun** `Field` dans `src/engine/core/fields/fieldSchema.ts` (nouveau dossier du tronc, réexporté par
  l'API des plugins) : `key`, `label`, `title` (aide au survol), et selon `type` :
  - `toggle` ;
  - `number` : `placeholder`, bornes facultatives `min` / `max` / `step`, affichage `unit` (`px`, `ms`, `%`) et
    `zero` (libellé de 0) ;
  - `text` : `placeholder`, `multiline`, `monospace`, `live` ;
  - `choice` : `options` (`FieldOption` : `value`, `label`, `title`, `color`, `icon`) ;
  - `color`, `url`, `button`.
  Le discriminant reste `type` (déjà commun aux trois). `FieldOption` remplace `ModeOption`.
- **Lecture commune** : `readFieldValue(field, value)` (même fichier) vérifie une valeur typée selon le champ (nombre
  fini ramené dans ses bornes déclarées, booléen, texte, couleur #rrggbb, valeur parmi les choix, adresse http(s) sans
  barre finale) ; `readPluginSetting` disparaît à son profit (mêmes résultats). `choiceDisplay(options)` dit si un
  choix s'affiche en boutons (toutes les options dessinées : icône ou couleur) ou en liste (règle du sujet 319,
  aujourd'hui dans `ModeFields.tsx`).
- **Chaque famille n'ajoute que ce qui diffère** :
  - `ShapeProperty` = champ `toggle` (+ `checkedByDefault`), `number`, `text` ou `choice`, + `section` ; cible : clé
    de style ou attribut `spatial.…` de la forme. Un texte est réglé en direct s'il déclare `live` (aujourd'hui : s'il
    est un attribut spatial ; les deux déclarés sont `live` et spatiaux).
  - `ModeProperty` = champ `toggle`, `number`, `text`, `choice` ou `button`, dont `options` est une fonction
    `(page, palette)`, + `part`, `anyPart`, `value`, `write`, `hidden`, `readOnly`, `section` ; cible : attribut du
    mode ou opération.
  - `PluginSetting` = champ `number` (bornes obligatoires), `toggle`, `color`, `choice` ou `url` (+ `when`), +
    `default`, `hint`, `group`, `groupHint`, `legacy` ; cible : valeur des paramètres (`settings.modes`, `effects`,
    `shapeCategories`).
- **Renommage** : `type: 'select'` des modes devient `choice` (rdd `fieldProperties.ts`, sequences `index.ts`, moteur
  `modePanel.ts`, tests). Les types de champ ne sont pas enregistrés ; aucune clé ni valeur de paramètre ne change.
- **Un seul composant de champ** `DeclaredField` (`src/app/DeclaredField.tsx`) rendu par les trois endroits, qui
  gardent leur mise en page autour (sections, groupes et aides des paramètres, filtrage par section ou partie) :
  valeur typée en entrée (booléen, nombre, texte), `onChange` en sortie, `layout` `panel` (panneau contextuel) ou
  `settings` (sous-page des paramètres) pour les deux présentations qui existent déjà : case, nombre (curseur si
  bornes, sinon champ numérique), texte (en direct ou non, une étape d'annulation par passage), choix (boutons
  dessinés, liste ou boutons nommés), couleur, adresse, bouton. `Toggle`, `UrlField` et `Choice` quittent
  `SettingsPanel.tsx` pour `SettingsFields.tsx` (réutilisés par les autres réglages du panneau).
- Rendu inchangé (mêmes libellés, contrôles, ordre, infobulles), sauf écarts annoncés dans le « Fait ».
- Guides : le schéma commun décrit une fois (`AJOUTER_UN_MODE.md` section 3), `AJOUTER_UNE_FORME.md` y renvoie ;
  `SUMMARY.md` §3 cite `core/fields/`.
- **Fini quand :** les trois familles étendent `Field`, les déclarations des plugins (formes, rdd, sequences, forêt)
  compilent sans `select`, `readFieldValue` est testé (`tests/engine/core/fields/fieldSchema.test.ts`), les tests
  existants passent (imports et `select` → `choice` seulement), `make check` sort à 0 ; à l'œil : panneau d'une forme
  (coins arrondis d'un rectangle, nœuds et étiquette d'un cache distribué, mot d'un process étiqueté, pancarte d'un
  acteur), d'une table et d'un champ RDD (cases, textes, type, couleur en pastilles, bouton séparateur), d'une flèche
  Séquences (flux, rang), et Paramètres › Formes / Modes / Effets (curseurs, cases, couleurs, choix et adresse de
  l'export PlantUML) identiques.
- Fait : descripteur commun `Field` (`FieldOf<Options>`, `FieldOfType`, `FieldOption`, `FieldValue`), lecture
  `readFieldValue` et présentation `choiceDisplay` dans `src/engine/core/fields/fieldSchema.ts` ; `ShapeProperty`
  (`core/shapes/types.ts`), `ModeProperty` (`core/modes/modeProperty.ts`, choix `ModeOptions`) et `PluginSetting`
  (`core/settings/pluginSettings.ts`) l'étendent ; `readPluginSetting` remplacé par `readFieldValue` (même code, aussi
  pour `legacyPluginSettings`), `ModeOption` par `FieldOption` (`core/domains/types.ts`, `src/engine/index.ts`, qui
  exporte aussi `Field`, `FieldValue`, `choiceDisplay`). `select` → `choice` : `modePanel.ts`, rdd
  `editing/fieldProperties.ts`, sequences `index.ts`. Appli : composant unique `src/app/DeclaredField.tsx` (présentations
  `panel` et `settings`), appelé par `ShapeProperties.tsx`, `plugins/modes/ModeFields.tsx` et `PluginSettingFields`
  (`SettingsPanel.tsx`), qui ne font plus que convertir la valeur de leur cible ; `Toggle`, `UrlField`, `Choice`
  déplacés de `SettingsPanel.tsx` vers `SettingsFields.tsx`. Guides : schéma décrit une fois (`AJOUTER_UN_MODE.md`
  section 3, table des types), `AJOUTER_UNE_FORME.md` y renvoie, `SUMMARY.md` §3 cite `core/fields/`. Écarts : une
  case d'une forme (« Coins arrondis », « Pancarte ») a désormais au survol l'infobulle native de son nom, comme les
  cases des modes et les autres champs du panneau ; un texte de forme est en direct parce qu'il déclare `live` (avant :
  parce que sa clé est `spatial.…` ; les deux textes déclarés sont les deux) et il est recréé après validation, comme
  ceux des modes ; le numéro de passage d'un texte en direct de mode est unique pour la session, comme celui des
  formes (avant : recommencé à 0 au remontage du champ, un nouveau passage après resélection pouvait fusionner avec
  l'étape d'annulation précédente). Possibles sans nouveau code : un choix de forme, un nombre borné en curseur dans le
  panneau, un choix dessiné dans les paramètres. Validation par les tests seulement :
  `tests/engine/core/fields/fieldSchema.test.ts` (nouveau) ; tests existants intacts sauf `select` → `choice`
  (`pageModes`, `fieldHandles`, `sequences`, `sequencesExport`) ; `make check` à 0 (154 fichiers, 2334 tests). À
  vérifier à l'œil (pas fait) : panneau d'un rectangle (Coins arrondis), d'un cache distribué (Nœuds, Étiquette en
  direct), d'un process étiqueté (mot), d'un acteur (Pancarte) ; d'une table et d'un champ RDD (cases, textes, type en
  liste, couleur en pastilles, bouton séparateur, clé primaire en lecture seule) ; d'une flèche Séquences (flux, rang) ;
  Paramètres › Formes (Architecture), Modes (RDD, Séquences : curseurs, cases, couleurs, choix et adresse de l'export
  PlantUML grisée selon le rendu) et Effets (Forêt). Dette notée : 404 (aide au survol des réglages de plugin jamais
  montrée).
