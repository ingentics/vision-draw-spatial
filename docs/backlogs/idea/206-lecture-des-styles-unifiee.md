# Lecture des valeurs de style unifiée

> Idée — dette technique du moteur (mutualisation)

- `render/styleValues.ts` (`styleNumber`, `styleFlag`, `styleColor`…) sert au-delà du rendu, mais une quinzaine de
  `parseFloat(style.x ?? '')` et une cinquantaine de `=== '1'` le contournent (format, edit, core, shapes, modes).
- Le déplacer vers le modèle (ou `format/style.ts`) et l'utiliser partout.
