# Appels de l'appli aux modes non protégés

Les champs génériques du panneau (`src/app/plugins/modes/ModeFields.tsx` : `value`, `options`, `hidden`, `readOnly` d'un
`ModeProperty`) appellent le mode directement, hors de la protection du moteur (sujet 288) : une exception d'un mode y
casse le panneau React. Les faire passer par le moteur, ou les protéger côté appli.

Fait :
- Le moteur évalue les réglages déclarés pour le panneau : `PageModes.propertyViews` et la façade
  `engine.modePropertyViews(page, scope, target, part, palette)` renvoient des `ModePropertyView` (réglage, valeur,
  lecture seule, choix), sans les réglages masqués.
- Chaque appel au mode (`hidden`, `value`, `readOnly`, `options`) est protégé (sujet 288). Un point d'entrée en panne
  est traité comme absent : réglage montré, valeur de l'attribut, modifiable, sans choix. L'erreur est signalée une
  fois dans les Diagnostics (« Mode <id> : erreur dans réglage « <clé> » : <point d'entrée> »).
- Appli : `ModeFields.tsx` et `ContextPanel.tsx` (sections de la page et d'un élément) affichent ces vues et n'appellent
  plus le mode ; `AppPlugins` gagne `modePropertyViews`. L'écriture passait déjà par le moteur (`setModeProperty`,
  protégé). Reste côté appli le composant React propre à un mode (`PageSection`), qui fait partie du mode.
- Tests : réglages en panne et réglages corrects dans `tests/engine/core/domains/modes/pageModes.test.ts` ;
  `tests/app/plugins.test.ts` vérifie que l'appli n'appelle plus `property.hidden / value / readOnly / options`.
- Validation :
  - `make check` vert (109 fichiers, 2046 tests) ;
  - dans l'appli : flèche de `sequences.drawio` (Flux avec ses quatre choix et leurs pastilles, Rang), table RDD
    (Table secondaire, Clé primaire, séparateur), champ d'une table (sections RDD, PostgreSQL, Gouvernance).
