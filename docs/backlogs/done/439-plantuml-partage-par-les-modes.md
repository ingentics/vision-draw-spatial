# PlantUML partagé par les modes : fenêtre d'export, rendu, réglages et échappement

> Architecture — mise en commun ; reprise de 90, 96, 100 et 306 ; préalable à 436 (export de la machine à états)

Aujourd'hui tout ce qui sert à PlantUML est dans le mode Séquences. Le mode Machine à états en a besoin aussi ; les
parties d'un mode ne s'importent pas entre elles (lint, sujets 281, 287). Sans changement de comportement pour
Séquences.

- **Appli** — nouveau dossier `src/app/export/` (partagé, hors de `plugins/modes/` : la partie appli d'un mode
  peut l'importer) :
  - `plantumlServer.ts` déplacé tel quel depuis `src/app/plugins/modes/sequences/` (encodage, adresses de rendu) ;
  - `ExportDialog.tsx` : fenêtre d'export générique tirée de `ExportViewer.tsx` (titre, texte source copiable,
    rendu SVG ou message d'échec, lien vers l'éditeur en ligne, Échap / croix), avec un emplacement pour des choix
    propres au mode au-dessus du texte ;
  - `ExportViewer.tsx` de Séquences devient une enveloppe : choix du flux (ou toute la page) passé à la fenêtre
    générique ; styles `.export-dialog` inchangés.
- **Réglages du moteur de rendu** : aujourd'hui réglages globaux du mode Séquences (`plantumlRenderer`,
  `plantumlUrl`, Paramètres › Modes). Ils deviennent des **paramètres de l'appli** « Exporteurs › PlantUML »
  (moteur de rendu, URL du serveur local, mêmes choix, défauts et validation), lus par tout mode qui exporte en
  PlantUML ; les valeurs déjà enregistrées pour le mode Séquences sont reprises à la lecture (`legacy`). Choix
  motivé : un seul réglage pour tous les modes plutôt qu'un par mode (306 laissait les deux possibles).
- **Moteur** — les aides de texte communes (`quote` : nom entre guillemets, guillemet remplacé par une apostrophe ;
  `oneLine` : retours à la ligne en `\n`) sortent de `plugins/modes/sequences/export/plantuml.ts` vers une brique
  du tronc (ex. `src/engine/core/export/plantuml.ts`, sans notion de mode) réexportée par `core/plugins` ; Séquences
  les importe de là. Le texte de chaque diagramme reste dans son mode.
- **Tests** : `tests/app/plantumlServer.test.ts` suit le fichier ; tests des aides d'échappement ; reprise des
  valeurs enregistrées ; tests de l'export Séquences inchangés.
- **Docs** : `docs/SUMMARY.md` (table des dossiers : `src/app/export/`, brique `core/export/`), SPEC (paramètres
  Exporteurs, export des flux).
- **Fini quand :** sur `sequences.drawio`, le bouton « Exporter en PlantUML » ouvre la même fenêtre qu'avant (choix
  du flux, texte, rendu) ; le moteur de rendu se règle dans Paramètres › Exporteurs › PlantUML et un réglage déjà
  enregistré est repris ; plus aucun fichier PlantUML dans `src/app/plugins/modes/sequences/` hors de l'enveloppe ;
  `make check` vert.
- Fait :
  - Appli : `src/app/export/plantumlServer.ts` (déplacé, reçoit `ExporterSettings['plantuml']`) et
    `src/app/export/ExportDialog.tsx` (fenêtre générique : format, texte, rendu connu par format, choix du mode en
    `children`). `ExportViewer.tsx` de Séquences n'est plus qu'une enveloppe (choix du flux). `ModePanelProps` gagne
    `exporters` (passé par `ContextPanelProps.exporters`, `ViewerContextPanel`).
  - Paramètres : section `exporters.plantuml` (`renderer`, `localUrl`) remise dans les paramètres
    (`core/settings/types.ts`, `schema/workspace.ts`, lecture `serverUrl`) ; section « Exporteurs › PlantUML »
    (`src/app/settings/ExportSettings.tsx`). Les réglages `plantumlRenderer` / `plantumlUrl` quittent le mode Séquences ;
    les valeurs enregistrées sont reprises et retirées du mode à la lecture (`withLegacyExporters`,
    `src/app/settingsStore.ts`). Choix motivé (validé avec l'utilisateur) : un seul réglage pour tous les modes qui
    exportent en PlantUML, ce qui revient sur le choix du sujet 306 (la section ne nomme aucun mode).
  - Moteur : `core/export/plantumlText.ts` (`plantUmlLine`, `plantUmlQuoted`), réexportés par `core/plugins` ;
    l'export Séquences les utilise. Au passage, la validation d'adresse http(s) devient une brique (`httpUrl`,
    `core/fields/fieldSchema.ts`) partagée par les réglages déclarés `url` et `serverUrl`.
  - Écart de comportement : le moteur de rendu se règle dans Paramètres › Exporteurs › PlantUML au lieu de
    Paramètres › Modes › Séquences › Export PlantUML ; la fenêtre ne relance plus le rendu à chaque rendu du panneau
    (les réglages ne sont plus un objet recréé à chaque fois).
  - Tests : `tests/app/export/plantumlServer.test.ts` (déplacé), `tests/engine/core/export/plantumlText.test.ts`,
    reprise des valeurs enregistrées (`tests/app/settingsStore.test.ts`) ; tests de l'export Séquences inchangés.
  - Docs : SUMMARY (dossiers), SPEC (§13 `exporters`, export PlantUML du mode Séquences), `AJOUTER_UN_MODE.md`.
  - Vérifié dans l'appli (navigateur intégré, serveur 5173, `sequences.drawio`) : « Exporter en PlantUML » ouvre la
    fenêtre (texte, rendu kroki.io, lien plantuml.com) ; choisir « Paiement « carte » » change texte et image ;
    Paramètres › Exporteurs › PlantUML présent, plus de groupe PlantUML dans Modes › Séquences ; plantuml.com choisi →
    image servie par plantuml.com ; remis à kroki.io. Reprise d'un réglage déjà enregistré : tests seulement.
