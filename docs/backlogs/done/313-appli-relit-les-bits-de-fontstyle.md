# L'appli relit les bits de `fontStyle` à la main

> Dette relevée avec le sujet 307 — appli (édition du texte)

- `app/TextFormat.tsx` (état du panneau, bascule gras / italique / souligné / barré) et `app/LabelEditor.tsx` (style
  de la zone de saisie) décodent et recomposent les bits de `fontStyle` (1 gras, 2 italique, 4 souligné, 8 barré)
  au lieu d'utiliser `fontStyleBits` / `fontStyleValue` du moteur (`core/model/styleValues.ts`).
- Exporter ces deux fonctions par le point d'entrée du moteur (`src/engine/index.ts`) et les utiliser dans l'appli ;
  retirer `fontStyleValue(bits)` de `LabelEditor.tsx`, qui n'a plus d'appelant (homonyme de celle du moteur).
- **Fini quand :** plus de lecture de bits de `fontStyle` dans `src/app/` ; gras, italique, souligné et barré
  s'affichent et se basculent comme avant dans l'appli.
- Fait :
  - `fontStyleBits` et `fontStyleValue` exportés par `src/engine/index.ts`.
  - `app/TextFormat.tsx` : état du panneau par `fontStyleBits` ; bascule d'une marque par `fontStyleValue` (clé
    retirée à 0), table `BITS` locale retirée. Écart : la bascule ne garde plus d'éventuels bits au-delà de 8
    (draw.io n'en définit pas).
  - `app/LabelEditor.tsx` : gras, italique, souligné, barré de la zone de saisie par `fontStyleBits` ;
    `fontStyleValue(bits)`, sans appelant, retirée.
  - Test : bascule de tout le texte (`tests/app/textFormat.test.ts`).
  - Vérifié dans l'appli : chargement de `fixtures/rdd.drawio` sans erreur ; bascule du panneau vérifiée par les
    tests seulement.
