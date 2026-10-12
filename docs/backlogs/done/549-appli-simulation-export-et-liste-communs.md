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
- Fait :
  - `src/app/plugins/modes/simulationHook.ts` : `useOpenedSimulator(controls, isMine)`, repris par
    `useOpenedSimulation` (états) et `useStorySimulation` (histoires).
  - `src/app/plugins/modes/ModeExport.tsx` : `ModeExportButton` (bouton « Exporter en … » et fenêtre d'export
    commune), repris par Event storming, Machine à états et Story telling ; leurs composants d'export retirés.
  - `src/app/plugins/modes/ArrowCount.tsx` : nombre de flèches d'une ligne (flux, histoire). `StoryRow` et `FlowRow`
    restent séparés : titre modifiable et retrait pour l'un, choix, ordre et retrait pour l'autre.
  - Ligne d'histoire : `role="button"`, atteignable par Tab, choisie par Entrée ou Espace (touches de ses boutons
    laissées à eux).
  - Écart de comportement : une histoire se choisit au clavier.
  - Vérifié dans l'appli (`storytelling.drawio`) : histoire 3 choisie par Entrée (courante, les autres estompées),
    export JSON ouvert et fermé par Échap. Machine à états et Event storming : même composant, vérifiés seulement par
    `make check`.
