# Plugins : modèle en lecture seule

> Architecture du moteur — étanchéité des plugins. Audit du 2026-10-07.

- Les plugins reçoivent le modèle vivant : `ModeEdit.page`, `dressing`, `parts.*`, `current.*`, `gestures.*`,
  `effect.volume(page)`, et les formes reçoivent `ShapeModel` et un `RenderContext` partagé par toute la scène.
  Aucun `Object.freeze` dans le moteur : un `page.shapes.push(…)` ou un changement de `attributes` modifie le
  document sans écriture dans le fichier ni annulation. Le cache `WeakMap<PageModel>` de
  `plugins/modes/sequences/steps.ts:21` suppose pourtant ce modèle immuable.
- Contrats (`core/modes/types.ts`, `core/effects/types.ts`, `core/shapes/types.ts`) typés en lecture seule
  (`DeepReadonly<PageModel>`…), réexportés par `core/plugins`.
- En dev et en test, la sortie de `documentFromTree` est gelée en profondeur ; une écriture d'un plugin lève alors
  une exception (protégée, signalée). En production, pas de gel (coût), seulement le typage.
- `RenderContext` : une copie gelée par forme, ou gelé une fois par scène.
- Définitions enregistrées gelées au `register` (une forme, un mode ou un effet ne modifie pas un autre plugin).
- **Fini quand :** test : un mode et une forme de test qui modifient le modèle reçu ; exception signalée, document
  inchangé ; `make check` vert (types compris) ; l'appli affiche comme avant une page RDD, une page Séquences et la
  forêt.
