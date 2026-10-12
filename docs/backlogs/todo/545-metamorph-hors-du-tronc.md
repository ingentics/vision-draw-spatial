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
