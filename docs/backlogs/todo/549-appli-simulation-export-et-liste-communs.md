# Appli : simulation, export et ligne de liste communs aux modes

> Audit 542 — appli (reprise de 518, 534, 541)

- Constats :
  - `useStorySimulation` (`src/app/plugins/modes/storytelling/storyRun.ts:12-20`) copie `useOpenedSimulation`
    (`states/simulationRun.ts:20-28`).
  - Bouton + `useState` + `ExportDialog` recopiés : `eventstorming/index.tsx:33-40`, `storytelling/index.tsx`,
    `states/index.tsx:63-70`.
  - `StoryRow` (`storytelling/index.tsx:85`) proche de `FlowRow` (`sequences/index.tsx:84`) : pastille, compteur, ×.
    Son `<li onClick>` (l.104-108) n'a ni rôle ni `tabIndex`.
- Ce qu'on veut : un hook de simulation ouverte, un bouton d'export et une ligne de liste communs dans
  `src/app/plugins/modes/`, repris par les modes ; la ligne est un bouton atteignable au clavier.
- Écart de comportement : choisir une histoire au clavier devient possible.
- **Fini quand :** export, simulation et listes inchangés à l'œil dans les trois modes ; `make check` vert.
