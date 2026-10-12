# Metamorph hors du tronc : contrat « forme générée par l'hôte »

> Audit 542 — tronc et appli (reprise de 538, 539)

- Constat : le tronc connaît la forme Metamorph par son nom : domaine `core/domains/edit/metamorphs.ts`,
  `core/edit/metamorph.ts`, clés `SPATIAL.metamorph*` (`core/spatial.ts:33-35`), événements `metamorphRequest` /
  `metamorphChange` (`core/domains/types.ts:132-137`), sept méthodes `*Metamorph*` (`Engine.ts:434-478`),
  `metamorphStateOf` réexporté aux plugins (`core/plugins/index.ts:144`), d'où une forme plugin qui lit sa règle dans
  le tronc. L'appli générique la nomme aussi (`context/ShapeSections.tsx:15,39`, `context/types.ts:141`,
  `ViewerContextPanel.tsx:100,143`).
- Ce qu'on veut (à préciser avant de commencer) : un contrat générique de forme dont le dessin est demandé à l'hôte
  (états brouillon / en cours / prête, demande, propositions, choix), déclaré par la forme ; le cycle reste dans un
  domaine du tronc sans nom de forme ; la règle d'état et les clés vont dans `plugins/shapes/general/metamorph/` ;
  l'appli rend la section depuis la déclaration.
- Écart de comportement : aucun. Changement d'API publique (`Engine`, événements) : `feat(engine)!`.
- Tests : `metamorphs.test.ts` repris sur le contrat ; un test qui vérifie que `core/` ne nomme plus `metamorph`.
- Docs : COMPOSANT, SPEC §8.3, `AJOUTER_UNE_FORME.md` (forme générée par l'hôte).
- **Fini quand :** `grep -rni metamorph src/engine/core src/app/context` ne trouve que des exemples en commentaire ;
  le cycle complet marche à l'œil ; `make check` vert.
- Fait :
  - Contrat générique `ShapeDefinition.generation` (`ShapeGeneration` : `title`, `stateKey`, `states` pour `draft` /
    `pending` / `ready`, `instructionsKey`) et règle pure `core/edit/generation.ts` (`generationStateOf`,
    `generationInstructionsOf`, types de la demande, des propositions et de la vue) ; `core/edit/metamorph.ts` retiré.
  - Domaine `core/domains/edit/generatedShapes.ts` (`GeneratedShapes`, ex-`Metamorphs`) : trouve la génération par la
    définition de la forme ; la demande porte le `kind` de la forme. Étapes d'annulation nommées d'après le titre
    (« Metamorph validée »… inchangées).
  - Clés `SPATIAL.metamorph*` retirées du tronc : la forme Metamorph déclare `spatial.metamorph` (valeurs `draft`,
    `morphing`, `ready`, fichiers inchangés) et `spatial.metamorphInstructions`, et lit son état par
    `generationStateOf` (API des plugins, à la place de `metamorphStateOf`).
  - API publique : événements `generationRequest` / `generationChange` ; `Engine.generationOf`,
    `setGenerationInstructions`, `submitGeneration`, `generationResults`, `generationFailed`, `retryGeneration`,
    `repromptGeneration`, `acceptGeneration` ; types `Generation*` (à la place des `Metamorph*`).
  - Appli : `context/GenerationSection.tsx` (titre de la section lu de la vue), contrôles `generation` du panneau,
    classes CSS `generation-*` ; l'hôte des Metamorph (`src/app/metamorph/`) ne répond qu'aux demandes de `kind`
    `metamorph` et expose `acceptGenerated`.
  - Écart de comportement : le message d'attente du panneau devient « Génération des propositions en cours… » (il
    disait « Morphing… ») ; l'infobulle des instructions ne cite plus la clé du fichier.
  - Tests : `generatedShapes.test.ts` (ex-`metamorphs.test.ts`, titre et `kind` en plus, état `pending`),
    `metamorphHost.test.ts` (demande d'une autre forme ignorée), `boundaries.test.ts` (aucune ligne de code de `core/`
    ne nomme la Metamorph).
  - Docs : COMPOSANT (formes générées), SPEC §8.3, SUMMARY, `AJOUTER_UNE_FORME.md` (champ `generation`).
  - Vérifié dans l'appli (`metamorph.drawio`) : section « Metamorph », Valider → génération en cours → proposition,
    choix → forme remplacée, puis annulé ; halo arc-en-ciel d'une Metamorph prête.
